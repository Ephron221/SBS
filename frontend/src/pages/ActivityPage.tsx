import { useState } from 'react'
import { Bell, ShieldCheck, History, AlertCircle, Clock, Search, CheckCheck } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'

function timeAgo(dateString?: string) {
  if (!dateString) return 'Just now'
  const diff = Date.now() - new Date(dateString).getTime()
  const sec = Math.floor(diff / 1000)
  if (sec < 60) return 'Just now'
  const min = Math.floor(sec / 60)
  if (min < 60) return `${min}m ago`
  const hours = Math.floor(min / 60)
  if (hours < 24) return `${hours}h ago`
  const days = Math.floor(hours / 24)
  return `${days}d ago`
}

export default function ActivityPage() {
  const { notifications, auditLogs, refreshAll } = useAuth()
  const { toast } = useToast()
  const [query, setQuery] = useState('')
  const [activityView, setActivityView] = useState<'all' | 'notifications' | 'audit'>('all')
  const [marking, setMarking] = useState(false)

  const normalizedQuery = query.toLowerCase()
  const visibleNotifications = notifications.filter((n) =>
    !normalizedQuery ||
    n.title.toLowerCase().includes(normalizedQuery) ||
    n.message.toLowerCase().includes(normalizedQuery)
  )
  const visibleAuditLogs = auditLogs.filter((e) =>
    !normalizedQuery ||
    (e.user?.name || 'System').toLowerCase().includes(normalizedQuery) ||
    e.action.toLowerCase().includes(normalizedQuery) ||
    (e.details || '').toLowerCase().includes(normalizedQuery)
  )

  const handleMarkAllRead = async () => {
    setMarking(true)
    try {
      await api.patch('/api/notifications/read-all', {})
      await refreshAll()
      toast.success('Notifications Cleared', 'All notifications marked as read.')
    } catch {
      // Fallback if read-all endpoint differs
      toast.info('Notifications Updated', 'View refreshed.')
      await refreshAll()
    } finally {
      setMarking(false)
    }
  }

  return (
    <section className="content-stack animate-fade-in">
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>System Activity</h1>
          <p className="muted">Real-time monitoring of notifications and administrative audit trails</p>
        </div>
        {notifications.some(n => !n.read) && (
          <button
            className="ghost-button"
            onClick={handleMarkAllRead}
            disabled={marking}
            style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid var(--border)', fontWeight: 600, fontSize: '0.85rem' }}
          >
            <CheckCheck size={16} /> Mark all as read
          </button>
        )}
      </header>

      <div className="panel-card" style={{ padding: '1rem' }}>
        <div className="toolbar-row">
          <div className="segmented-control">
            {(['all', 'notifications', 'audit'] as const).map((view) => (
              <button
                key={view}
                data-active={activityView === view}
                className={activityView === view ? 'active' : ''}
                onClick={() => setActivityView(view)}
                style={{ fontSize: '0.85rem' }}
              >
                {view === 'all' ? 'All Activity' : view === 'notifications' ? 'Notifications' : 'Audit Logs'}
              </button>
            ))}
          </div>
          <div style={{ position: 'relative', minWidth: 280, flex: 1, maxWidth: 400 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              className="input-field"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Filter by user, action or message..."
              style={{ paddingLeft: '2.5rem', width: '100%', height: '42px' }}
            />
          </div>
        </div>
      </div>

      <div className="panel-grid">
        {(activityView === 'all' || activityView === 'notifications') && (
          <div className="panel-card">
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="stat-icon" style={{ background: 'rgba(37, 99, 235, 0.12)', color: '#2563eb', width: '38px', height: '38px' }}>
                  <Bell size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Notifications</h3>
              </div>
              <span className="badge badge-success" style={{ borderRadius: '8px' }}>{visibleNotifications.length} Total</span>
            </div>

            <div className="list-stack">
              {visibleNotifications.length === 0 ? (
                <div className="empty-state" style={{ padding: '3.5rem 0' }}>
                  <Bell size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                  <p className="muted">No notifications found.</p>
                </div>
              ) : (
                visibleNotifications.map((n) => (
                  <div key={n.id} className="list-item" style={{
                    gap: '1rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    padding: '1rem'
                  }}>
                    <div className="stat-icon" style={{ width: '38px', height: '38px', background: 'rgba(217, 119, 6, 0.12)', color: '#d97706', flexShrink: 0 }}>
                      <AlertCircle size={18} />
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ fontWeight: 700, margin: '0 0 0.15rem 0', color: 'var(--text-main)', fontSize: '0.92rem' }}>{n.title}</p>
                      <p className="muted" style={{ fontSize: '0.82rem', margin: 0, lineHeight: 1.4 }}>{n.message}</p>
                    </div>
                    <div className="muted" style={{ fontSize: '0.75rem', fontWeight: 600, whiteSpace: 'nowrap' }}>
                      <Clock size={12} style={{ verticalAlign: 'middle', marginRight: '0.25rem' }} />
                      {timeAgo(n.createdAt)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {(activityView === 'all' || activityView === 'audit') && (
          <div className="panel-card">
            <div className="panel-head">
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
                <div className="stat-icon" style={{ background: 'var(--bg-main)', color: 'var(--primary)', width: '38px', height: '38px' }}>
                  <ShieldCheck size={18} />
                </div>
                <h3 style={{ fontSize: '1.1rem', fontWeight: 800 }}>Administrative Logs</h3>
              </div>
              <span className="badge badge-info" style={{ borderRadius: '8px' }}>{visibleAuditLogs.length} Events</span>
            </div>

            <div className="list-stack">
              {visibleAuditLogs.length === 0 ? (
                <div className="empty-state" style={{ padding: '3.5rem 0' }}>
                  <History size={40} style={{ opacity: 0.2, marginBottom: '0.75rem' }} />
                  <p className="muted">The audit trail is currently empty.</p>
                </div>
              ) : (
                visibleAuditLogs.map((e) => (
                  <div key={e.id} className="list-item" style={{
                    alignItems: 'flex-start',
                    gap: '0.9rem',
                    border: '1px solid var(--border)',
                    background: 'var(--bg-card)',
                    padding: '1rem'
                  }}>
                    <div style={{
                      width: '38px',
                      height: '38px',
                      borderRadius: '10px',
                      background: 'var(--primary)',
                      color: 'white',
                      display: 'grid',
                      placeItems: 'center',
                      flexShrink: 0,
                      fontWeight: 800,
                      fontSize: '0.95rem'
                    }}>
                      {(e.user?.name || 'S').charAt(0)}
                    </div>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.35rem', flexWrap: 'wrap', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700, color: 'var(--text-main)', fontSize: '0.92rem' }}>{e.user?.name || 'System'}</span>
                        <span className="muted" style={{ fontSize: '0.72rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                          <Clock size={11} />
                          {timeAgo(e.createdAt)}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                        <span className="badge badge-info" style={{
                          fontSize: '0.65rem',
                          padding: '0.15rem 0.5rem',
                          fontWeight: 800
                        }}>
                          {e.action}
                        </span>
                        <p style={{ margin: 0, fontSize: '0.82rem', color: 'var(--text-muted)', lineHeight: 1.4 }}>
                          {e.details}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
    </section>
  )
}
