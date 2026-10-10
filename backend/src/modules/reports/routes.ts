import { Router, type Response } from 'express'
import { authenticate, restrictTo, type AuthRequest } from '../../middleware/auth.js'
import { db } from '../../db.js'

export function registerReportRoutes(app: any, _store: any) {
  const router = Router()

  router.get('/summary', authenticate(_store), async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string }
    const dateFilter = from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {}
    const expenseDateFilter = from && to ? { date: { gte: new Date(from), lte: new Date(to) } } : {}
    const stockHistoryDateFilter = from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {}

    const [products, sales, expenses, stockAdjustments] = await Promise.all([
      db.product.findMany({ include: { category: true } }),
      db.sale.findMany({ 
        where: dateFilter, 
        include: { 
          items: { include: { product: true } }, 
          seller: { select: { name: true } } 
        }, 
        orderBy: { createdAt: 'desc' } 
      }),
      db.expense.findMany({ 
        where: expenseDateFilter, 
        orderBy: { date: 'desc' } 
      }),
      db.stockHistory.findMany({
        where: {
          ...stockHistoryDateFilter,
          reason: { not: 'Sale' },
        },
        include: {
          product: {
            select: {
              id: true,
              name: true,
              unit: true,
              sku: true,
              category: { select: { name: true } },
            },
          },
          user: {
            select: {
              id: true,
              name: true,
              role: true,
              username: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
      }),
    ])

    const revenue = sales.reduce((s, x) => s + x.totalAmount, 0)
    const expenseTotal = expenses.reduce((s, x) => s + x.amount, 0)
    const totalDiscounts = sales.reduce((s, x) => s + (x.discountAmount || 0), 0)

    // Breakdown by Sales Channel
    const channelMap: Record<string, { count: number; total: number }> = {}
    // Breakdown by Payment Method
    const methodMap: Record<string, { count: number; total: number }> = {}
    
    // Sales by product
    const productMap: Record<string, { name: string; qty: number; revenue: number }> = {}

    for (const sale of sales) {
      // Channel
      const ch = sale.salesChannel || 'In-Store'
      if (!channelMap[ch]) channelMap[ch] = { count: 0, total: 0 }
      channelMap[ch].count++
      channelMap[ch].total += sale.totalAmount

      // Method
      const meth = sale.paymentMethod || 'Cash'
      if (!methodMap[meth]) methodMap[meth] = { count: 0, total: 0 }
      methodMap[meth].count++
      methodMap[meth].total += sale.totalAmount

      for (const item of sale.items) {
        if (!productMap[item.productId]) productMap[item.productId] = { name: item.product.name, qty: 0, revenue: 0 }
        productMap[item.productId].qty += item.quantity
        productMap[item.productId].revenue += item.lineTotal
      }
    }

    res.json({
      success: true,
      data: {
        totalProducts: products.length,
        totalStock: products.reduce((s, x) => s + x.currentQuantity, 0),
        lowStockCount: products.filter((p) => p.currentQuantity <= p.minimumStockLevel).length,
        totalSales: sales.length,
        revenue,
        expenseTotal,
        totalDiscounts,
        netProfit: revenue - expenseTotal,
        stockValue: products.reduce((s, x) => s + x.buyingPrice * x.currentQuantity, 0),
        sales,
        expenses,
        stockAdjustments,
        salesByChannel: Object.entries(channelMap).map(([name, data]) => ({ name, ...data })),
        salesByMethod: Object.entries(methodMap).map(([name, data]) => ({ name, ...data })),
        topProducts: Object.values(productMap).sort((a, b) => b.revenue - a.revenue).slice(0, 10),
        lowStockProducts: products.filter((p) => p.currentQuantity <= p.minimumStockLevel).map((p) => ({ name: p.name, currentQuantity: p.currentQuantity, minimumStockLevel: p.minimumStockLevel, unit: p.unit })),
      },
    })
  })

  // Admin: Delete a single stock adjustment record
  router.delete('/stock-adjustments/:id', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
    const id = String(req.params.id)
    try {
      const existing = await db.stockHistory.findUnique({
        where: { id },
        include: { product: { select: { name: true } } },
      })
      if (!existing) return res.status(404).json({ success: false, message: 'Stock adjustment record not found.' })

      await db.stockHistory.delete({ where: { id } })

      await db.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'Deleted stock adjustment log',
          target: id,
          details: `Deleted adjustment record for ${existing.product?.name ?? 'product'} (Qty: ${existing.delta > 0 ? '+' : ''}${existing.delta})`,
        },
      })

      res.json({ success: true, message: 'Adjustment record removed successfully.' })
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to delete adjustment record' })
    }
  })

  // Admin: Clear stock adjustment records for the date range
  router.delete('/stock-adjustments', authenticate(_store), restrictTo('SUPER_ADMIN'), async (req: AuthRequest, res: Response) => {
    const { from, to } = req.query as { from?: string; to?: string }
    const dateFilter = from && to ? { createdAt: { gte: new Date(from), lte: new Date(to) } } : {}
    try {
      const result = await db.stockHistory.deleteMany({
        where: {
          ...dateFilter,
          reason: { not: 'Sale' },
        },
      })

      await db.auditLog.create({
        data: {
          userId: req.user!.id,
          action: 'Cleared stock adjustment logs',
          target: 'stockHistory',
          details: `Cleared ${result.count} stock adjustment records${from && to ? ` (${from} to ${to})` : ''}`,
        },
      })

      res.json({ success: true, count: result.count, message: `Cleared ${result.count} adjustment records.` })
    } catch (error) {
      res.status(500).json({ success: false, message: 'Failed to clear adjustment records' })
    }
  })

  app.use('/api/reports', router)
}
