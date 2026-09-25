import React, { useState } from 'react'
import { api } from '../lib/api'
import { X, Save, UserPlus, Mail, Fingerprint, KeyRound, Shield, Loader2 } from 'lucide-react'

interface Props {
  onSaved: (user: any) => void
  onCancel: () => void
}

export default function UserForm({ onSaved, onCancel }: Props) {
  const [form, setForm] = useState({
    name: '',
    email: '',
    username: '',
    role: 'SELLER',
    password: '',
  })
  
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const set = (key: string, value: string) => setForm((f) => ({ ...f, [key]: value }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const res = await api.post('/api/admin/users', form)
      onSaved(res.data.user)
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to create user.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 100 }}>
      <div className="modal-card" style={{ maxWidth: '500px' }}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: '36px', height: '36px' }}>
              <UserPlus size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>Register New Team Member</h3>
          </div>
          <button className="ghost-button icon-btn" onClick={onCancel}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gap: '1.25rem' }}>
            <p className="eyebrow">Personal Information</p>
            
            <div className="field-group">
              <label>Full Name</label>
              <input 
                className="input-field" 
                value={form.name} 
                onChange={(e) => set('name', e.target.value)} 
                required 
                placeholder="e.g. John Doe" 
              />
            </div>

            <div className="field-group">
              <label>Email Address</label>
              <div style={{ position: 'relative' }}>
                <Mail size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  className="input-field" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }} 
                  type="email" 
                  value={form.email} 
                  onChange={(e) => set('email', e.target.value)} 
                  required 
                  placeholder="john@sbs.rw" 
                />
              </div>
            </div>

            <p className="eyebrow" style={{ marginTop: '0.5rem' }}>Account Security</p>

            <div className="field-group">
              <label>Login Username</label>
              <div style={{ position: 'relative' }}>
                <Fingerprint size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  className="input-field" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }} 
                  value={form.username} 
                  onChange={(e) => set('username', e.target.value)} 
                  required 
                  placeholder="johndoe" 
                />
              </div>
            </div>

            <div className="field-group">
              <label>Temporary Password</label>
              <div style={{ position: 'relative' }}>
                <KeyRound size={14} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  className="input-field" 
                  style={{ paddingLeft: '2.5rem', width: '100%' }} 
                  type="password" 
                  value={form.password} 
                  onChange={(e) => set('password', e.target.value)} 
                  placeholder="••••••••" 
                />
              </div>
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Shield size={14} /> System Access Role</label>
              <select className="input-field" value={form.role} onChange={(e) => set('role', e.target.value)} required>
                <option value="SELLER">Staff / Seller (Sales Only)</option>
                <option value="MANAGER">Store Manager (Inventory + Reports)</option>
                <option value="SUPER_ADMIN">System Administrator (Full Control)</option>
              </select>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fee2e2', marginTop: '1.5rem' }}>
              <X size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8rem', color: '#b91c1c' }}>{error}</p>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="ghost-button" onClick={onCancel} style={{ padding: '0.8rem 1.5rem' }}>
              Discard
            </button>
            <button 
              type="submit" 
              className="primary-button" 
              disabled={saving} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 2rem', background: 'var(--primary)', color: 'white' }}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              Create System Account
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
