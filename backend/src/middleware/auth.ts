import jwt from 'jsonwebtoken'
import type { NextFunction, Request, Response } from 'express'
import type { UserRole } from '@prisma/client'
import { db } from '../db.js'

const JWT_SECRET = process.env.JWT_SECRET || 'sbs-demo-secret'

export function createToken(user: { id: string; role: UserRole; name: string; email: string }) {
  return jwt.sign({ id: user.id, role: user.role, name: user.name, email: user.email }, JWT_SECRET, { expiresIn: '8h' })
}

export interface AuthRequest extends Request {
  user?: { id: string; role: UserRole; name: string; email: string }
}

export function authenticate(_store?: any) {
  return async (req: AuthRequest, res: Response, next: NextFunction) => {
    const header = req.headers.authorization
    if (!header?.startsWith('Bearer ')) {
      return res.status(401).json({ success: false, message: 'Authentication required.' })
    }
    const token = header.slice(7)
    try {
      const payload = jwt.verify(token, JWT_SECRET) as { id: string; role: UserRole; name: string; email: string }
      const member = await db.user.findUnique({ where: { id: payload.id } })
      if (!member || !member.active) {
        return res.status(401).json({ success: false, message: 'Account is inactive.' })
      }
      req.user = { id: member.id, role: member.role, name: member.name, email: member.email }
      next()
    } catch {
      return res.status(401).json({ success: false, message: 'Invalid or expired token.' })
    }
  }
}

export function restrictTo(...roles: UserRole[]) {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ success: false, message: 'Access denied.' })
    }
    next()
  }
}
