import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerReportRoutes(app, _store) {
    const router = Router();
    router.get('/summary', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { from, to } = req.query;
        const dateFilter = from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {};
        const expenseDateFilter = from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {};
        const [products, sales, expenses] = await Promise.all([
            db.product.findMany({ include: { category: true } }),
            db.sale.findMany({
                where: dateFilter,
                include: {
                    items: { include: { product: true } },
                    seller: { select: { name: true } }
                },
                orderBy: { createdAt: 'desc' }
            }),
            db.expense.findMany({
                where: expenseDateFilter,
                orderBy: { date: 'desc' }
            }),
        ]);
        const revenue = sales.reduce((s, x) => s + x.totalAmount, 0);
        const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);
        const totalDiscounts = sales.reduce((s, x) => s + (x.discountAmount || 0), 0);
        // Breakdown by Sales Channel
        const channelMap = {};
        // Breakdown by Payment Method
        const methodMap = {};
        // Sales by product
        const productMap = {};
        for (const sale of sales) {
            // Channel
            const ch = sale.salesChannel || 'In-Store';
            if (!channelMap[ch])
                channelMap[ch] = { count: 0, total: 0 };
            channelMap[ch].count++;
            channelMap[ch].total += sale.totalAmount;
            // Method
            const meth = sale.paymentMethod || 'Cash';
            if (!methodMap[meth])
                methodMap[meth] = { count: 0, total: 0 };
            methodMap[meth].count++;
            methodMap[meth].total += sale.totalAmount;
            for (const item of sale.items) {
                if (!productMap[item.productId])
                    productMap[item.productId] = { name: item.product.name, qty: 0, revenue: 0 };
                productMap[item.productId].qty += item.quantity;
                productMap[item.productId].revenue += item.lineTotal;
            }
        }
        res.json({
            success: true,
            data: {
                totalProducts: products.length,
                totalStock: products.reduce((s, x) => s + x.currentQuantity, 0),
                lowStockCount: products.filter((p) => p.currentQuantity <= p.minimumStockLevel).length,
                totalSales: sales.length,
                revenue,
                expenseTotal,
                totalDiscounts,
                netProfit: revenue - expenseTotal,
                stockValue: products.reduce((s, x) => s + x.buyingPrice * x.currentQuantity, 0),
                sales,
                expenses,
                salesByChannel: Object.entries(channelMap).map(([name, data]) => ({ name, ...data })),
                salesByMethod: Object.entries(methodMap).map(([name, data]) => ({ name, ...data })),
                topProducts: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
                lowStockProducts: products.filter((p) => p.currentQuantity <= p.minimumStockLevel).map((p) => ({ name: p.name, currentQuantity: p.currentQuantity, minimumStockLevel: p.minimumStockLevel, unit: p.unit })),
            },
        });
    });
    app.use('/api/reports', router);
}
