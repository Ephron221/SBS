export type UserRole = 'SUPER_ADMIN' | 'MANAGER' | 'SELLER'

export interface User {
  id: string
  name: string
  email: string
  username: string
  passwordHash: string
  role: UserRole
  active: boolean
  createdAt: string
}

export interface Category {
  id: string
  name: string
}

export interface Product {
  id: string
  name: string
  category: string
  description: string
  buyingPrice: number
  sellingPrice: number
  currentQuantity: number
  minimumStockLevel: number
  unit: string
  supplier: string
  status: 'Active' | 'Inactive' | 'Discontinued'
  createdAt: string
}

export interface StockHistoryEntry {
  id: string
  productId: string
  previousQuantity: number
  delta: number
  remainingQuantity: number
  reason: string
  createdAt: string
  userId: string
}

export interface SaleItem {
  id: string
  saleId: string
  productId: string
  quantity: number
  unitPrice: number
  lineTotal: number
}

export interface Sale {
  id: string
  invoiceNumber: string
  sellerId: string
  customerName: string
  totalAmount: number
  paymentMethod: string
  createdAt: string
}

export interface Expense {
  id: string
  category: string
  amount: number
  note: string
  date: string
  createdBy: string
}

export interface NotificationItem {
  id: string
  title: string
  message: string
  type: string
  read: boolean
  createdAt: string
  role: UserRole
}

export interface AuditLogEntry {
  id: string
  userId: string
  userName: string
  role: UserRole
  action: string
  target: string
  details: string
  createdAt: string
}

export interface BusinessProfile {
  shopName: string
  currency: string
  taxRate: number
  address: string
}

export interface SBSStore {
  users: User[]
  categories: Category[]
  products: Product[]
  stockHistory: StockHistoryEntry[]
  sales: Sale[]
  saleItems: SaleItem[]
  expenses: Expense[]
  notifications: NotificationItem[]
  auditLogs: AuditLogEntry[]
  businessProfile: BusinessProfile
}
