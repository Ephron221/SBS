import { useMemo } from 'react'
import {
  Boxes, CircleDollarSign, Package, ShoppingCart,
  TrendingUp, ArrowUpRight, ArrowDownRight, ChevronRight,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useNavigate } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts'

// ── Helpers ────────────────────────────────────────────────────────────────
function toISODate(d: Date) {
  return d.toISOString().slice(0, 10)
}

function relativeTime(iso: string) {
  const diff = Date.now() - new Date(iso).getTime()
  const min = Math.floor(diff / 60000)
  if (min < 1)   return 'just now'
  if (min < 60)  return `${min}m ago`
  const h = Math.floor(min / 60)
  if (h < 24)    return `${h}h ago`
  return `${Math.floor(h / 24)}d ago`
}

// ── Custom Tooltip ─────────────────────────────────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-card)', border: '1px solid var(--border)',
      borderRadius: 14, padding: '0.85rem 1.1rem', boxShadow: 'var(--shadow-lg)',
    }}>
      <p style={{ fontWeight: 700, marginBottom: 4, color: 'var(--text-main)', fontSize: '0.85rem' }}>{label}</p>
      <p style={{ color: 'var(--accent)', fontWeight: 800, fontSize: '1rem' }}>
        RWF {Number(payload[0].value).toLocaleString()}
      </p>
    </div>
  )
}

// ── Main ───────────────────────────────────────────────────────────────────
export default function DashboardPage() {
  const { products, sales } = useAuth()
  const navigate = useNavigate()

  // ── Chart: last 14 days with correct ISO-date grouping ────────────────
  const chartData = useMemo(() => {
    const days: { date: string; label: string; total: number; count: number }[] = []
    for (let i = 13; i >= 0; i--) {
      const d = new Date()
      d.setDate(d.getDate() - i)
      days.push({
        date: toISODate(d),
        label: d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
        total: 0,
        count: 0,
      })
    }
    sales.forEach(s => {
      const key = toISODate(new Date(s.createdAt))
      const day = days.find(d => d.date === key)
      if (day) { day.total += s.totalAmount; day.count++ }
    })
    return days
  }, [sales])

  // ── Real period-over-period change ─────────────────────────────────────
  const stats = useMemo(() => {
    const now = new Date()
    const thisWeekStart = toISODate(new Date(now.getTime() - 6 * 86400000))
    const lastWeekStart = toISODate(new Date(now.getTime() - 13 * 86400000))

    const thisWeekSales  = sales.filter(s => toISODate(new Date(s.createdAt)) >= thisWeekStart)
    const lastWeekSales  = sales.filter(s => {
      const d = toISODate(new Date(s.createdAt))
      return d >= lastWeekStart && d < thisWeekStart
    })

    const thisRevenue = thisWeekSales.reduce((s, x) => s + x.totalAmount, 0)
    const lastRevenue = lastWeekSales.reduce((s, x) => s + x.totalAmount, 0)
    const revenueChange = lastRevenue === 0 ? null : ((thisRevenue - lastRevenue) / lastRevenue * 100).toFixed(1)

    const thisCount = thisWeekSales.length
    const lastCount = lastWeekSales.length
    const countChange = lastCount === 0 ? null : ((thisCount - lastCount) / lastCount * 100).toFixed(1)

    const lowStock  = products.filter(p => p.currentQuantity > 0 && p.currentQuantity <= p.minimumStockLevel)
    const outStock  = products.filter(p => p.currentQuantity <= 0)
    const totalStock = products.reduce((s, p) => s + p.currentQuantity, 0)

    return [
      {
        title: 'Units in Stock',
        value: totalStock.toLocaleString(),
        icon: Boxes,
        color: '#3b82f6',
        bg: '#dbeafe',
        change: outStock.length > 0 ? `-${outStock.length} out` : 'All healthy',
        positive: outStock.length === 0,
      },
      {
        title: 'Low Stock Alerts',
        value: lowStock.length,
        icon: Package,
        color: '#ef4444',
        bg: '#fee2e2',
        change: lowStock.length === 0 ? 'All healthy' : `${lowStock.length} need restock`,
        positive: lowStock.length === 0,
      },
      {
        title: 'Sales This Week',
        value: thisCount.toLocaleString(),
        icon: ShoppingCart,
        color: '#10b981',
        bg: '#d1fae5',
        change: countChange ? `${Number(countChange) >= 0 ? '+' : ''}${countChange}% vs last week` : 'No prior data',
        positive: countChange ? Number(countChange) >= 0 : true,
      },
      {
        title: 'Weekly Revenue',
        value: `RWF ${thisRevenue.toLocaleString()}`,
        icon: CircleDollarSign,
        color: '#f59e0b',
        bg: '#fef3c7',
        change: revenueChange ? `${Number(revenueChange) >= 0 ? '+' : ''}${revenueChange}% vs last week` : 'No prior data',
        positive: revenueChange ? Number(revenueChange) >= 0 : true,
      },
    ]
  }, [products, sales])

  const lowStockProducts = products.filter(p => p.currentQuantity <= p.minimumStockLevel).slice(0, 5)
  const latestSales = [...sales].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).slice(0, 5)

  return (
    <section className="content-stack animate-fade-in">
      {/* ── KPI Cards ─────────────────────────────────── */}
      <div className="stats-grid">
        {stats.map((stat) => {
          const Icon = stat.icon
          return (
            <div key={stat.title} className="stat-card">
              <div className="stat-icon" style={{ background: stat.bg, color: stat.color, width: 48, height: 48 }}>
                <Icon size={22} />
              </div>
              <div style={{ flex: 1 }}>
                <p className="muted" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  {stat.title}
                </p>
                <h3 style={{ fontSize: '1.55rem', fontWeight: 900, margin: '0.15rem 0', letterSpacing: '-0.02em' }}>
                  {stat.value}
                </h3>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.75rem', fontWeight: 600, color: stat.positive ? '#16a34a' : '#dc2626' }}>
                  {stat.positive ? <ArrowUpRight size={13} /> : <ArrowDownRight size={13} />}
                  <span>{stat.change}</span>
                </div>
              </div>
            </div>
          )
        })}
      </div>

      {/* ── Revenue Chart ─────────────────────────────── */}
      <div className="panel-card">
        <div className="panel-head">
          <div>
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
              <TrendingUp size={20} style={{ color: 'var(--accent)' }} />
              Revenue Performance
            </h3>
            <p className="muted" style={{ fontSize: '0.8rem', marginTop: '0.2rem' }}>14-day rolling sales analytics</p>
          </div>
          <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--primary)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Today</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <div style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--accent)' }} />
              <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)' }}>Previous</span>
            </div>
          </div>
        </div>
        <div style={{ height: 300 }}>
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
              <XAxis
                dataKey="date"
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-subtle)', fontSize: 11, fontWeight: 500 }}
                dy={10}
                tickFormatter={v => {
                  const d = new Date(v)
                  return d.toLocaleDateString('en-US', { weekday: 'short' })
                }}
                interval={1}
              />
              <YAxis
                axisLine={false}
                tickLine={false}
                tick={{ fill: 'var(--text-subtle)', fontSize: 11 }}
                tickFormatter={v => v >= 1000 ? `${(v / 1000).toFixed(0)}k` : String(v)}
                width={45}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'var(--border)', opacity: 0.5 }} />
              <Bar dataKey="total" radius={[8, 8, 0, 0]} barSize={28}>
                {chartData.map((entry, i) => {
                  const isToday = entry.date === toISODate(new Date())
                  return (
                    <Cell
                      key={`cell-${i}`}
                      fill={isToday ? 'var(--primary)' : 'var(--accent)'}
                      fillOpacity={isToday ? 1 : 0.75}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* ── Bottom Grid ────────────────────────────────── */}
      <div className="panel-grid">
        {/* Latest Sales */}
        <div className="panel-card">
          <div className="panel-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
              <ShoppingCart size={18} style={{ color: '#10b981' }} />
              Latest Sales
            </h3>
            <button
              className="ghost-button"
              onClick={() => navigate('/sales')}
              style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)' }}
            >
              View All <ChevronRight size={14} />
            </button>
          </div>
          {latestSales.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 0' }}>
              <ShoppingCart size={36} />
              <p>No sales yet today</p>
            </div>
          ) : (
            <div className="list-stack">
              {latestSales.map(s => (
                <div key={s.id} className="list-item">
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: 'var(--bg-main)', display: 'grid', placeItems: 'center', color: 'var(--primary)',
                    }}>
                      <ShoppingCart size={17} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.customerName || 'Walk-in'}</p>
                      <p className="muted" style={{ fontSize: '0.7rem', fontFamily: 'monospace' }}>{s.invoiceNumber}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, color: '#10b981', fontSize: '0.95rem' }}>
                      +RWF {s.totalAmount.toLocaleString()}
                    </p>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>{relativeTime(s.createdAt)}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Stock Watchlist */}
        <div className="panel-card">
          <div className="panel-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
              <Package size={18} style={{ color: '#ef4444' }} />
              Stock Watchlist
            </h3>
            {lowStockProducts.length > 0 && (
              <span className="badge badge-danger">⚠ Action Needed</span>
            )}
          </div>
          {lowStockProducts.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 0' }}>
              <div style={{ width: 44, height: 44, borderRadius: '50%', background: '#dcfce7', color: '#166534', display: 'grid', placeItems: 'center', margin: '0 auto' }}>
                <Boxes size={22} />
              </div>
              <p style={{ fontWeight: 700, color: '#166534', margin: '0.5rem 0 0.2rem' }}>All levels healthy</p>
              <p className="muted" style={{ fontSize: '0.82rem' }}>No restock required right now</p>
            </div>
          ) : (
            <div className="list-stack">
              {lowStockProducts.map(p => (
                <div key={p.id} className="list-item">
                  <div>
                    <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{p.name}</p>
                    <p className="muted" style={{ fontSize: '0.72rem' }}>{p.categoryName}</p>
                  </div>
                  <span className={`badge ${p.currentQuantity === 0 ? 'badge-danger' : 'badge-warning'}`}>
                    {p.currentQuantity === 0 ? 'Out of stock' : `${p.currentQuantity} ${p.unit}`}
                  </span>
                </div>
              ))}
            </div>
          )}
          <button
            className="ghost-button"
            onClick={() => navigate('/products')}
            style={{ width: '100%', marginTop: '1rem', fontSize: '0.82rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', border: '1px solid var(--border)' }}
          >
            Manage Inventory <ChevronRight size={14} />
          </button>
        </div>
      </div>
    </section>
  )
}
