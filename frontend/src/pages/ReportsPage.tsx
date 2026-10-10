import { useEffect, useState, useCallback, useMemo } from 'react'
import {
  BadgeCheck, CircleDollarSign, Printer, ShoppingCart,
  Wallet, Calendar, FileText, TrendingUp, AlertCircle,
  Globe, CreditCard, Tag, ChevronRight, Download, Filter, Loader2,
  ArrowUpCircle, ArrowDownCircle, History, Search, Trash2,
} from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { useAuth } from '../context/AuthContext'
import { useConfirm } from '../context/ConfirmContext'
import type { ReportSummary, ReportSale, ReportStockAdjustment } from '../types'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

import * as XLSX from 'xlsx'

const COLORS = ['#23415f', '#d9912e', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6']

function exportExcel(data: ReportSummary, from: string, to: string) {
  const wb = XLSX.utils.book_new()

  const totalAdded = (data.stockAdjustments ?? []).filter(a => a.delta > 0).reduce((s, a) => s + a.delta, 0)
  const totalReduced = Math.abs((data.stockAdjustments ?? []).filter(a => a.delta < 0).reduce((s, a) => s + a.delta, 0))

  // Summary sheet
  const summaryRows = [
    ['Smart Boutique System — Performance & Inventory Report'],
    [`Period: ${from} to ${to}`],
    [],
    ['Metric', 'Value / Count'],
    ['Gross Revenue (RWF)', data.revenue],
    ['Total Expenses (RWF)', data.expenseTotal],
    ['Net Profit (RWF)', data.netProfit],
    ['Total Discounts (RWF)', data.totalDiscounts ?? 0],
    ['Total Sales Transactions', data.totalSales],
    ['Product Adjustments Count', (data.stockAdjustments ?? []).length],
    ['Total Units Restocked / Added', totalAdded],
    ['Total Units Reduced / Deducted', totalReduced],
  ]
  const wsSummary = XLSX.utils.aoa_to_sheet(summaryRows)
  wsSummary['!cols'] = [{ wch: 32 }, { wch: 22 }]
  XLSX.utils.book_append_sheet(wb, wsSummary, 'Summary')

  // Best Products sheet
  const topHeader = [['#', 'Product Name', 'Units Sold', 'Revenue (RWF)', 'Avg Price (RWF)']]
  const topRows = (data.topProducts ?? []).map((p, i) => [
    i + 1, p.name, p.qty, p.revenue, p.qty > 0 ? Math.round(p.revenue / p.qty) : 0,
  ])
  const wsTop = XLSX.utils.aoa_to_sheet([...topHeader, ...topRows])
  wsTop['!cols'] = [{ wch: 5 }, { wch: 30 }, { wch: 15 }, { wch: 18 }, { wch: 18 }]
  XLSX.utils.book_append_sheet(wb, wsTop, 'Best Products')

  // Transactions sheet
  const txHeader = [['Invoice #', 'Customer', 'Seller', 'Payment', 'Channel', 'Items', 'Amount (RWF)', 'Date']]
  const txRows = (data.sales ?? []).map(s => [
    s.invoiceNumber,
    s.customerName || 'Walk-in',
    s.seller?.name ?? 'System',
    s.paymentMethod,
    s.salesChannel ?? 'In-Store',
    (s.items ?? []).map((it: { product: { name: string }; quantity: number }) =>
      `${it.product?.name} x${it.quantity}`).join(', '),
    s.totalAmount,
    new Date(s.createdAt).toLocaleDateString(),
  ])
  const wsTx = XLSX.utils.aoa_to_sheet([...txHeader, ...txRows])
  wsTx['!cols'] = [
    { wch: 16 }, { wch: 22 }, { wch: 18 }, { wch: 14 },
    { wch: 14 }, { wch: 45 }, { wch: 16 }, { wch: 14 },
  ]
  XLSX.utils.book_append_sheet(wb, wsTx, 'Transactions')

  // Stock Adjustments sheet
  const adjHeader = [['#', 'Date & Time', 'Product Name', 'Category', 'SKU', 'Action Type', 'Quantity Adjusted', 'Unit', 'Previous Stock', 'New Stock', 'Adjusted By (User)', 'Role', 'Reason / Note']]
  const adjRows = (data.stockAdjustments ?? []).map((a, i) => [
    i + 1,
    new Date(a.createdAt).toLocaleString(),
    a.product?.name ?? 'Unknown Product',
    typeof a.product?.category === 'string' ? a.product.category : (a.product?.category?.name ?? 'General'),
    a.product?.sku ?? 'N/A',
    a.delta > 0 ? 'Stock Addition' : 'Stock Deduction',
    a.delta > 0 ? `+${a.delta}` : `${a.delta}`,
    a.product?.unit ?? 'Piece',
    a.previousQuantity,
    a.remainingQuantity,
    a.user?.name ?? 'System',
    a.user?.role?.replace('_', ' ') ?? 'ADMIN',
    a.reason || 'Stock adjustment',
  ])
  const wsAdj = XLSX.utils.aoa_to_sheet([...adjHeader, ...adjRows])
  wsAdj['!cols'] = [
    { wch: 5 }, { wch: 22 }, { wch: 28 }, { wch: 18 }, { wch: 14 },
    { wch: 18 }, { wch: 18 }, { wch: 12 }, { wch: 16 }, { wch: 16 },
    { wch: 22 }, { wch: 16 }, { wch: 36 },
  ]
  XLSX.utils.book_append_sheet(wb, wsAdj, 'Stock Adjustments')

  XLSX.writeFile(wb, `SBS_Report_${from}_${to}.xlsx`)
}

export default function ReportsPage() {
  const { toast } = useToast()
  const { isAdmin } = useAuth()
  const { confirm } = useConfirm()
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(todayStr)
  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)
  const [adjFilter, setAdjFilter] = useState<'all' | 'add' | 'remove'>('all')
  const [adjQuery, setAdjQuery] = useState('')
  const [deletingAdjId, setDeletingAdjId] = useState<string | null>(null)
  const [clearingAdjs, setClearingAdjs] = useState(false)

  const fetchReport = useCallback(async () => {
    setLoading(true)
    try {
      const r = await api.get(`/api/reports/summary?from=${from}T00:00:00&to=${to}T23:59:59`)
      setData(r.data.data)
    } catch {
      toast.error('Report Failed', 'Could not load report data. Please try again.')
    } finally {
      setLoading(false)
    }
  }, [from, to])

  useEffect(() => { void fetchReport() }, [])

  const adjustments = data?.stockAdjustments ?? []
  const totalAddedUnits = useMemo(
    () => adjustments.filter(a => a.delta > 0).reduce((acc, a) => acc + a.delta, 0),
    [adjustments]
  )
  const totalReducedUnits = useMemo(
    () => Math.abs(adjustments.filter(a => a.delta < 0).reduce((acc, a) => acc + a.delta, 0)),
    [adjustments]
  )

  const filteredAdjustments = useMemo(() => {
    return adjustments.filter(a => {
      if (adjFilter === 'add' && a.delta <= 0) return false
      if (adjFilter === 'remove' && a.delta >= 0) return false
      if (!adjQuery.trim()) return true
      const q = adjQuery.toLowerCase()
      const pName = (a.product?.name ?? '').toLowerCase()
      const uName = (a.user?.name ?? '').toLowerCase()
      const reason = (a.reason ?? '').toLowerCase()
      const sku = (a.product?.sku ?? '').toLowerCase()
      return pName.includes(q) || uName.includes(q) || reason.includes(q) || sku.includes(q)
    })
  }, [adjustments, adjFilter, adjQuery])

  const handleDeleteAdjustment = async (id: string, productName?: string) => {
    const ok = await confirm({
      title: 'Delete Adjustment Record?',
      message: `Are you sure you want to remove this adjustment record for "${productName || 'product'}" from the report? This action cannot be undone.`,
      danger: true,
      confirmLabel: 'Delete Record',
    })
    if (!ok) return

    setDeletingAdjId(id)
    try {
      await api.delete(`/api/reports/stock-adjustments/${id}`)
      toast.success('Record Deleted', 'Adjustment record was removed.')
      await fetchReport()
    } catch (err: any) {
      toast.error('Delete Failed', err.response?.data?.message || 'Failed to delete adjustment record.')
    } finally {
      setDeletingAdjId(null)
    }
  }

  const handleClearAllAdjustments = async () => {
    const ok = await confirm({
      title: 'Clear All Adjustment Records?',
      message: `Are you sure you want to clear all ${adjustments.length} adjustment records for the selected period (${from} to ${to})? This cannot be undone.`,
      danger: true,
      confirmLabel: 'Clear All',
    })
    if (!ok) return

    setClearingAdjs(true)
    try {
      await api.delete(`/api/reports/stock-adjustments?from=${from}T00:00:00&to=${to}T23:59:59`)
      toast.success('Cleared', 'All adjustment records for this period were deleted.')
      await fetchReport()
    } catch (err: any) {
      toast.error('Clear Failed', err.response?.data?.message || 'Failed to clear adjustment records.')
    } finally {
      setClearingAdjs(false)
    }
  }


  return (
    <section className="content-stack animate-fade-in">
      {/* ── Controls ──────────────────────────────────── */}
      <div className="panel-card no-print" style={{ padding: '1.25rem' }}>
        <div className="panel-head" style={{ marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: 44, height: 44 }}>
              <FileText size={20} />
            </div>
            <div>
              <h1 style={{ fontSize: '1.4rem', fontWeight: 800 }}>Business Intelligence</h1>
              <p className="muted" style={{ fontSize: '0.82rem' }}>Analyze boutique performance and financial trends</p>
            </div>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--bg-main)', border: '1px solid var(--border)', borderRadius: 12, padding: '0.4rem 0.8rem' }}>
              <Calendar size={14} className="muted" />
              <input type="date" className="input-field" value={from} onChange={e => setFrom(e.target.value)}
                style={{ padding: '0.3rem', border: 'none', background: 'transparent', fontSize: '0.85rem', width: 130 }} />
              <span className="muted" style={{ fontSize: '0.8rem' }}>to</span>
              <input type="date" className="input-field" value={to} onChange={e => setTo(e.target.value)}
                style={{ padding: '0.3rem', border: 'none', background: 'transparent', fontSize: '0.85rem', width: 130 }} />
            </div>
            <button
              className="primary-button"
              style={{ height: 44, padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white' }}
              onClick={fetchReport}
              disabled={loading}
            >
              {loading ? <Loader2 size={16} className="animate-spin" /> : <Filter size={16} />}
              {loading ? 'Loading…' : 'Generate'}
            </button>
            {/* Excel download */}
            <button
              className="ghost-button"
              style={{ height: 44, padding: '0 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid #217346', fontSize: '0.85rem', fontWeight: 700, color: '#217346' }}
              onClick={() => {
                if (!data) { toast.warning('No Data', 'Generate a report first before exporting.'); return }
                exportExcel(data, from, to)
                toast.success('Excel Ready', 'Excel report (.xlsx) downloaded.')
              }}
              title="Download Excel (.xlsx) — 4 sheets: Summary, Best Products, Transactions, Stock Adjustments"
            >
              <Download size={16} /> Excel
            </button>
            {/* PDF via browser print */}
            <button
              className="ghost-button"
              style={{ height: 44, padding: '0 1.1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', border: '1px solid var(--border)', fontSize: '0.85rem', fontWeight: 700 }}
              onClick={() => window.print()}
              title="Print / Save as PDF"
            >
              <Printer size={16} /> PDF
            </button>
          </div>
        </div>
      </div>

      {/* ── Print Header ──────────────────────────────── */}
      <div id="report-print">
        <header style={{ marginBottom: '2rem', textAlign: 'center' }} className="print-only">
          <h1 style={{ color: 'var(--primary)', fontSize: '2rem', margin: 0 }}>SMART BOUTIQUE</h1>
          <p style={{ letterSpacing: '0.2em', fontWeight: 700 }}>PERFORMANCE SUMMARY REPORT</p>
          <p>Period: <strong>{new Date(from).toLocaleDateString()}</strong> to <strong>{new Date(to).toLocaleDateString()}</strong></p>
        </header>

        {loading ? (
          <div style={{ display: 'grid', placeItems: 'center', padding: '6rem', color: 'var(--text-muted)' }}>
            <Loader2 size={40} className="animate-spin" style={{ marginBottom: '1rem' }} />
            <p style={{ fontWeight: 600 }}>Generating report…</p>
          </div>
        ) : !data ? (
          <div className="empty-state panel-card" style={{ padding: '5rem 0' }}>
            <FileText size={48} />
            <p style={{ fontWeight: 700 }}>No report data</p>
            <p>Select a date range and click Generate</p>
          </div>
        ) : (
          <>
            {/* KPI Cards */}
            <div className="stats-grid">
              {[
                { label: 'Gross Revenue',  value: data.revenue,       icon: CircleDollarSign, color: '#10b981', bg: '#d1fae5' },
                { label: 'Total Expenses', value: data.expenseTotal,  icon: Wallet,           color: '#ef4444', bg: '#fee2e2' },
                { label: 'Net Profit',     value: data.netProfit,     icon: BadgeCheck,       color: '#8b5cf6', bg: '#ede9fe' },
                { label: 'Discounts',      value: data.totalDiscounts ?? 0, icon: Tag,        color: '#d9912e', bg: '#fef3c7' },
              ].map((stat, i) => (
                <div key={i} className="stat-card">
                  <div className="stat-icon" style={{ background: stat.bg, color: stat.color, width: 48, height: 48 }}>
                    <stat.icon size={22} />
                  </div>
                  <div>
                    <p className="muted" style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{stat.label}</p>
                    <h3 style={{ fontSize: '1.5rem', fontWeight: 900, letterSpacing: '-0.02em' }}>
                      RWF {stat.value.toLocaleString()}
                    </h3>
                  </div>
                </div>
              ))}
            </div>

            {/* ── Most Purchased / Best Sellers Banner ── */}
            {(data.topProducts ?? []).length > 0 && (
              <div className="panel-card" style={{ padding: '1.5rem', marginTop: '1.5rem', background: 'linear-gradient(135deg, var(--primary) 0%, #1a5276 100%)' }}>
                <div className="panel-head" style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800, color: 'white' }}>
                    <TrendingUp size={20} /> Most Purchased Products
                  </h3>
                  <span style={{ fontSize: '0.78rem', color: 'rgba(255,255,255,0.6)', fontWeight: 600 }}>
                    {new Date(from).toLocaleDateString()} – {new Date(to).toLocaleDateString()}
                  </span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(190px, 1fr))', gap: '0.9rem' }}>
                  {data.topProducts.slice(0, 6).map((p, i) => (
                    <div key={p.name} style={{
                      background: 'rgba(255,255,255,0.1)',
                      borderRadius: 14,
                      padding: '1rem',
                      border: '1px solid rgba(255,255,255,0.15)',
                      position: 'relative',
                      overflow: 'hidden',
                    }}>
                      <div style={{
                        position: 'absolute', top: 8, right: 10,
                        fontSize: '2.2rem', fontWeight: 900, opacity: 0.12, color: 'white', lineHeight: 1,
                      }}>#{i + 1}</div>
                      <div style={{
                        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                        width: 28, height: 28, borderRadius: '50%',
                        background: i === 0 ? '#f59e0b' : i === 1 ? '#9ca3af' : i === 2 ? '#cd7c2f' : 'rgba(255,255,255,0.25)',
                        color: 'white', fontWeight: 900, fontSize: '0.78rem', marginBottom: '0.6rem',
                      }}>{i + 1}</div>
                      <p style={{ fontWeight: 800, color: 'white', fontSize: '0.9rem', marginBottom: '0.2rem' }}>{p.name}</p>
                      <p style={{ color: 'rgba(255,255,255,0.65)', fontSize: '0.75rem', marginBottom: '0.35rem' }}>{p.qty} units sold</p>
                      <p style={{ fontWeight: 800, color: '#a7f3d0', fontSize: '0.95rem' }}>RWF {p.revenue.toLocaleString()}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Charts */}
            <div className="panel-grid" style={{ marginTop: '1.5rem' }}>
              {/* Sales by Channel */}
              <div className="panel-card" style={{ padding: '1.5rem' }}>
                <div className="panel-head" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
                    <Globe size={18} style={{ color: 'var(--primary)' }} /> Sales by Channel
                  </h3>
                </div>
                <div style={{ height: 240, position: 'relative' }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={data.salesByChannel ?? []} cx="50%" cy="50%" innerRadius={60} outerRadius={85} paddingAngle={6} dataKey="total">
                        {(data.salesByChannel ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} stroke="none" />)}
                      </Pie>
                      <Tooltip
                        contentStyle={{ borderRadius: 14, border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        formatter={v => `RWF ${Number(v).toLocaleString()}`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', textAlign: 'center', pointerEvents: 'none' }}>
                    <p className="muted" style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>Total</p>
                    <p style={{ fontWeight: 900, fontSize: '1.2rem' }}>{data.totalSales}</p>
                  </div>
                </div>
                <div className="list-stack" style={{ marginTop: '1rem' }}>
                  {(data.salesByChannel ?? []).map((c, i) => (
                    <div key={c.name} className="list-item" style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontWeight: 600, fontSize: '0.87rem' }}>{c.name}</span>
                      </div>
                      <strong style={{ color: 'var(--text-main)', fontSize: '0.9rem' }}>RWF {c.total.toLocaleString()}</strong>
                    </div>
                  ))}
                </div>
              </div>

              {/* Payment Methods */}
              <div className="panel-card" style={{ padding: '1.5rem' }}>
                <div className="panel-head" style={{ marginBottom: '1.5rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
                    <CreditCard size={18} style={{ color: 'var(--primary)' }} /> Payment Methods
                  </h3>
                </div>
                <div style={{ height: 240 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={data.salesByMethod ?? []}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{ fontSize: 12, fontWeight: 500, fill: 'var(--text-subtle)' }} dy={8} />
                      <YAxis hide />
                      <Tooltip
                        cursor={{ fill: 'var(--border)', opacity: 0.5 }}
                        contentStyle={{ borderRadius: 14, border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                        formatter={v => `RWF ${Number(v).toLocaleString()}`}
                      />
                      <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={38}>
                        {(data.salesByMethod ?? []).map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="list-stack" style={{ marginTop: '1rem' }}>
                  {(data.salesByMethod ?? []).map((m, i) => (
                    <div key={m.name} className="list-item" style={{ padding: '0.65rem 0.75rem' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                        <div style={{ width: 10, height: 10, borderRadius: '50%', background: COLORS[i % COLORS.length] }} />
                        <span style={{ fontWeight: 600, fontSize: '0.87rem' }}>{m.name}</span>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <p style={{ fontWeight: 700, fontSize: '0.9rem', margin: 0 }}>{m.count} sales</p>
                        <p className="muted" style={{ fontSize: '0.72rem', margin: 0 }}>RWF {m.total.toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Top Products & Low Stock */}
            <div className="panel-grid" style={{ marginTop: '1.5rem' }}>
              <div className="panel-card" style={{ padding: '1.5rem' }}>
                <div className="panel-head" style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
                    <TrendingUp size={18} style={{ color: '#10b981' }} /> Best Sellers
                  </h3>
                </div>
                {(data.topProducts ?? []).length === 0 ? (
                  <div className="empty-state" style={{ padding: '2.5rem 0' }}>
                    <ShoppingCart size={36} />
                    <p>No sales in this period</p>
                  </div>
                ) : (
                  <div className="list-stack">
                    {data.topProducts.map((p, i) => (
                      <div key={p.name} className="list-item">
                        <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                          <span style={{ color: 'var(--primary)', fontWeight: 900, fontSize: '1rem', width: 22, textAlign: 'center' }}>#{i + 1}</span>
                          <div className="stat-icon" style={{ width: 38, height: 38, borderRadius: 10, background: 'var(--bg-main)', color: 'var(--primary)' }}>
                            <Tag size={17} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</p>
                            <p className="muted" style={{ fontSize: '0.72rem' }}>{p.qty} units sold</p>
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <p style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>RWF {p.revenue.toLocaleString()}</p>
                          <p className="muted" style={{ fontSize: '0.7rem' }}>avg RWF {Math.round(p.revenue / p.qty).toLocaleString()}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="panel-card" style={{ padding: '1.5rem' }}>
                <div className="panel-head" style={{ marginBottom: '1.25rem' }}>
                  <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
                    <AlertCircle size={18} style={{ color: '#ef4444' }} /> Inventory Risks
                  </h3>
                  {(data.lowStockProducts ?? []).length > 0 && (
                    <span className="badge badge-danger">Action Required</span>
                  )}
                </div>
                {(data.lowStockProducts ?? []).length === 0 ? (
                  <div className="empty-state" style={{ padding: '2.5rem 0' }}>
                    <div style={{ width: 48, height: 48, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                      <BadgeCheck size={26} />
                    </div>
                    <p style={{ fontWeight: 700, color: '#166534' }}>Inventory Optimized</p>
                    <p className="muted" style={{ fontSize: '0.82rem' }}>All products are well-stocked</p>
                  </div>
                ) : (
                  <div className="list-stack">
                    {data.lowStockProducts.map(p => (
                      <div key={p.name} className="list-item">
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                          <div className="stat-icon" style={{ width: 38, height: 38, background: '#fee2e2', color: '#ef4444', borderRadius: 10 }}>
                            <AlertCircle size={17} />
                          </div>
                          <div>
                            <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</p>
                            <p className="muted" style={{ fontSize: '0.72rem' }}>Min: {p.minimumStockLevel} {p.unit}</p>
                          </div>
                        </div>
                        <span className={`badge ${p.currentQuantity === 0 ? 'badge-danger' : 'badge-warning'}`} style={{ fontWeight: 800 }}>
                          {p.currentQuantity} {p.unit}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── Product Stock Adjustments & Updates ── */}
            <div className="panel-card" style={{ padding: '1.5rem', marginTop: '1.5rem' }}>
              <div className="panel-head" style={{ marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
                  <div className="stat-icon" style={{ width: 44, height: 44, borderRadius: 12, background: 'rgba(217, 145, 46, 0.15)', color: 'var(--accent)' }}>
                    <History size={22} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: '1.2rem', fontWeight: 800, margin: 0 }}>Product Adjustments & Updates</h3>
                    <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>
                      Audit log of manual stock additions, reductions, and updates performed by Admins and Managers
                    </p>
                  </div>
                </div>

                {/* Counters / Stats & Actions */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', flexWrap: 'wrap' }}>
                  <span className="badge badge-info" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                    {adjustments.length} Adjustments
                  </span>
                  {totalAddedUnits > 0 && (
                    <span className="badge badge-success" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      +{totalAddedUnits.toLocaleString()} Units Added
                    </span>
                  )}
                  {totalReducedUnits > 0 && (
                    <span className="badge badge-danger" style={{ fontWeight: 800, fontSize: '0.8rem', padding: '0.35rem 0.75rem' }}>
                      -{totalReducedUnits.toLocaleString()} Units Reduced
                    </span>
                  )}
                  {isAdmin && adjustments.length > 0 && (
                    <button
                      type="button"
                      className="ghost-button no-print"
                      onClick={handleClearAllAdjustments}
                      disabled={clearingAdjs}
                      title="Clear all adjustment records for this period (Admin only)"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.35rem 0.75rem',
                        fontSize: '0.78rem',
                        fontWeight: 700,
                        color: '#ef4444',
                        border: '1px solid rgba(239, 68, 68, 0.3)',
                        borderRadius: 8,
                      }}
                    >
                      {clearingAdjs ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                      Clear All
                    </button>
                  )}
                </div>
              </div>

              {/* Toolbar: Filter tabs & Search (hidden in print) */}
              <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '0.75rem', marginBottom: '1.25rem' }}>
                <div className="segmented-control" style={{ background: 'var(--bg-main)', padding: '0.25rem', borderRadius: 10 }}>
                  <button
                    type="button"
                    className={adjFilter === 'all' ? 'active' : ''}
                    onClick={() => setAdjFilter('all')}
                    style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.35rem 0.85rem' }}
                  >
                    All ({adjustments.length})
                  </button>
                  <button
                    type="button"
                    className={adjFilter === 'add' ? 'active' : ''}
                    onClick={() => setAdjFilter('add')}
                    style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.35rem 0.85rem', color: adjFilter === 'add' ? '#166534' : undefined }}
                  >
                    Additions ({adjustments.filter(a => a.delta > 0).length})
                  </button>
                  <button
                    type="button"
                    className={adjFilter === 'remove' ? 'active' : ''}
                    onClick={() => setAdjFilter('remove')}
                    style={{ fontSize: '0.8rem', fontWeight: 700, padding: '0.35rem 0.85rem', color: adjFilter === 'remove' ? '#991b1b' : undefined }}
                  >
                    Reductions ({adjustments.filter(a => a.delta < 0).length})
                  </button>
                </div>

                <div style={{ position: 'relative', minWidth: 260, flex: 1, maxWidth: 380 }}>
                  <Search size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    className="input-field"
                    value={adjQuery}
                    onChange={e => setAdjQuery(e.target.value)}
                    placeholder="Search product, user, or reason..."
                    style={{ paddingLeft: '2.4rem', height: '38px', fontSize: '0.85rem', width: '100%' }}
                  />
                </div>
              </div>

              {/* Adjustments List / Table */}
              {filteredAdjustments.length === 0 ? (
                <div className="empty-state" style={{ padding: '3rem 0', textAlign: 'center' }}>
                  <History size={40} style={{ opacity: 0.2, margin: '0 auto 0.75rem' }} />
                  <p style={{ fontWeight: 700, fontSize: '0.95rem' }}>No product adjustments found</p>
                  <p className="muted" style={{ fontSize: '0.82rem' }}>
                    {adjustments.length === 0
                      ? 'No stock updates were made by admin or managers during this period.'
                      : 'No adjustments match the search or filter criteria.'}
                  </p>
                </div>
              ) : (
                <div className="list-stack">
                  {filteredAdjustments.map((a: ReportStockAdjustment) => {
                    const isAddition = a.delta > 0
                    const roleLabel = a.user?.role === 'SUPER_ADMIN' ? 'Super Admin' : a.user?.role === 'MANAGER' ? 'Manager' : (a.user?.role || 'Staff')
                    const unitName = a.product?.unit || 'Unit'
                    const categoryName = typeof a.product?.category === 'string' ? a.product.category : (a.product?.category?.name || 'General')

                    return (
                      <div
                        key={a.id}
                        className="list-item"
                        style={{
                          padding: '1rem',
                          borderRadius: 14,
                          border: '1px solid var(--border)',
                          background: 'var(--bg-card)',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          gap: '1.25rem',
                          flexWrap: 'wrap',
                        }}
                      >
                        {/* 1. Product Name & Meta */}
                        <div style={{ display: 'flex', gap: '0.9rem', alignItems: 'center', minWidth: 240, flex: 1.2 }}>
                          <div
                            className="stat-icon"
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: 12,
                              background: isAddition ? '#dcfce7' : '#fee2e2',
                              color: isAddition ? '#166534' : '#991b1b',
                              flexShrink: 0,
                            }}
                          >
                            {isAddition ? <ArrowUpCircle size={22} /> : <ArrowDownCircle size={22} />}
                          </div>
                          <div>
                            <p style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-main)', marginBottom: '0.2rem' }}>
                              {a.product?.name ?? 'Unknown Product'}
                            </p>
                            <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                              <span className="badge badge-info" style={{ fontSize: '0.68rem', padding: '0.1rem 0.45rem', fontWeight: 700 }}>
                                {categoryName}
                              </span>
                              {a.product?.sku && (
                                <span className="muted" style={{ fontSize: '0.72rem', fontWeight: 600 }}>
                                  SKU: {a.product.sku}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* 2. Quantity Adjusted & Stock Progression */}
                        <div style={{ minWidth: 170, textAlign: 'left' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.45rem', marginBottom: '0.2rem' }}>
                            <span
                              style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '0.3rem',
                                padding: '0.25rem 0.65rem',
                                borderRadius: 8,
                                fontWeight: 900,
                                fontSize: '0.9rem',
                                background: isAddition ? '#dcfce7' : '#fee2e2',
                                color: isAddition ? '#166534' : '#991b1b',
                              }}
                            >
                              {isAddition ? `+${a.delta}` : `${a.delta}`} {unitName}
                            </span>
                            <span className="muted" style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                              {isAddition ? 'Restocked' : 'Reduced'}
                            </span>
                          </div>
                          <p className="muted" style={{ fontSize: '0.73rem', margin: 0 }}>
                            Stock: <strong>{a.previousQuantity}</strong> → <strong style={{ color: 'var(--text-main)' }}>{a.remainingQuantity}</strong> {unitName}
                          </p>
                        </div>

                        {/* 3. User Who Did This Task */}
                        <div style={{ minWidth: 150 }}>
                          <p className="muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                            Adjusted By
                          </p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                            <div
                              style={{
                                width: 28,
                                height: 28,
                                borderRadius: '50%',
                                background: 'var(--primary)',
                                color: 'white',
                                display: 'grid',
                                placeItems: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                flexShrink: 0,
                              }}
                            >
                              {(a.user?.name || 'U').charAt(0)}
                            </div>
                            <div>
                              <p style={{ fontWeight: 700, fontSize: '0.85rem', margin: 0 }}>{a.user?.name || 'System'}</p>
                              <span
                                style={{
                                  fontSize: '0.65rem',
                                  fontWeight: 800,
                                  color: a.user?.role === 'SUPER_ADMIN' ? '#8b5cf6' : '#2563eb',
                                }}
                              >
                                {roleLabel}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* 4. Reason / Note */}
                        <div style={{ minWidth: 160, flex: 1, maxWidth: 240 }}>
                          <p className="muted" style={{ fontSize: '0.65rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '0.2rem' }}>
                            Reason / Note
                          </p>
                          <p
                            style={{
                              fontSize: '0.8rem',
                              color: 'var(--text-muted)',
                              margin: 0,
                              fontWeight: 600,
                              background: 'var(--bg-main)',
                              padding: '0.25rem 0.6rem',
                              borderRadius: 6,
                              display: 'inline-block',
                              maxWidth: '100%',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap',
                            }}
                            title={a.reason}
                          >
                            {a.reason || 'Stock adjustment'}
                          </p>
                        </div>

                        {/* 5. Date & Time and Action */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', justifyContent: 'flex-end', minWidth: 160 }}>
                          <div style={{ textAlign: 'right' }}>
                            <p style={{ fontWeight: 700, fontSize: '0.82rem', margin: 0, color: 'var(--text-main)' }}>
                              {new Date(a.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </p>
                            <p className="muted" style={{ fontSize: '0.72rem', margin: 0 }}>
                              {new Date(a.createdAt).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>

                          {isAdmin && (
                            <button
                              type="button"
                              className="ghost-button icon-btn no-print"
                              onClick={() => handleDeleteAdjustment(a.id, a.product?.name)}
                              disabled={deletingAdjId === a.id}
                              title="Delete this adjustment record (Admin only)"
                              style={{
                                width: 32,
                                height: 32,
                                color: '#ef4444',
                                border: '1px solid rgba(239, 68, 68, 0.25)',
                                borderRadius: 8,
                                flexShrink: 0,
                                display: 'grid',
                                placeItems: 'center',
                              }}
                            >
                              {deletingAdjId === a.id ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                            </button>
                          )}
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>

            {/* Transaction Journal */}
            <div className="panel-card" style={{ padding: '1.5rem' }}>
              <div className="panel-head" style={{ marginBottom: '1.5rem' }}>
                <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
                  <ShoppingCart size={18} style={{ color: 'var(--primary)' }} /> Transaction Journal
                </h3>
                <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                  <span className="muted" style={{ fontSize: '0.82rem' }}>{data.sales?.length ?? 0} transactions</span>
                  <span className="badge badge-success">Verified</span>
                </div>
              </div>
              <div className="list-stack">
                {(data.sales ?? []).map((s: ReportSale) => (
                  <div key={s.id} className="list-item">
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', flex: 1 }}>
                      <div className="stat-icon" style={{ width: 42, height: 42, borderRadius: 11, background: 'var(--bg-main)', color: 'var(--primary)' }}>
                        <FileText size={19} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: '0.9rem' }}>{s.invoiceNumber}</p>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }} className="muted">
                          <span style={{ fontSize: '0.78rem', fontWeight: 600 }}>{s.customerName || 'Walk-in'}</span>
                          <span style={{ opacity: 0.3 }}>•</span>
                          <span style={{ fontSize: '0.78rem' }}>{s.salesChannel}</span>
                          <span style={{ opacity: 0.3 }}>•</span>
                          <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: 2 }}>
                            <CreditCard size={11} /> {s.paymentMethod}
                          </span>
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'center', minWidth: 120 }}>
                      <p className="muted" style={{ fontSize: '0.65rem', fontWeight: 700, letterSpacing: '0.08em', textTransform: 'uppercase' }}>By</p>
                      <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.seller?.name ?? 'System'}</p>
                    </div>
                    <div style={{ textAlign: 'right', minWidth: 140 }}>
                      <p style={{ fontWeight: 900, fontSize: '1rem', color: 'var(--primary)' }}>RWF {s.totalAmount.toLocaleString()}</p>
                      <p className="muted" style={{ fontSize: '0.72rem' }}>
                        {new Date(s.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight size={18} className="muted" />
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  )
}
