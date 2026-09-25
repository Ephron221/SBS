import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { AlertTriangle, X } from 'lucide-react'

interface ConfirmOptions {
  title: string
  message: string
  confirmLabel?: string
  danger?: boolean
}

interface ConfirmContextValue {
  confirm: (opts: ConfirmOptions) => Promise<boolean>
}

const ConfirmContext = createContext<ConfirmContextValue>(null!)
export const useConfirm = () => useContext(ConfirmContext)

interface PendingConfirm extends ConfirmOptions {
  resolve: (value: boolean) => void
}

export function ConfirmProvider({ children }: { children: ReactNode }) {
  const [pending, setPending] = useState<PendingConfirm | null>(null)

  const confirm = useCallback((opts: ConfirmOptions): Promise<boolean> => {
    return new Promise((resolve) => {
      setPending({ ...opts, resolve })
    })
  }, [])

  const handleClose = (value: boolean) => {
    pending?.resolve(value)
    setPending(null)
  }

  return (
    <ConfirmContext.Provider value={{ confirm }}>
      {children}
      {pending && (
        <div
          className="modal-overlay animate-fade-in"
          onClick={() => handleClose(false)}
          style={{ zIndex: 200 }}
        >
          <div
            className="modal-card"
            onClick={(e) => e.stopPropagation()}
            style={{
              maxWidth: '440px',
              padding: '2rem',
              display: 'flex',
              flexDirection: 'column',
              gap: '1.5rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                <div style={{
                  width: '48px', height: '48px', borderRadius: '14px',
                  background: pending.danger ? '#fee2e2' : '#fef9c3',
                  color: pending.danger ? '#dc2626' : '#d97706',
                  display: 'grid', placeItems: 'center', flexShrink: 0,
                }}>
                  <AlertTriangle size={24} />
                </div>
                <div>
                  <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>{pending.title}</h3>
                </div>
              </div>
              <button
                className="ghost-button icon-btn"
                onClick={() => handleClose(false)}
                style={{ background: '#f1f5f9' }}
              >
                <X size={18} />
              </button>
            </div>

            <p style={{ margin: 0, color: 'var(--text-muted)', lineHeight: 1.6, fontSize: '0.95rem' }}>
              {pending.message}
            </p>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button
                className="ghost-button"
                onClick={() => handleClose(false)}
                style={{ padding: '0.75rem 1.5rem', fontWeight: 600 }}
              >
                Cancel
              </button>
              <button
                className="primary-button"
                onClick={() => handleClose(true)}
                style={{
                  padding: '0.75rem 1.75rem',
                  background: pending.danger ? '#dc2626' : 'var(--primary)',
                  color: 'white',
                  boxShadow: pending.danger
                    ? '0 4px 12px rgba(220,38,38,0.3)'
                    : '0 4px 12px rgba(35,65,95,0.3)',
                }}
              >
                {pending.confirmLabel ?? 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  )
}
