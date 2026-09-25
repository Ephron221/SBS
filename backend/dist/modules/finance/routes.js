import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerFinanceRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (_req, res) => {
        const [sales, expenses, products] = await Promise.all([db.sale.findMany(), db.expense.findMany(), db.product.findMany()]);
        const revenue = sales.reduce((s, x) => s + x.totalAmount, 0);
        const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0);
        const stockValue = products.reduce((s, x) => s + x.buyingPrice * x.currentQuantity, 0);
        res.json({ success: true, data: { revenue, expenses: expenseTotal, netProfit: revenue - expenseTotal, stockValue } });
    });
    router.get('/expenses', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (_req, res) => {
        const expenses = await db.expense.findMany({ orderBy: { date: 'desc' }, include: { createdBy: { select: { name: true } } } });
        res.json({ success: true, data: expenses });
    });
    router.post('/expenses', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (req, res) => {
        const { category, amount, note, date } = req.body;
        if (!category || !amount)
            return res.status(400).json({ message: 'Category and amount are required.' });
        const expense = await db.expense.create({ data: { category, amount: Number(amount), note: note || '', date: date ? new Date(date) : new Date(), createdById: req.user.id } });
        res.status(201).json({ success: true, data: expense });
    });
    app.use('/api/finance', router);
}
