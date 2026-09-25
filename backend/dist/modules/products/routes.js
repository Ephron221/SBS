import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
import { UserRole } from '@prisma/client';
async function notifyStockLeaders(title, message) {
    await db.notification.createMany({
        data: [UserRole.SUPER_ADMIN, UserRole.MANAGER].map(role => ({ title, message, type: 'stock', role })),
    });
}
export function registerProductRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), async (req, res) => {
        try {
            const keyword = typeof req.query.search === 'string' ? req.query.search : undefined;
            const status = typeof req.query.status === 'string' ? req.query.status : undefined;
            const products = await db.product.findMany({
                where: {
                    AND: [
                        keyword ? {
                            OR: [
                                { name: { contains: keyword, mode: 'insensitive' } },
                                { category: { name: { contains: keyword, mode: 'insensitive' } } },
                                { sku: { contains: keyword, mode: 'insensitive' } }
                            ]
                        } : {},
                        status === 'out' ? { currentQuantity: 0 } : {},
                        status === 'active' ? { status: 'Active' } : {},
                    ],
                },
                include: { category: true },
                orderBy: { name: 'asc' },
                take: 100,
            });
            const result = status === 'low'
                ? products.filter(p => p.currentQuantity <= p.minimumStockLevel)
                : products;
            res.json({ success: true, data: result, total: result.length });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch products' });
        }
    });
    router.post('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { name, categoryId, description, buyingPrice, sellingPrice, currentQuantity, minimumStockLevel, unit, supplier, size, color, sku } = req.body;
        if (!name || !categoryId || !buyingPrice || !sellingPrice) {
            return res.status(400).json({ success: false, message: 'Name, category, and prices are required.' });
        }
        try {
            const product = await db.product.create({
                data: {
                    name,
                    categoryId,
                    description: description || '',
                    buyingPrice: Number(buyingPrice),
                    sellingPrice: Number(sellingPrice),
                    currentQuantity: Number(currentQuantity || 0),
                    minimumStockLevel: Number(minimumStockLevel || 5),
                    unit: unit || 'Piece',
                    supplier: supplier || 'General',
                    size,
                    color,
                    sku
                },
                include: { category: true },
            });
            await db.auditLog.create({ data: { userId: req.user.id, action: 'Created product', target: product.id, details: product.name } });
            if (product.currentQuantity <= product.minimumStockLevel) {
                await notifyStockLeaders('Low stock alert', `${product.name} is below its minimum stock level.`);
            }
            res.status(201).json({ success: true, product });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to create product' });
        }
    });
    router.put('/:id', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { name, categoryId, description, buyingPrice, sellingPrice, minimumStockLevel, unit, supplier, status, size, color, sku } = req.body;
        const id = String(req.params.id);
        try {
            const product = await db.product.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(categoryId && { categoryId }),
                    ...(description !== undefined && { description }),
                    ...(buyingPrice && { buyingPrice: Number(buyingPrice) }),
                    ...(sellingPrice && { sellingPrice: Number(sellingPrice) }),
                    ...(minimumStockLevel && { minimumStockLevel: Number(minimumStockLevel) }),
                    ...(unit && { unit }),
                    ...(supplier && { supplier }),
                    ...(status && { status }),
                    ...(size !== undefined && { size }),
                    ...(color !== undefined && { color }),
                    ...(sku !== undefined && { sku })
                },
                include: { category: true },
            }).catch(() => null);
            if (!product)
                return res.status(404).json({ success: false, message: 'Product not found.' });
            await db.auditLog.create({ data: { userId: req.user.id, action: 'Updated product', target: product.id, details: product.name } });
            res.json({ success: true, product });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to update product' });
        }
    });
    router.get('/:id/history', authenticate(_store), async (req, res) => {
        const id = String(req.params.id);
        try {
            const history = await db.stockHistory.findMany({
                where: { productId: id },
                include: { user: { select: { name: true } } },
                orderBy: { createdAt: 'desc' },
                take: 20
            });
            res.json({ success: true, data: history });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch stock history' });
        }
    });
    const stockRouter = Router();
    stockRouter.post('/adjust', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { productId, delta, reason } = req.body;
        const existing = await db.product.findUnique({ where: { id: productId } });
        if (!existing)
            return res.status(404).json({ success: false, message: 'Product not found.' });
        if (existing.currentQuantity + delta < 0)
            return res.status(400).json({ success: false, message: 'Stock cannot go negative.' });
        const product = await db.product.update({ where: { id: productId }, data: { currentQuantity: { increment: delta } } });
        await db.stockHistory.create({ data: { productId, previousQuantity: existing.currentQuantity, delta, remainingQuantity: product.currentQuantity, reason: reason || 'Stock adjustment', userId: req.user.id } });
        await db.auditLog.create({ data: { userId: req.user.id, action: 'Adjusted stock', target: product.id, details: `${delta > 0 ? 'Restocked' : 'Reduced'} by ${Math.abs(delta)}` } });
        if (existing.currentQuantity > existing.minimumStockLevel && product.currentQuantity <= product.minimumStockLevel) {
            await notifyStockLeaders('Low stock alert', `${product.name} now has ${product.currentQuantity} ${product.unit} remaining (minimum: ${product.minimumStockLevel}).`);
        }
        res.json({ success: true, product });
    });
    const categoryRouter = Router();
    categoryRouter.get('/', async (_req, res) => {
        try {
            const categories = await db.category.findMany({ orderBy: { name: 'asc' } });
            res.json({ success: true, data: categories });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Failed to fetch categories' });
        }
    });
    categoryRouter.post('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ success: false, message: 'Category name is required.' });
        try {
            const category = await db.category.create({ data: { name } });
            res.status(201).json({ success: true, data: category });
        }
        catch (e) {
            res.status(400).json({ success: false, message: 'Category already exists.' });
        }
    });
    const unitRouter = Router();
    unitRouter.get('/', async (_req, res) => {
        try {
            // Check if unit model exists (it might not if migrations didn't run)
            if (!db.unit) {
                return res.json({ success: true, data: [{ id: '1', name: 'Piece' }, { id: '2', name: 'Pack' }] });
            }
            const units = await db.unit.findMany({ orderBy: { name: 'asc' } });
            res.json({ success: true, data: units });
        }
        catch (error) {
            // Fallback for missing table
            res.json({ success: true, data: [{ id: '1', name: 'Piece' }, { id: '2', name: 'Pack' }] });
        }
    });
    unitRouter.post('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { name } = req.body;
        if (!name)
            return res.status(400).json({ success: false, message: 'Unit name is required.' });
        try {
            if (!db.unit)
                return res.status(400).json({ success: false, message: 'Units table not ready. Run migrations.' });
            const unit = await db.unit.create({ data: { name } });
            res.status(201).json({ success: true, data: unit });
        }
        catch (e) {
            res.status(400).json({ success: false, message: 'Unit already exists or failed to create.' });
        }
    });
    app.use('/api/products', router);
    app.use('/api/stock', stockRouter);
    app.use('/api/categories', categoryRouter);
    app.use('/api/units', unitRouter);
}
