import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerAuditLogRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (_req, res) => {
        const logs = await db.auditLog.findMany({ include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
        res.json({ success: true, data: logs });
    });
    // Admin: delete a single audit log entry
    router.delete('/:id', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req, res) => {
        const id = String(req.params.id);
        const deleted = await db.auditLog.delete({ where: { id } }).catch(() => null);
        if (!deleted)
            return res.status(404).json({ message: 'Audit log entry not found.' });
        res.json({ success: true });
    });
    // Admin: clear ALL audit logs
    router.delete('/', authenticate(_store), restrictTo('SUPER_ADMIN'), async (_req, res) => {
        await db.auditLog.deleteMany({});
        res.json({ success: true });
    });
    app.use('/api/audit-logs', router);
}
