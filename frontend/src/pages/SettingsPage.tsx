import { useState, useEffect } from 'react'
import { Store, MapPin, Percent, DollarSign, Save, Loader2, ShieldCheck, Globe, Building2, BellRing, Info } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import { SkeletonPage } from '../components/Skeleton'

export default function SettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    shopName: '',
    address: '',
    taxRate: 0,
    currency: 'RWF'
  })

  useEffect(() => {
    api.get('/api/business')
      .then(res => {
        if (res.data.data) {
          setForm(res.data.data)
        }
      })
      .catch(() => {
        toast.error('Failed to load settings', 'Using default settings.')
      })
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      await api.put('/api/business', form)
      toast.success('Settings Saved', 'Business configuration updated successfully.')
    } catch {
      toast.error('Update Failed', 'Failed to update settings. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  if (loading) return <SkeletonPage />

  return (
    <section className="content-stack animate-fade-in">
      <header style={{ marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Global Settings</h1>
        <p className="muted">Master configuration for boutique branding and regional parameters</p>
      </header>

      <div className="panel-grid" style={{ gridTemplateColumns: '1fr minmax(320px, 380px)', alignItems: 'start' }}>
        <div className="panel-card" style={{ padding: '2rem' }}>
          <div className="panel-head" style={{ marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
              <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: '40px', height: '40px' }}>
                <Building2 size={20} />
              </div>
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 800 }}>Business Profile</h3>
                <p className="muted" style={{ fontSize: '0.8rem' }}>Identity & Taxation</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSave} className="form-grid" style={{ gap: '1.5rem' }}>
            <div className="field-group">
              <label><Store size={14} /> Boutique Legal Name</label>
              <input
                className="input-field"
                value={form.shopName}
                onChange={e => setForm({...form, shopName: e.target.value})}
                required
                placeholder="e.g. Smart Boutique Ltd"
              />
            </div>

            <div className="field-group">
              <label><MapPin size={14} /> Physical Address</label>
              <textarea
                className="input-field"
                style={{ minHeight: '80px', resize: 'none' }}
                value={form.address}
                onChange={e => setForm({...form, address: e.target.value})}
                required
                placeholder="e.g. Kigali Heights, Floor 2, Kigali, Rwanda"
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
              <div className="field-group">
                <label><DollarSign size={14} /> Base Currency</label>
                <div style={{ position: 'relative' }}>
                  <Globe size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
                  <input
                    className="input-field"
                    style={{ paddingLeft: '2.5rem', background: 'var(--bg-main)' }}
                    value={form.currency}
                    disabled
                    title="Currency cannot be changed after setup"
                  />
                </div>
              </div>
              <div className="field-group">
                <label><Percent size={14} /> Standard Tax Rate (%)</label>
                <input
                  className="input-field"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={form.taxRate}
                  onChange={e => setForm({...form, taxRate: Number(e.target.value)})}
                />
              </div>
            </div>

            <div style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button
                className="primary-button"
                disabled={saving}
                style={{
                  width: '100%',
                  height: '52px',
                  display: 'flex',
                  justifyContent: 'center',
                  alignItems: 'center',
                  gap: '0.75rem',
                  fontSize: '1rem',
                  background: 'var(--primary)',
                  color: 'white',
                  boxShadow: '0 8px 24px rgba(35, 65, 95, 0.25)'
                }}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : <Save size={20} />}
                Update Master Settings
              </button>
            </div>
          </form>
        </div>

        <div style={{ display: 'grid', gap: '1.5rem' }}>
          <div className="panel-card" style={{ padding: '1.5rem' }}>
            <div className="panel-head" style={{ marginBottom: '1.25rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1.1rem', fontWeight: 800 }}>
                <ShieldCheck size={20} style={{ color: '#16a34a' }} /> System Health
              </h3>
            </div>
            <div className="list-stack">
              <div className="list-item" style={{ background: 'var(--bg-main)', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Database Status</span>
                </div>
                <span className="badge badge-success" style={{ fontSize: '0.65rem' }}>Connected</span>
              </div>
              <div className="list-item" style={{ background: 'var(--bg-main)', padding: '0.85rem 1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
                  <span style={{ fontSize: '0.9rem', fontWeight: 600 }}>Security Protocol</span>
                </div>
                <span style={{ fontSize: '0.75rem', fontWeight: 700 }} className="muted">JWT + bcrypt</span>
              </div>
            </div>
            <div style={{ marginTop: '1.25rem', display: 'flex', gap: '0.75rem', padding: '0.9rem', background: 'var(--bg-main)', borderRadius: '12px', border: '1px solid var(--border)' }}>
              <Info size={18} style={{ color: 'var(--primary)', flexShrink: 0, marginTop: '2px' }} />
              <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                Settings modified here will reflect on all invoices, reports, and system-wide financial calculations.
              </p>
            </div>
          </div>

          <div className="panel-card" style={{ padding: '1.5rem', background: 'linear-gradient(135deg, var(--sidebar-bg), #1a2234)', color: 'white', border: 'none' }}>
            <div className="panel-head">
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', color: 'white', fontWeight: 800 }}>
                <BellRing size={20} style={{ color: 'var(--accent)' }} /> Security & Alerts
              </h3>
            </div>
            <p style={{ fontSize: '0.85rem', opacity: 0.85, lineHeight: 1.5, marginBottom: '1rem' }}>
              All administrative actions and sales activity are tracked in the real-time audit log.
            </p>
            <div style={{ fontSize: '0.78rem', opacity: 0.7 }}>
              Role: SUPER_ADMIN Protected
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}
