import { Router, type Request, type Response } from 'express'
import bcrypt from 'bcrypt'
import { createToken, authenticate, restrictTo, type AuthRequest } from '../../middleware/auth.js'
import { db } from '../../db.js'
import type { UserRole } from '@prisma/client'

export function registerAuthRoutes(app: any, _store: any) {
  const router = Router()

  router.post('/login', async (req: Request, res: Response) => {
    try {
      const { email, password } = req.body as { email?: string; password?: string }
      if (!email || !password) return res.status(400).json({ success: false, message: 'Email and password are required.' })

      const user = await db.user.findFirst({ where: { OR: [{ email }, { username: email }] } })
      if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
        return res.status(401).json({ success: false, message: 'Invalid credentials.' })
      }
      if (!user.active) return res.status(403).json({ success: false, message: 'Account has been deactivated.' })

      const token = createToken({ id: user.id, role: user.role, name: user.name, email: user.email })
      await db.auditLog.create({ data: { userId: user.id, action: 'Logged in', target: 'auth', details: 'Successful login' } })
      res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username } })
    } catch (err) {
      console.error('[login error]', err)
      res.status(500).json({ success: false, message: 'Internal server error', detail: String(err) })
    }
  })

  router.get('/me', authenticate(_store), async (req: AuthRequest, res: Response) => {
    const user = await db.user.findUnique({ where: { id: req.user!.id } })
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username } })
  })

  router.post('/logout', authenticate(_store), (_req: Request, res: Response) => {
    res.json({ success: true, message: 'Signed out.' })
  })

  const adminRouter = Router()

  adminRouter.get('/', authenticate(_store), restrictTo('SUPER_ADMIN'), async (_req: AuthRequest, res: Response) => {
    const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, username: true, active: true, createdAt: true } })
    res.json({ success: true, data: users })
  })

  adminRouter.post('/', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
    const { name, email, username, role, password } = req.body as { name: string; email: string; username: string; role: string; password?: string }
    if (!name || !email || !username || !role) return res.status(400).json({ success: false, message: 'Missing user details.' })
    const passwordHash = bcrypt.hashSync(password || 'Diano21@Esron21%', 10)
    const user = await db.user.create({ data: { name, email, username, passwordHash, role: role as UserRole } })
    await db.auditLog.create({ data: { userId: req.user!.id, action: 'Created user', target: user.id, details: `${user.name} (${user.role})` } })
    await db.notification.create({ data: { title: 'New user added', message: `${user.name} can now access SBS.`, type: 'user', role: 'SUPER_ADMIN' } })
    res.status(201).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username } })
  })

  adminRouter.patch('/:id', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
    const { active, role } = req.body
    const id = String(req.params.id)
    const user = await db.user.update({ where: { id }, data: { ...(active !== undefined && { active }), ...(role && { role: role as UserRole }) } }).catch(() => null)
    if (!user) return res.status(404).json({ success: false, message: 'User not found.' })
    res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, active: user.active } })
  })

  app.use('/api/auth', router)
  app.use('/api/admin/users', adminRouter)
}
