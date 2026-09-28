import React, { useState } from 'react'
import { api } from '../lib/api'
import { X, KeyRound, Lock, Eye, EyeOff, Sparkles, Loader2, CheckCircle2 } from 'lucide-react'
import type { SBSUser } from '../types'
import { useToast } from '../context/ToastContext'

interface Props {
  user: SBSUser
  onSuccess: () => void
  onCancel: () => void
}

export default function PasswordResetModal({ user, onSuccess, onCancel }: Props) {
  const { toast } = useToast()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const generatePassword = () => {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789'
    let pwd = ''
    for (let i = 0; i < 8; i++) {
      pwd += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    const generated = `Sbs@${pwd}!`
    setNewPassword(generated)
    setConfirmPassword(generated)
    setShowPassword(true)
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (newPassword.length < 6) {
      setError('Password must be at least 6 characters long.')
      return
    }

    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setSaving(true)
    try {
      await api.post(`/api/admin/users/${user.id}/reset-password`, { newPassword })
      toast.success(
        'Password Reset Successful',
        `A new password has been set for ${user.name}. They can now log in.`
      )
      onSuccess()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to reset password.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 110 }}>
      <div className="modal-card" style={{ maxWidth: '480px' }}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.25rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="stat-icon" style={{ background: '#f59e0b', color: 'white', width: '38px', height: '38px', borderRadius: '10px' }}>
              <KeyRound size={20} />
            </div>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0 }}>Reset User Password</h3>
              <p className="muted" style={{ fontSize: '0.75rem', margin: 0, marginTop: '2px' }}>Assign a new password for forgotten credentials</p>
            </div>
          </div>
          <button className="ghost-button icon-btn" onClick={onCancel} style={{ background: '#f1f5f9' }}>
            <X size={18} />
          </button>
        </div>

        {/* Target User Summary */}
        <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '14px', border: '1px solid var(--border)', marginBottom: '1.25rem' }}>
          <p className="eyebrow" style={{ fontSize: '0.65rem', marginBottom: '0.3rem' }}>Account</p>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <p style={{ fontWeight: 800, margin: 0, fontSize: '0.95rem', color: 'var(--primary)' }}>{user.name}</p>
              <p className="muted" style={{ fontSize: '0.78rem', margin: 0 }}>@{user.username} • {user.email}</p>
            </div>
            <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--primary)', fontWeight: 800, fontSize: '0.7rem' }}>
              {user.role}
            </span>
          </div>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gap: '1rem' }}>
            <div className="field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem' }}>
                <label className="eyebrow" style={{ margin: 0 }}>New Password</label>
                <button
                  type="button"
                  onClick={generatePassword}
                  style={{
                    border: 'none',
                    background: 'none',
                    color: 'var(--accent)',
                    fontWeight: 700,
                    fontSize: '0.75rem',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.3rem'
                  }}
                >
                  <Sparkles size={13} /> Auto-Generate
                </button>
              </div>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter at least 6 characters"
                  required
                  style={{ paddingLeft: '2.4rem', paddingRight: '2.5rem', width: '100%', fontSize: '0.95rem' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(p => !p)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#9ca3af',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className="field-group">
              <label className="eyebrow" style={{ marginBottom: '0.35rem' }}>Confirm New Password</label>
              <div style={{ position: 'relative' }}>
                <Lock size={15} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input
                  className="input-field"
                  type={showPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Re-type new password"
                  required
                  style={{ paddingLeft: '2.4rem', width: '100%', fontSize: '0.95rem' }}
                />
              </div>
            </div>
          </div>

          {error && (
            <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fee2e2', marginTop: '1rem' }}>
              <X size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
              <p style={{ fontSize: '0.8rem', color: '#b91c1c', margin: 0, fontWeight: 600 }}>{error}</p>
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '1.5rem', paddingTop: '1.25rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="ghost-button" onClick={onCancel} style={{ padding: '0.75rem 1.25rem' }}>
              Cancel
            </button>
            <button
              type="submit"
              className="primary-button"
              disabled={saving || !newPassword}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.5rem',
                padding: '0.75rem 1.75rem',
                background: '#f59e0b',
                color: 'white',
                fontWeight: 800,
                boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)',
                border: 'none'
              }}
            >
              {saving ? <Loader2 className="animate-spin" size={17} /> : <CheckCircle2 size={17} />}
              Update Password
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
