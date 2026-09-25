import { useEffect, useState, useCallback } from 'react'
import {
  BadgeCheck, CircleDollarSign, Printer, ShoppingCart,
  Wallet, Calendar, FileText, TrendingUp, AlertCircle,
  Globe, CreditCard, Tag, ChevronRight, Download, Filter, Loader2,
} from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { ReportSummary, ReportSale } from '../types'
import {
  PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
  BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'

const COLORS = ['#23415f', '#d9912e', '#10b981', '#8b5cf6', '#ef4444', '#3b82f6']

function exportCSV(data: ReportSummary, from: string, to: string) {
  const lines: string[] = [
    'Smart Boutique System — Sales Report',
    `Period: ${from} to ${to}`,
    '',
    'SUMMARY',
    `Gross Revenue,RWF ${data.revenue}`,
    `Total Expenses,RWF ${data.expenseTotal}`,
    `Net Profit,RWF ${data.netProfit}`,
    `Total Sales,${data.totalSales}`,
    '',
    'TOP PRODUCTS',
    'Product,Units Sold,Revenue (RWF)',
    ...(data.topProducts ?? []).map(p => `${p.name},${p.qty},${p.revenue}`),
    '',
    'TRANSACTION LOG',
    'Invoice,Customer,Payment Method,Channel,Amount (RWF),Date',
    ...(data.sales ?? []).map(s =>
      `${s.invoiceNumber},"${s.customerName ?? 'Walk-in'}",${s.paymentMethod},${s.salesChannel ?? 'In-Store'},${s.totalAmount},${new Date(s.createdAt).toLocaleDateString()}`
    ),
  ]
  const blob = new Blob([lines.join('\n')], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `SBS_Report_${from}_${to}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

export default function ReportsPage() {
  const { toast } = useToast()
  const today = new Date()
  const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString().slice(0, 10)
  const todayStr = today.toISOString().slice(0, 10)
  const [from, setFrom] = useState(firstOfMonth)
  const [to, setTo] = useState(todayStr)
  const [data, setData] = useState<ReportSummary | null>(null)
  const [loading, setLoading] = useState(false)

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

  const handleExportCSV = () => {
    if (!data) { toast.warning('No Data', 'Generate a report first before exporting.'); return }
    exportCSV(data, from, to)
    toast.success('Export Ready', 'CSV report downloaded successfully.')
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
            <button
              className="ghost-button icon-btn"
              style={{ height: 44, width: 44, border: '1px solid var(--border)' }}
              onClick={() => window.print()}
              title="Print report"
            >
              <Printer size={17} />
            </button>
            <button
              className="ghost-button icon-btn"
              style={{ height: 44, width: 44, border: '1px solid var(--border)' }}
              onClick={handleExportCSV}
              title="Export CSV"
            >
              <Download size={17} />
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
