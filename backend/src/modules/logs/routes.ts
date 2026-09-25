import { Router, type Response } from 'express'
import { authenticate, restrictTo, type AuthRequest } from '../../middleware/auth.js'
import { db } from '../../db.js'

export function registerAuditLogRoutes(app: any, _store: any) {
  const router = Router()

  router.get('/', authenticate(_store), restrictTo('MANAGER', 'SUPER_ADMIN'), async (_req: AuthRequest, res: Response) => {
    const logs = await db.auditLog.findMany({ include: { user: { select: { name: true, role: true } } }, orderBy: { createdAt: 'desc' }, take: 100 })
    res.json({ success: true, data: logs })
  })

  app.use('/api/audit-logs', router)
}
