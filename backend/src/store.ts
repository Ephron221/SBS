import bcrypt from 'bcrypt'
import { randomUUID } from 'crypto'
import type { AuditLogEntry, BusinessProfile, Expense, NotificationItem, Product, SBSStore, Sale, SaleItem, StockHistoryEntry, User, UserRole } from './types.js'

const SALT_ROUNDS = 10

export function createSeedStore(): SBSStore {
  const passwordHash = bcrypt.hashSync('Diano21@Esron21%', SALT_ROUNDS)

  const users: User[] = [
    {
      id: randomUUID(),
      name: 'Diano Esron',
      email: 'admin@sbs.rw',
      username: 'admin',
      passwordHash,
      role: 'SUPER_ADMIN',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Mutesi Aline',
      email: 'manager@sbs.rw',
      username: 'manager',
      passwordHash,
      role: 'MANAGER',
      active: true,
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Karekezi Jean',
      email: 'seller@sbs.rw',
      username: 'seller',
      passwordHash,
      role: 'SELLER',
      active: true,
      createdAt: new Date().toISOString(),
    },
  ]

  const categories = [
    { id: randomUUID(), name: 'Food' },
    { id: randomUUID(), name: 'Cleaning Materials' },
    { id: randomUUID(), name: 'Cosmetics' },
    { id: randomUUID(), name: 'Drinks' },
    { id: randomUUID(), name: 'Household Goods' },
    { id: randomUUID(), name: 'Personal Care' },
    { id: randomUUID(), name: 'Stationery' },
  ]

  const products: Product[] = [
    {
      id: randomUUID(),
      name: 'Isabune',
      category: categories[1].name,
      description: 'Local soap bar',
      buyingPrice: 450,
      sellingPrice: 600,
      currentQuantity: 18,
      minimumStockLevel: 10,
      unit: 'Piece',
      supplier: 'Kigali Suppliers',
      status: 'Active',
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Amavuta yo kwisiga',
      category: categories[2].name,
      description: 'Skin lotion',
      buyingPrice: 2800,
      sellingPrice: 3600,
      currentQuantity: 7,
      minimumStockLevel: 8,
      unit: 'Bottle',
      supplier: 'Kigali Suppliers',
      status: 'Active',
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Buto',
      category: categories[0].name,
      description: 'Cooking oil',
      buyingPrice: 3200,
      sellingPrice: 4200,
      currentQuantity: 0,
      minimumStockLevel: 4,
      unit: 'Bottle',
      supplier: 'Musanze Wholesale',
      status: 'Active',
      createdAt: new Date().toISOString(),
    },
    {
      id: randomUUID(),
      name: 'Milk',
      category: categories[3].name,
      description: 'Fresh milk',
      buyingPrice: 1400,
      sellingPrice: 1700,
      currentQuantity: 25,
      minimumStockLevel: 8,
      unit: 'Litre',
      supplier: 'Kayonza Dairy',
      status: 'Active',
      createdAt: new Date().toISOString(),
    },
  ]

  const stockHistory: StockHistoryEntry[] = []
  const sales: Sale[] = []
  const saleItems: SaleItem[] = []
  const expenses: Expense[] = [
    {
      id: randomUUID(),
      category: 'Electricity',
      amount: 35000,
      note: 'Demo utility charge',
      date: new Date().toISOString(),
      createdBy: users[1].id,
    },
  ]
  const notifications: NotificationItem[] = []
  const auditLogs: AuditLogEntry[] = []

  const businessProfile: BusinessProfile = {
    shopName: 'Smart Boutique System',
    currency: 'RWF',
    taxRate: 0.18,
    address: 'KG 123, Kigali',
  }

  const store: SBSStore = {
    users,
    categories,
    products,
    stockHistory,
    sales,
    saleItems,
    expenses,
    notifications,
    auditLogs,
    businessProfile,
  }

  createAuditLog(store, users[0], 'System Initialized', 'system', 'Seed data loaded')
  createAuditLog(store, users[1], 'Added expense', 'expenses', 'Demo electricity expense captured')
  createNotification(store, 'SUPER_ADMIN', 'System ready', 'SBS demo data loaded successfully.', 'system', 'system')
  createNotification(store, 'MANAGER', 'Low stock alert', 'Amavuta yo kwisiga is approaching the minimum threshold.', 'stock', products[1].id)
  return store
}

export function verifyPassword(input: string, hash: string) {
  return bcrypt.compareSync(input, hash)
}

export function createAuditLog(store: SBSStore, user: User | undefined, action: string, target: string, details: string) {
  if (!user) return
  const entry: AuditLogEntry = {
    id: randomUUID(),
    userId: user.id,
    userName: user.name,
    role: user.role,
    action,
    target,
    details,
    createdAt: new Date().toISOString(),
  }
  store.auditLogs.unshift(entry)
}

export function createNotification(store: SBSStore, role: UserRole, title: string, message: string, type: string, relatedId: string) {
  const entry: NotificationItem = {
    id: randomUUID(),
    title,
    message,
    type,
    read: false,
    createdAt: new Date().toISOString(),
    role,
  }
  store.notifications.unshift(entry)
  if (relatedId) {
    entry.message = `${entry.message} (Ref: ${relatedId})`
  }
}

export function getProductStatus(product: Product) {
  if (product.currentQuantity === 0) return 'Out of Stock'
  if (product.currentQuantity <= product.minimumStockLevel) return 'Low Stock'
  return 'In Stock'
}

export function getRoleLabel(role: UserRole) {
  switch (role) {
    case 'SUPER_ADMIN':
      return 'Super Admin'
    case 'MANAGER':
      return 'Manager'
    case 'SELLER':
      return 'Seller'
    default:
      return 'Unknown'
  }
}
