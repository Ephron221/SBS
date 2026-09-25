import { useState } from 'react'
import { ShieldCheck, Lock, Mail, Loader2, Eye, EyeOff, ChevronRight } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

export default function LoginPage() {
  const { login, loginError, loginLoading } = useAuth()
  const [form, setForm] = useState({ email: '', password: '' })
  const [showPassword, setShowPassword] = useState(false)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    login(form.email, form.password)
  }

  return (
    <div className="shell auth-shell animate-fade-in">
      <div className="auth-card">
        {/* Brand */}
        <div style={{ marginBottom: '2rem' }}>
          <div className="brand-mark" style={{ width: 56, height: 56, marginBottom: '1.25rem' }}>
            <ShieldCheck size={28} />
          </div>
          <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.4rem' }}>
            Smart Boutique System
          </p>
          <h1 style={{ fontSize: '1.85rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>
            Welcome back
          </h1>
          <p className="muted" style={{ marginTop: '0.4rem', fontSize: '0.9rem' }}>
            Sign in to manage your boutique
          </p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          {/* Email */}
          <div className="field-group">
            <label>Email Address</label>
            <div style={{ position: 'relative' }}>
              <Mail size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
              <input
                className="input-field"
                style={{ paddingLeft: '2.6rem' }}
                type="email"
                placeholder="name@company.com"
                value={form.email}
                onChange={e => setForm({ ...form, email: e.target.value })}
                autoComplete="email"
                required
              />
            </div>
          </div>

          {/* Password */}
          <div className="field-group">
            <label>Password</label>
            <div className="password-wrap">
              <Lock size={16} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
              <input
                className="input-field"
                style={{ paddingLeft: '2.6rem', paddingRight: '2.8rem' }}
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={form.password}
                onChange={e => setForm({ ...form, password: e.target.value })}
                autoComplete="current-password"
                required
              />
              <button
                type="button"
                className="toggle-pw"
                onClick={() => setShowPassword(v => !v)}
                tabIndex={-1}
                title={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          {/* Error */}
          {loginError && (
            <div className="animate-fade-in" style={{
              padding: '0.85rem 1rem',
              background: '#fef2f2',
              border: '1px solid #fecaca',
              borderRadius: 'var(--radius-md)',
              color: '#991b1b',
              fontSize: '0.875rem',
              fontWeight: 600,
            }}>
              {loginError}
            </div>
          )}

          {/* Submit */}
          <button
            type="submit"
            className="primary-button"
            disabled={loginLoading}
            style={{
              marginTop: '0.5rem',
              width: '100%',
              height: '52px',
              fontSize: '1rem',
              display: 'flex',
              justifyContent: 'center',
              alignItems: 'center',
              gap: '0.6rem',
              background: 'var(--primary)',
              color: 'white',
              boxShadow: '0 8px 24px rgba(35, 65, 95, 0.3)',
            }}
          >
            {loginLoading ? (
              <><Loader2 size={18} className="animate-spin" /> Signing in…</>
            ) : (
              <>Sign in to Dashboard <ChevronRight size={18} /></>
            )}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '2.25rem' }}>
          <p className="muted" style={{ margin: 0, fontSize: '0.78rem' }}>
            © {new Date().getFullYear()} Smart Boutique System. All rights reserved.
          </p>
          <p style={{ margin: '0.35rem 0 0', fontSize: '0.78rem', color: 'var(--text-subtle)', fontWeight: 500 }}>
            Developed by <span style={{ color: 'var(--accent)', fontWeight: 600 }}>Mr. ESron</span>
          </p>
        </div>
      </div>
    </div>
  )
}
