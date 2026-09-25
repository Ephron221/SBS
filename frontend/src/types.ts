export interface UserSession { id: string; name: string; email: string; role: 'SUPER_ADMIN' | 'MANAGER' | 'SELLER'; username: string }
export interface Category { id: string; name: string }
export interface Product {
  id: string;
  name: string;
  category: { id: string; name: string } | string;
  categoryId?: string;
  description: string;
  buyingPrice: number;
  sellingPrice: number;
  currentQuantity: number;
  minimumStockLevel: number;
  unit: string;
  supplier: string;
  status: string;
  size?: string;
  color?: string;
  sku?: string;
  createdAt?: string;
}
export type NormalizedProduct = Omit<Product, 'category'> & {
  categoryName: string;
  categoryId: string;
  category: { id: string; name: string } | string;
  sku?: string;
}
export interface SaleItem {
  id: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product: { name: string; unit: string; size?: string; color?: string }
}
export interface Sale { 
  id: string;
  invoiceNumber: string;
  totalAmount: number;
  discountAmount?: number;
  discountType?: 'PERCENT' | 'FIXED';
  salesChannel?: string;
  createdAt: string;
  paymentMethod: string;
  customerName: string;
  customer?: { name: string; phone?: string | null };
  seller?: { name: string };
  items?: SaleItem[]
}
export interface Expense {
  id: string;
  category: string;
  amount: number;
  note: string;
  date: string;
  createdById?: string;
}
export interface FinanceSummary { revenue: number; expenses: number; netProfit: number; stockValue: number }
export interface ReportSaleItem { id: string; quantity: number; lineTotal: number; product: { name: string } }
export interface ReportSale { id: string; invoiceNumber: string; totalAmount: number; discountAmount?: number; createdAt: string; paymentMethod: string; customerName: string; salesChannel?: string; seller?: { name: string }; items: ReportSaleItem[] }
export interface ReportExpense { id: string; category: string; amount: number; note: string; date: string }
export interface TopProduct { name: string; qty: number; revenue: number }
export interface LowStockProduct { name: string; currentQuantity: number; minimumStockLevel: number; unit: string }
export interface ChannelStat { name: string; total: number; count: number }
export interface PaymentStat { name: string; total: number; count: number }
export interface ReportSummary {
  totalProducts: number;
  totalStock: number;
  lowStockCount: number;
  totalSales: number;
  revenue: number;
  expenseTotal: number;
  netProfit: number;
  stockValue: number;
  totalDiscounts?: number;
  sales: ReportSale[];
  expenses: ReportExpense[];
  topProducts: TopProduct[];
  lowStockProducts: LowStockProduct[];
  salesByChannel?: ChannelStat[];
  salesByMethod?: PaymentStat[];
}
export interface NotificationItem { id: string; title: string; message: string; read: boolean; createdAt: string; role: string }
export interface AuditLogEntry { id: string; user?: { name: string; role: string }; action: string; target: string; details: string; createdAt: string }
export interface SBSUser { id: string; name: string; email: string; role: string; username: string; active: boolean; createdAt?: string }
export interface Customer { id: string; name: string; phone?: string; email?: string; totalSpent: number; lastVisit: string }
