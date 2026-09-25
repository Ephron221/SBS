import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerCustomerRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), async (_req, res) => {
        try {
            const customers = await db.customer.findMany({
                orderBy: { name: 'asc' },
                include: { _count: { select: { sales: true } } }
            });
            res.json({ success: true, data: customers });
        }
        catch (err) {
            console.error('[Customer fetch error]:', err);
            res.status(500).json({ success: false, message: 'Failed to fetch customers.' });
        }
    });
    router.post('/', authenticate(_store), async (req, res) => {
        const { name, phone, email } = req.body;
        if (!name || typeof name !== 'string' || !name.trim()) {
            return res.status(400).json({ success: false, message: 'Customer name is required.' });
        }
        const trimmedName = name.trim();
        const cleanedPhone = phone && typeof phone === 'string' && phone.trim() ? phone.trim() : null;
        const cleanedEmail = email && typeof email === 'string' && email.trim() ? email.trim() : null;
        try {
            // Check if existing customer matches phone
            if (cleanedPhone) {
                const existingByPhone = await db.customer.findUnique({
                    where: { phone: cleanedPhone }
                });
                if (existingByPhone) {
                    return res.status(200).json({
                        success: true,
                        data: existingByPhone,
                        isExisting: true,
                        message: `Customer "${existingByPhone.name}" (${existingByPhone.phone}) already exists and has been selected.`
                    });
                }
            }
            // Check if existing customer matches email
            if (cleanedEmail) {
                const existingByEmail = await db.customer.findUnique({
                    where: { email: cleanedEmail }
                });
                if (existingByEmail) {
                    return res.status(200).json({
                        success: true,
                        data: existingByEmail,
                        isExisting: true,
                        message: `Customer "${existingByEmail.name}" already exists and has been selected.`
                    });
                }
            }
            const customer = await db.customer.create({
                data: {
                    name: trimmedName,
                    phone: cleanedPhone,
                    email: cleanedEmail
                }
            });
            res.status(201).json({ success: true, data: customer });
        }
        catch (err) {
            console.error('[Customer Create Error]:', err);
            if (err.code === 'P2002') {
                const target = err.meta?.target?.join(', ') || 'phone or email';
                return res.status(400).json({ success: false, message: `A customer with this ${target} already exists.` });
            }
            res.status(500).json({ success: false, message: 'Failed to save customer.' });
        }
    });
    router.get('/:id', authenticate(_store), async (req, res) => {
        const id = String(req.params.id);
        try {
            const customer = await db.customer.findUnique({
                where: { id },
                include: { sales: { orderBy: { createdAt: 'desc' } } }
            });
            if (!customer)
                return res.status(404).json({ success: false, message: 'Customer not found.' });
            res.json({ success: true, data: customer });
        }
        catch (err) {
            res.status(500).json({ success: false, message: 'Failed to fetch customer details.' });
        }
    });
    app.use('/api/customers', router);
}
