import { useState, useEffect } from 'react'
import {
  BadgeCheck, Boxes, CircleDollarSign, Wallet,
  PieChart, Plus, Receipt, Loader2, Calendar,
  X, Tag, FileText,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts'
import { api } from '../lib/api'
import type { Expense } from '../types'

const EXPENSE_CATEGORIES = ['Rent', 'Electricity', 'Water', 'Salaries', 'Marketing', 'Transport', 'Maintenance', 'Supplies', 'Other']

export default function FinancePage() {
  const { finance, refreshAll, isManager } = useAuth()
  const { toast } = useToast()
  const [showExpenseModal, setShowExpenseModal] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [form, setForm] = useState({
    category: 'Rent',
    amount: '',
    note: '',
    date: new Date().toISOString().split('T')[0],
  })
  const [saving, setSaving] = useState(false)

  const fetchExpenses = async () => {
    try {
      const res = await api.get('/api/finance/expenses')
      setExpenses(res.data.data || [])
    } catch { /* non-critical */ }
  }

  useEffect(() => { fetchExpenses() }, [])

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!form.amount || Number(form.amount) <= 0) {
      toast.warning('Invalid Amount', 'Please enter a valid expense amount.')
      return
    }
    setSaving(true)
    try {
      await api.post('/api/finance/expenses', form)
      setShowExpenseModal(false)
      setForm({ category: 'Rent', amount: '', note: '', date: new Date().toISOString().split('T')[0] })
      await Promise.all([fetchExpenses(), refreshAll()])
      toast.success('Expense Recorded', `${form.category} expense of RWF ${Number(form.amount).toLocaleString()} saved.`)
    } catch {
      toast.error('Save Failed', 'Could not record the expense. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  // ── Derived Trend (current period vs prior data) ───────────────────────
  const totalRevenue = finance?.revenue ?? 0
  const totalExpenses = finance?.expenses ?? 0
  const netProfit = finance?.netProfit ?? 0
  const stockValue = finance?.stockValue ?? 0
  const margin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100).toFixed(1) : '0'

  const pieData = [
    { name: 'Inventory Value', value: stockValue,    color: '#3b82f6' },
    { name: 'Revenue',         value: totalRevenue,  color: '#10b981' },
    { name: 'Expenses',        value: totalExpenses, color: '#ef4444' },
  ].filter(d => d.value > 0)

  const cards = [
    { title: 'Total Revenue',    value: totalRevenue,  icon: CircleDollarSign, color: '#10b981', bg: '#d1fae5', note: 'Gross sales' },
    { title: 'Total Expenses',   value: totalExpenses, icon: Wallet,           color: '#ef4444', bg: '#fee2e2', note: 'Recorded outflows' },
    { title: 'Net Profit',       value: netProfit,     icon: BadgeCheck,       color: '#8b5cf6', bg: '#ede9fe', note: `${margin}% margin` },
    { title: 'Inventory Value',  value: stockValue,    icon: Boxes,            color: '#3b82f6', bg: '#dbeafe', note: 'At buying price' },
  ]

  return (
    <section className="content-stack animate-fade-in">
      {/* ── Add Expense Modal ────────────────────────────────────────────── */}
      {showExpenseModal && (
        <div className="modal-overlay animate-fade-in" style={{ zIndex: 100 }}>
          <div className="modal-card" style={{ maxWidth: 480 }}>
            <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: 38, height: 38 }}>
                  <Receipt size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.15rem', fontWeight: 800 }}>Record Expense</h3>
                  <p className="muted" style={{ fontSize: '0.8rem' }}>Log a business outflow</p>
                </div>
              </div>
              <button className="ghost-button icon-btn" onClick={() => setShowExpenseModal(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleAddExpense} className="form-grid">
              <div className="field-group">
                <label><Tag size={13} /> Category</label>
                <select className="input-field" value={form.category} onChange={e => setForm({ ...form, category: e.target.value })}>
                  {EXPENSE_CATEGORIES.map(cat => <option key={cat}>{cat}</option>)}
                </select>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="field-group">
                  <label><CircleDollarSign size={13} /> Amount (RWF)</label>
                  <input
                    className="input-field"
                    type="number"
                    required
                    min="1"
                    value={form.amount}
                    onChange={e => setForm({ ...form, amount: e.target.value })}
                    placeholder="0"
                  />
                </div>
                <div className="field-group">
                  <label><Calendar size={13} /> Date</label>
                  <input
                    className="input-field"
                    type="date"
                    required
                    value={form.date}
                    onChange={e => setForm({ ...form, date: e.target.value })}
                  />
                </div>
              </div>
              <div className="field-group">
                <label><FileText size={13} /> Description</label>
                <textarea
                  className="input-field"
                  style={{ minHeight: 80, resize: 'none' }}
                  value={form.note}
                  onChange={e => setForm({ ...form, note: e.target.value })}
                  placeholder="e.g. Monthly rent payment for June…"
                />
              </div>
              <div className="form-actions" style={{ paddingTop: '1rem', borderTop: '1px solid var(--border)' }}>
                <button type="button" className="ghost-button" style={{ padding: '0.75rem 1.5rem' }} onClick={() => setShowExpenseModal(false)}>
                  Cancel
                </button>
                <button
                  className="primary-button"
                  disabled={saving}
                  style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.75rem 2rem', background: 'var(--primary)', color: 'white' }}
                >
                  {saving ? <Loader2 className="animate-spin" size={16} /> : <Plus size={16} />}
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Header ──────────────────────────────────────────────────────── */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Financial Performance</h1>
          <p className="muted" style={{ marginTop: '0.25rem' }}>Real-time tracking of revenue, costs, and inventory assets</p>
        </div>
        {isManager && (
          <button
            className="primary-button"
            style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', padding: '0.8rem 1.5rem', background: 'var(--primary)', color: 'white', boxShadow: '0 8px 20px rgba(35,65,95,0.25)' }}
            onClick={() => setShowExpenseModal(true)}
          >
            <Plus size={18} /> Record Expense
          </button>
        )}
      </header>

      {/* ── KPI Cards ───────────────────────────────────────────────────── */}
      <div className="stats-grid">
        {cards.map((card) => (
          <div key={card.title} className="stat-card">
            <div className="stat-icon" style={{ background: card.bg, color: card.color }}>
              <card.icon size={22} />
            </div>
            <div style={{ flex: 1 }}>
              <p className="muted" style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{card.title}</p>
              <h3 style={{ fontSize: '1.45rem', fontWeight: 900, margin: '0.15rem 0', letterSpacing: '-0.02em' }}>
                RWF {card.value.toLocaleString()}
              </h3>
              <p style={{ fontSize: '0.72rem', color: 'var(--text-subtle)', fontWeight: 500 }}>{card.note}</p>
            </div>
          </div>
        ))}
      </div>

      {/* ── Charts + Expenses ────────────────────────────────────────────── */}
      <div className="panel-grid">
        {/* Pie Chart */}
        <div className="panel-card">
          <div className="panel-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
              <PieChart size={18} style={{ color: 'var(--primary)' }} /> Capital Distribution
            </h3>
          </div>
          {pieData.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 0' }}>
              <PieChart size={40} />
              <p>No financial data yet</p>
            </div>
          ) : (
            <div style={{ height: 280 }}>
              <ResponsiveContainer width="100%" height="100%">
                <RePieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={65} outerRadius={90} paddingAngle={6} dataKey="value">
                    {pieData.map((entry, i) => <Cell key={i} fill={entry.color} stroke="none" />)}
                  </Pie>
                  <Tooltip
                    contentStyle={{ borderRadius: 14, border: 'none', boxShadow: 'var(--shadow-lg)', background: 'var(--bg-card)', color: 'var(--text-main)' }}
                    formatter={(value) => `RWF ${Number(value).toLocaleString()}`}
                  />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" />
                </RePieChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Summary rows */}
          <div className="list-stack" style={{ marginTop: '1rem' }}>
            {cards.slice(0, 3).map(c => (
              <div key={c.title} className="list-item" style={{ padding: '0.65rem 0.75rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                  <div style={{ width: 10, height: 10, borderRadius: '50%', background: c.color }} />
                  <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{c.title}</span>
                </div>
                <span style={{ fontWeight: 800, fontSize: '0.9rem', color: c.color }}>
                  RWF {c.value.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Recent Expenses */}
        <div className="panel-card">
          <div className="panel-head">
            <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 800 }}>
              <Receipt size={18} style={{ color: '#ef4444' }} /> Recent Expenses
            </h3>
            <span className="badge badge-danger">{expenses.length} total</span>
          </div>
          {expenses.length === 0 ? (
            <div className="empty-state" style={{ padding: '2.5rem 0' }}>
              <Receipt size={36} />
              <p>No expenses recorded</p>
              {isManager && (
                <button className="ghost-button" style={{ fontSize: '0.82rem', marginTop: '0.5rem' }} onClick={() => setShowExpenseModal(true)}>
                  Record first expense
                </button>
              )}
            </div>
          ) : (
            <div className="list-stack">
              {expenses.slice(0, 7).map((exp) => (
                <div key={exp.id} className="list-item" style={{ padding: '0.85rem 1rem' }}>
                  <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
                    <div className="stat-icon" style={{ width: 36, height: 36, background: '#fef2f2', color: '#ef4444', borderRadius: 10 }}>
                      <Receipt size={15} />
                    </div>
                    <div>
                      <p style={{ fontWeight: 700, fontSize: '0.9rem' }}>{exp.category}</p>
                      <p className="muted" style={{ fontSize: '0.72rem' }}>{exp.note || 'No description'}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ fontWeight: 800, color: '#ef4444', fontSize: '0.95rem' }}>
                      −RWF {exp.amount.toLocaleString()}
                    </p>
                    <p className="muted" style={{ fontSize: '0.7rem' }}>
                      {new Date(exp.date).toLocaleDateString(undefined, { day: 'numeric', month: 'short' })}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
