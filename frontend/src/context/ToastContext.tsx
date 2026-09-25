import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'

export type ToastType = 'success' | 'error' | 'warning' | 'info'

export interface Toast {
  id: string
  type: ToastType
  title: string
  message?: string
}

interface ToastContextValue {
  toasts: Toast[]
  toast: {
    success: (title: string, message?: string) => void
    error: (title: string, message?: string) => void
    warning: (title: string, message?: string) => void
    info: (title: string, message?: string) => void
  }
  dismiss: (id: string) => void
}

const ToastContext = createContext<ToastContextValue>(null!)
export const useToast = () => useContext(ToastContext)

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])

  const add = useCallback((type: ToastType, title: string, message?: string) => {
    const id = Math.random().toString(36).slice(2)
    setToasts(prev => [...prev, { id, type, title, message }])
    setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), 4000)
  }, [])

  const dismiss = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id))
  }, [])

  const toast = {
    success: (title: string, message?: string) => add('success', title, message),
    error: (title: string, message?: string) => add('error', title, message),
    warning: (title: string, message?: string) => add('warning', title, message),
    info: (title: string, message?: string) => add('info', title, message),
  }

  return (
    <ToastContext.Provider value={{ toasts, toast, dismiss }}>
      {children}
      <ToastContainer toasts={toasts} dismiss={dismiss} />
    </ToastContext.Provider>
  )
}

const ICONS: Record<ToastType, string> = {
  success: '✓',
  error: '✕',
  warning: '⚠',
  info: 'ℹ',
}

const COLORS: Record<ToastType, { bg: string; border: string; icon: string; text: string }> = {
  success: { bg: '#f0fdf4', border: '#bbf7d0', icon: '#16a34a', text: '#166534' },
  error:   { bg: '#fef2f2', border: '#fecaca', icon: '#dc2626', text: '#991b1b' },
  warning: { bg: '#fffbeb', border: '#fde68a', icon: '#d97706', text: '#92400e' },
  info:    { bg: '#eff6ff', border: '#bfdbfe', icon: '#2563eb', text: '#1e40af' },
}

function ToastContainer({ toasts, dismiss }: { toasts: Toast[]; dismiss: (id: string) => void }) {
  if (toasts.length === 0) return null
  return (
    <div style={{
      position: 'fixed',
      top: '1.5rem',
      right: '1.5rem',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      gap: '0.75rem',
      maxWidth: '400px',
      width: 'calc(100vw - 3rem)',
    }}>
      {toasts.map(t => {
        const c = COLORS[t.type]
        return (
          <div
            key={t.id}
            className="toast-item"
            style={{
              background: c.bg,
              border: `1px solid ${c.border}`,
              borderRadius: '14px',
              padding: '1rem 1.25rem',
              display: 'flex',
              alignItems: 'flex-start',
              gap: '0.75rem',
              boxShadow: '0 10px 30px rgba(0,0,0,0.1)',
              animation: 'toastIn 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards',
            }}
          >
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%',
              background: c.icon, color: 'white',
              display: 'grid', placeItems: 'center',
              fontWeight: 700, fontSize: '0.9rem', flexShrink: 0,
            }}>
              {ICONS[t.type]}
            </div>
            <div style={{ flex: 1 }}>
              <p style={{ margin: 0, fontWeight: 700, color: c.text, fontSize: '0.9rem' }}>{t.title}</p>
              {t.message && <p style={{ margin: '0.2rem 0 0', color: c.text, fontSize: '0.8rem', opacity: 0.85 }}>{t.message}</p>}
            </div>
            <button
              onClick={() => dismiss(t.id)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: c.text, opacity: 0.5, fontSize: '1.1rem', lineHeight: 1,
                padding: '0', flexShrink: 0,
              }}
            >×</button>
          </div>
        )
      })}
    </div>
  )
}
