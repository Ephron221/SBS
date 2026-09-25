import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerCustomerRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), async (req, res) => {
        const customers = await db.customer.findMany({
            orderBy: { name: 'asc' },
            include: { _count: { select: { sales: true } } }
        });
        res.json({ success: true, data: customers });
    });
    router.post('/', authenticate(_store), async (req, res) => {
        const { name, phone, email } = req.body;
        if (!name)
            return res.status(400).json({ message: 'Customer name is required.' });
        try {
            const customer = await db.customer.create({
                data: { name, phone, email }
            });
            res.status(201).json({ success: true, data: customer });
        }
        catch (err) {
            res.status(400).json({ message: 'Customer with this phone or email already exists.' });
        }
    });
    router.get('/:id', authenticate(_store), async (req, res) => {
        const id = String(req.params.id);
        const customer = await db.customer.findUnique({
            where: { id },
            include: { sales: { orderBy: { createdAt: 'desc' } } }
        });
        if (!customer)
            return res.status(404).json({ message: 'Customer not found.' });
        res.json({ success: true, data: customer });
    });
    app.use('/api/customers', router);
}
