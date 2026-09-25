import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerSalesRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), async (_req, res) => {
        const sales = await db.sale.findMany({
            include: {
                items: { include: { product: true } },
                seller: { select: { name: true } },
                customer: { select: { name: true, phone: true } },
            },
            orderBy: { createdAt: 'desc' },
            take: 50
        });
        res.json({ success: true, data: sales });
    });
    router.post('/', authenticate(_store), async (req, res) => {
        const { items, paymentMethod, customerName, customerId, discountAmount = 0, discountType = 'PERCENT', salesChannel = 'In-Store' } = req.body;
        if (!items?.length)
            return res.status(400).json({ success: false, message: 'Sale items are required.' });
        let subtotal = 0;
        const enriched = [];
        for (const item of items) {
            const product = await db.product.findUnique({ where: { id: item.productId } });
            if (!product || product.currentQuantity < item.quantity) {
                return res.status(400).json({ success: false, message: `Insufficient stock for ${product?.name ?? 'selected product'}.` });
            }
            const lineTotal = product.sellingPrice * item.quantity;
            subtotal += lineTotal;
            enriched.push({ productId: item.productId, quantity: item.quantity, unitPrice: product.sellingPrice, lineTotal });
        }
        // Final total calculation
        const totalAmount = Math.max(0, subtotal - discountAmount);
        const invoiceNumber = `INV-${Date.now()}`;
        const sale = await db.sale.create({
            data: {
                invoiceNumber,
                sellerId: req.user.id,
                customerId: customerId || undefined,
                customerName: customerName || 'Walk-in',
                totalAmount,
                discountAmount,
                discountType,
                salesChannel,
                paymentMethod: paymentMethod || 'Cash',
                items: { create: enriched },
            },
            include: { items: true },
        });
        for (const item of enriched) {
            const prev = await db.product.findUnique({ where: { id: item.productId } });
            await db.product.update({ where: { id: item.productId }, data: { currentQuantity: { decrement: item.quantity } } });
            await db.stockHistory.create({
                data: {
                    productId: item.productId,
                    previousQuantity: prev.currentQuantity,
                    delta: -item.quantity,
                    remainingQuantity: prev.currentQuantity - item.quantity,
                    reason: 'Sale',
                    userId: req.user.id
                }
            });
        }
        await db.auditLog.create({ data: { userId: req.user.id, action: 'Completed sale', target: sale.id, details: invoiceNumber } });
        await db.notification.create({ data: { title: 'Sale completed', message: `Invoice ${invoiceNumber} completed.`, type: 'sale', role: 'MANAGER' } });
        res.status(201).json({ success: true, sale, invoiceNumber });
    });
    router.delete('/:id', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const id = String(req.params.id);
        const sale = await db.sale.findUnique({ where: { id }, include: { items: true } });
        if (!sale)
            return res.status(404).json({ success: false, message: 'Sale not found.' });
        for (const item of sale.items) {
            const prev = await db.product.findUnique({ where: { id: item.productId } });
            if (prev) {
                await db.product.update({ where: { id: item.productId }, data: { currentQuantity: { increment: item.quantity } } });
                await db.stockHistory.create({
                    data: {
                        productId: item.productId,
                        previousQuantity: prev.currentQuantity,
                        delta: item.quantity,
                        remainingQuantity: prev.currentQuantity + item.quantity,
                        reason: 'Sale voided',
                        userId: req.user.id
                    }
                });
            }
        }
        await db.saleItem.deleteMany({ where: { saleId: sale.id } });
        await db.sale.delete({ where: { id: sale.id } });
        await db.auditLog.create({ data: { userId: req.user.id, action: 'Voided sale', target: sale.id, details: sale.invoiceNumber } });
        res.json({ success: true });
    });
    app.use('/api/sales', router);
}
