import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerBusinessRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), async (_req, res) => {
        try {
            const profile = await db.businessProfile.findUnique({ where: { id: 'singleton' } });
            if (!profile) {
                return res.json({
                    success: true,
                    data: {
                        shopName: 'Smart Boutique System',
                        address: 'Kigali, Rwanda',
                        taxRate: 18,
                        currency: 'RWF'
                    }
                });
            }
            res.json({ success: true, data: profile });
        }
        catch (error) {
            // Return default if table doesn't exist
            res.json({
                success: true,
                data: {
                    shopName: 'Smart Boutique System',
                    address: 'Kigali, Rwanda',
                    taxRate: 18,
                    currency: 'RWF'
                }
            });
        }
    });
    router.put('/', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req, res) => {
        const { shopName, address, taxRate, currency } = req.body;
        try {
            const profile = await db.businessProfile.upsert({
                where: { id: 'singleton' },
                create: { shopName, address, taxRate: Number(taxRate), currency },
                update: { shopName, address, taxRate: Number(taxRate), currency }
            });
            res.json({ success: true, data: profile });
        }
        catch (error) {
            res.status(500).json({ success: false, message: 'Database error. Please ensure migrations are run.' });
        }
    });
    app.use('/api/business', router);
}
