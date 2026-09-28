import { Router } from 'express';
import bcrypt from 'bcrypt';
import { createToken, authenticate, restrictTo } from '../../middleware/auth.js';
import { db } from '../../db.js';
export function registerAuthRoutes(app, _store) {
    const router = Router();
    router.post('/login', async (req, res) => {
        try {
            const { email, password } = req.body;
            if (!email || !password)
                return res.status(400).json({ success: false, message: 'Email and password are required.' });
            const user = await db.user.findFirst({ where: { OR: [{ email }, { username: email }] } });
            if (!user || !bcrypt.compareSync(password, user.passwordHash)) {
                return res.status(401).json({ success: false, message: 'Invalid credentials.' });
            }
            if (!user.active)
                return res.status(403).json({ success: false, message: 'Account has been deactivated.' });
            const token = createToken({ id: user.id, role: user.role, name: user.name, email: user.email });
            await db.auditLog.create({ data: { userId: user.id, action: 'Logged in', target: 'auth', details: 'Successful login' } });
            res.json({ success: true, token, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username } });
        }
        catch (err) {
            console.error('[login error]', err);
            res.status(500).json({ success: false, message: 'Internal server error', detail: String(err) });
        }
    });
    router.get('/me', authenticate(_store), async (req, res) => {
        const user = await db.user.findUnique({ where: { id: req.user.id } });
        if (!user)
            return res.status(404).json({ success: false, message: 'User not found.' });
        res.json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username } });
    });
    router.post('/logout', authenticate(_store), (_req, res) => {
        res.json({ success: true, message: 'Signed out.' });
    });
    const adminRouter = Router();
    adminRouter.get('/', authenticate(_store), restrictTo('SUPER_ADMIN'), async (_req, res) => {
        const users = await db.user.findMany({ select: { id: true, name: true, email: true, role: true, username: true, active: true, createdAt: true } });
        res.json({ success: true, data: users });
    });
    adminRouter.post('/', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req, res) => {
        const { name, email, username, role, password } = req.body;
        if (!name || !email || !username || !role)
            return res.status(400).json({ success: false, message: 'Missing user details.' });
        const passwordHash = bcrypt.hashSync(password || 'Diano21@Esron21%', 10);
        const user = await db.user.create({ data: { name, email, username, passwordHash, role: role } });
        await db.auditLog.create({ data: { userId: req.user.id, action: 'Created user', target: user.id, details: `${user.name} (${user.role})` } });
        await db.notification.create({ data: { title: 'New user added', message: `${user.name} can now access SBS.`, type: 'user', role: 'SUPER_ADMIN' } });
        res.status(201).json({ success: true, user: { id: user.id, name: user.name, email: user.email, role: user.role, username: user.username } });
    });
    adminRouter.patch('/:id', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req, res) => {
        try {
            const id = String(req.params.id);
            const { name, email, username, role, active } = req.body;
            const existing = await db.user.findUnique({ where: { id } });
            if (!existing)
                return res.status(404).json({ success: false, message: 'User not found.' });
            if (email && email !== existing.email) {
                const emailExists = await db.user.findFirst({ where: { email, NOT: { id } } });
                if (emailExists)
                    return res.status(400).json({ success: false, message: 'Email is already used by another user.' });
            }
            if (username && username !== existing.username) {
                const usernameExists = await db.user.findFirst({ where: { username, NOT: { id } } });
                if (usernameExists)
                    return res.status(400).json({ success: false, message: 'Username is already used by another user.' });
            }
            const user = await db.user.update({
                where: { id },
                data: {
                    ...(name && { name }),
                    ...(email && { email }),
                    ...(username && { username }),
                    ...(role && { role: role }),
                    ...(active !== undefined && { active }),
                },
                select: { id: true, name: true, email: true, role: true, username: true, active: true, createdAt: true }
            });
            await db.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'Updated user',
                    target: user.id,
                    details: `Updated ${user.name} (${user.role})`
                }
            });
            res.json({ success: true, user });
        }
        catch (err) {
            res.status(500).json({ success: false, message: 'Failed to update user', error: String(err) });
        }
    });
    adminRouter.post('/:id/reset-password', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req, res) => {
        try {
            const id = String(req.params.id);
            const { newPassword } = req.body;
            if (!newPassword || newPassword.length < 6) {
                return res.status(400).json({ success: false, message: 'New password must be at least 6 characters long.' });
            }
            const existing = await db.user.findUnique({ where: { id } });
            if (!existing)
                return res.status(404).json({ success: false, message: 'User not found.' });
            const passwordHash = bcrypt.hashSync(newPassword, 10);
            await db.user.update({
                where: { id },
                data: { passwordHash }
            });
            await db.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'Reset user password',
                    target: existing.id,
                    details: `Admin reset password for user ${existing.name}`
                }
            });
            res.json({ success: true, message: `Password for ${existing.name} has been updated successfully.` });
        }
        catch (err) {
            res.status(500).json({ success: false, message: 'Failed to reset password', error: String(err) });
        }
    });
    adminRouter.delete('/:id', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req, res) => {
        try {
            const id = String(req.params.id);
            if (id === req.user.id) {
                return res.status(400).json({ success: false, message: 'You cannot delete your own account.' });
            }
            const existing = await db.user.findUnique({ where: { id } });
            if (!existing)
                return res.status(404).json({ success: false, message: 'User not found.' });
            // Check if user has sales recorded
            const salesCount = await db.sale.count({ where: { sellerId: id } });
            if (salesCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete ${existing.name} because they have ${salesCount} recorded sale(s). Please deactivate their account instead to preserve sales history.`
                });
            }
            // Check if user has expenses recorded
            const expensesCount = await db.expense.count({ where: { createdById: id } });
            if (expensesCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete ${existing.name} because they have recorded expenses. Please deactivate the account instead.`
                });
            }
            // Check if user has stock adjustments recorded
            const stockCount = await db.stockHistory.count({ where: { userId: id } });
            if (stockCount > 0) {
                return res.status(400).json({
                    success: false,
                    message: `Cannot delete ${existing.name} because they have recorded inventory adjustments. Please deactivate the account instead.`
                });
            }
            // Clean up audit logs associated with this user
            await db.auditLog.deleteMany({ where: { userId: id } });
            await db.user.delete({ where: { id } });
            await db.auditLog.create({
                data: {
                    userId: req.user.id,
                    action: 'Deleted user',
                    target: id,
                    details: `Deleted user ${existing.name} (${existing.email})`
                }
            });
            res.json({ success: true, message: `User ${existing.name} has been permanently deleted.` });
        }
        catch (err) {
            res.status(500).json({ success: false, message: 'Failed to delete user', error: String(err) });
        }
    });
    app.use('/api/auth', router);
    app.use('/api/admin/users', adminRouter);
}
