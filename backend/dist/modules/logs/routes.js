import { Router } from 'express';
import { authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerAuditLogRoutes(app, _store) {
    const router = Router();
    router.get('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (_req, res) => {
        const logs = await db.auditLog.findMany({ include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 });
        res.json({ success: true, data: logs });
    });
    app.use('/api/audit-logs', router);
}
