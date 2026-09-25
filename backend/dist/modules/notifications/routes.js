import { Router } from 'express';
import { authenticate } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerNotificationRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), async (req, res) => {
        const notifications = await db.notification.findMany({ where: { role: req.user.role }, orderBy: { createdAt: 'desc' }, take: 30 });
        res.json({ success: true, data: notifications });
    });
    router.patch('/:id/read', authenticate(_store), async (req, res) => {
        const id = String(req.params.id);
        const notification = await db.notification.update({ where: { id }, data: { read: true } }).catch(() => null);
        if (!notification)
            return res.status(404).json({ message: 'Notification not found.' });
        res.json({ success: true, data: notification });
    });
    router.patch('/read-all', authenticate(_store), async (req, res) => {
        await db.notification.updateMany({ where: { role: req.user.role, read: false }, data: { read: true } });
        res.json({ success: true });
    });
    app.use('/api/notifications', router);
}
