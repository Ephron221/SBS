import { useState, useRef, useEffect, type ReactNode, useMemo, useCallback } from 'react'
import { NavLink, useNavigate, useLocation } from 'react-router-dom'
import {
  Bell, ClipboardList, LayoutDashboard, Menu, Package, Receipt,
  ShieldCheck, UserCog, Wallet, X, LogOut, Settings, Search,
  ChevronRight, FileText, Tag, ArrowRight, Sun, Moon, Clock,
} from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import { api } from '../lib/api'
import SaleInvoiceModal from './SaleInvoiceModal'
import type { Sale, NormalizedProduct } from '../types'

// ── Dark Mode Hook ─────────────────────────────────────────────────────────
function useDarkMode() {
  const [dark, setDark] = useState(() => {
    if (typeof window === 'undefined') return false
    const stored = localStorage.getItem('sbs-theme')
    if (stored) return stored === 'dark'
    return window.matchMedia('(prefers-color-scheme: dark)').matches
  })

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', dark ? 'dark' : 'light')
    localStorage.setItem('sbs-theme', dark ? 'dark' : 'light')
  }, [dark])

  return [dark, () => setDark(d => !d)] as const
}

// ── Live Clock ─────────────────────────────────────────────────────────────
function LiveClock() {
  const [time, setTime] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(id)
  }, [])
  return (
    <div className="clock-display">
      <Clock size={13} />
      {time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
    </div>
  )
}

// ── Time Greeting ──────────────────────────────────────────────────────────
function getGreeting(name: string) {
  const h = new Date().getHours()
  const g = h < 12 ? 'Good morning' : h < 18 ? 'Good afternoon' : 'Good evening'
  return `${g}, ${name.split(' ')[0]}`
}

// ── Main Layout ────────────────────────────────────────────────────────────
export default function Layout({ children }: { children: ReactNode }) {
  const { session, isManager, isAdmin, logout, products, sales, notifications, refreshAll } = useAuth()
  const [dark, toggleDark] = useDarkMode()
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [isSearchOpen, setIsSearchOpen] = useState(false)
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false)
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const searchRef = useRef<HTMLDivElement>(null)
  const searchInputRef = useRef<HTMLInputElement>(null)
  const mainPanelRef = useRef<HTMLElement>(null)
  const navigate = useNavigate()
  const location = useLocation()

  const unreadCount = useMemo(() => notifications.filter(n => !n.read).length, [notifications])

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) {
        setIsSearchOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  // Close search & menu on navigation
  useEffect(() => {
    setIsSearchOpen(false)
    setSearchQuery('')
    setIsMobileMenuOpen(false)
    // Pages share a single content scroller, so every route opens at its top.
    mainPanelRef.current?.scrollTo({ top: 0, behavior: 'auto' })
  }, [location.pathname])

  // Global keyboard shortcut: Ctrl+K to open search
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault()
        searchInputRef.current?.focus()
        setIsSearchOpen(true)
      }
      if (e.key === 'Escape') {
        setIsSearchOpen(false)
        setIsMobileMenuOpen(false)
      }
    }
    document.addEventListener('keydown', handleKey)
    return () => document.removeEventListener('keydown', handleKey)
  }, [])

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return { products: [], sales: [] }
    const q = searchQuery.toLowerCase().trim()
    return {
      products: products
        .filter(p => p.name.toLowerCase().includes(q) || p.sku?.toLowerCase().includes(q) || p.categoryName.toLowerCase().includes(q))
        .slice(0, 5),
      sales: sales
        .filter(s => s.invoiceNumber.toLowerCase().includes(q) || s.customerName?.toLowerCase().includes(q))
        .slice(0, 5),
    }
  }, [searchQuery, products, sales])

  const hasResults = searchResults.products.length > 0 || searchResults.sales.length > 0

  const handleProductClick = useCallback((p: NormalizedProduct) => {
    navigate(`/products?search=${encodeURIComponent(p.name)}`)
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [navigate])

  const handleSaleClick = useCallback((s: Sale) => {
    setSelectedSale(s)
    setIsSearchOpen(false)
    setSearchQuery('')
  }, [])

  const markAllNotificationsRead = async () => {
    try {
      await api.patch('/api/notifications/read-all', {})
      await refreshAll()
    } catch { /* The notification list remains available if the update fails. */ }
  }

  if (!session) return null

  const navItems = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/products',  icon: Package,         label: 'Products' },
    { to: '/sales',     icon: Receipt,          label: 'Sales / POS' },
    ...(isManager ? [
      { to: '/finance',  icon: Wallet,       label: 'Finance' },
      { to: '/reports',  icon: ClipboardList, label: 'Reports' },
    ] : []),
    { to: '/activity', icon: Bell, label: 'Activity', badge: unreadCount > 0 ? unreadCount : undefined },
    ...(isAdmin ? [
      { to: '/users',    icon: UserCog,  label: 'Users' },
      { to: '/settings', icon: Settings, label: 'Settings' },
    ] : []),
  ]

  const roleLabel = session.role.replace(/_/g, ' ')
    .toLowerCase()
    .replace(/\b\w/g, c => c.toUpperCase())

  return (
    <div className="shell app-shell">
      {selectedSale && (
        <SaleInvoiceModal
          sale={selectedSale}
          onClose={() => setSelectedSale(null)}
          isManager={isManager}
          onDeleted={refreshAll}
        />
      )}

      {/* ── Mobile Header ─────────────────────────────── */}
      <div className="mobile-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div className="brand-mark" style={{ width: 36, height: 36 }}>
            <ShieldCheck size={16} />
          </div>
          <span style={{ fontWeight: 800, fontSize: '1.05rem' }}>SBS</span>
        </div>
        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button className="theme-toggle" onClick={toggleDark} title="Toggle dark mode">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button className="icon-btn ghost-button" onClick={() => setIsMobileMenuOpen(o => !o)}>
            {isMobileMenuOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
      </div>

      {/* ── Sidebar ───────────────────────────────────── */}
      <aside className={`sidebar ${isMobileMenuOpen ? 'open' : ''}`}>
        {/* Brand */}
        <div className="brand-block">
          <div className="brand-mark">
            <ShieldCheck size={20} />
          </div>
          <div>
            <p style={{ fontSize: '0.62rem', fontWeight: 800, letterSpacing: '0.15em', textTransform: 'uppercase', color: 'rgba(232,236,244,0.45)', marginBottom: '0.1rem' }}>
              Management
            </p>
            <h2 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white', margin: 0 }}>Smart Boutique</h2>
          </div>
        </div>

        {/* Nav */}
        <nav className="nav-links">
          {navItems.map(item => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) => `nav-link ${isActive ? 'active' : ''}`}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              <item.icon size={17} />
              <span style={{ flex: 1 }}>{item.label}</span>
              {item.badge && (
                <span className="nav-badge">{item.badge}</span>
              )}
            </NavLink>
          ))}
        </nav>

        {/* Footer */}
        <div className="sidebar-footer">
          <div className="sidebar-user-card">
            <div className="sidebar-avatar">
              {session.name.charAt(0).toUpperCase()}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <p style={{ fontWeight: 700, fontSize: '0.88rem', color: 'white', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {session.name}
              </p>
              <p style={{ fontSize: '0.7rem', color: 'rgba(232,236,244,0.45)', marginTop: '0.1rem' }}>
                {roleLabel}
              </p>
            </div>
          </div>
          <button
            className="ghost-button"
            onClick={logout}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              gap: '0.6rem',
              justifyContent: 'center',
              color: 'rgba(248,113,113,0.85)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 'var(--radius-md)',
              fontSize: '0.85rem',
              padding: '0.65rem',
              fontWeight: 600,
            }}
          >
            <LogOut size={15} /> Sign Out
          </button>
        </div>
      </aside>

      {/* Mobile Overlay */}
      {isMobileMenuOpen && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 30, background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)' }}
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* ── Main ──────────────────────────────────────── */}
      <main ref={mainPanelRef} className="main-panel animate-fade-in" tabIndex={-1}>
        <header className="topbar">
          <div>
            <p style={{ fontSize: '0.65rem', fontWeight: 800, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--accent)', marginBottom: '0.25rem' }}>
              Business Control Center
            </p>
            <h1 style={{ color: 'var(--text-main)' }}>{getGreeting(session.name)}</h1>
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: '0.2rem' }}>
              Signed in as <strong>{roleLabel}</strong>
            </p>
          </div>

          <div className="topbar-actions">
            <LiveClock />

            {/* Global Search */}
            <div className="global-search-container" ref={searchRef}>
              <div
                className={`global-search ${isSearchOpen ? 'focused' : ''}`}
                onClick={() => { setIsSearchOpen(true); searchInputRef.current?.focus() }}
              >
                <Search size={15} style={{ flexShrink: 0 }} />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search… (Ctrl+K)"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  onFocus={() => setIsSearchOpen(true)}
                />
                {searchQuery && (
                  <button
                    onClick={e => { e.stopPropagation(); setSearchQuery('') }}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-subtle)', padding: 0 }}
                  >
                    <X size={14} />
                  </button>
                )}
              </div>

              {isSearchOpen && searchQuery.trim() && (
                <div
                  className="search-dropdown panel-card animate-fade-in"
                  style={{
                    position: 'absolute', top: '110%', right: 0,
                    width: '460px', zIndex: 50, padding: '1rem',
                    maxHeight: '480px', overflowY: 'auto',
                  }}
                >
                  {!hasResults ? (
                    <div style={{ padding: '2rem', textAlign: 'center' }} className="muted">
                      <Search size={32} style={{ marginBottom: '0.5rem', opacity: 0.2 }} />
                      <p>No results for "<strong>{searchQuery}</strong>"</p>
                    </div>
                  ) : (
                    <>
                      {searchResults.products.length > 0 && (
                        <div style={{ marginBottom: '1.25rem' }}>
                          <p className="eyebrow" style={{ marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>Products</p>
                          <div className="list-stack">
                            {searchResults.products.map(p => (
                              <div
                                key={p.id}
                                className="list-item"
                                style={{ padding: '0.75rem', cursor: 'pointer' }}
                                onClick={() => handleProductClick(p)}
                              >
                                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                                  <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: 8 }}>
                                    <Tag size={15} />
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{p.name}</p>
                                    <p className="muted" style={{ fontSize: '0.7rem' }}>{p.categoryName} • {p.currentQuantity} in stock</p>
                                  </div>
                                </div>
                                <ChevronRight size={14} className="muted" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                      {searchResults.sales.length > 0 && (
                        <div>
                          <p className="eyebrow" style={{ marginBottom: '0.6rem', paddingLeft: '0.25rem' }}>Sales & Invoices</p>
                          <div className="list-stack">
                            {searchResults.sales.map(s => (
                              <div
                                key={s.id}
                                className="list-item"
                                style={{ padding: '0.75rem', cursor: 'pointer' }}
                                onClick={() => handleSaleClick(s)}
                              >
                                <div style={{ display: 'flex', gap: '0.85rem', alignItems: 'center' }}>
                                  <div className="stat-icon" style={{ width: 32, height: 32, borderRadius: 8, background: '#f0fdf4', color: '#166534' }}>
                                    <FileText size={15} />
                                  </div>
                                  <div>
                                    <p style={{ fontWeight: 600, fontSize: '0.88rem' }}>{s.invoiceNumber}</p>
                                    <p className="muted" style={{ fontSize: '0.7rem' }}>{s.customerName || 'Walk-in'} • RWF {s.totalAmount.toLocaleString()}</p>
                                  </div>
                                </div>
                                <ArrowRight size={14} className="muted" />
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Notifications */}
            <div className="header-notifications">
              <button
                className="theme-toggle notification-button"
                onClick={() => setIsNotificationsOpen(open => !open)}
                aria-label={`Notifications${unreadCount ? `, ${unreadCount} unread` : ''}`}
                aria-expanded={isNotificationsOpen}
                title="Notifications"
              >
                <Bell size={18} />
                {unreadCount > 0 && <span className="notification-count">{unreadCount > 99 ? '99+' : unreadCount}</span>}
              </button>

              {isNotificationsOpen && (
                <div className="notification-dropdown panel-card">
                  <div className="notification-dropdown-head">
                    <div>
                      <strong>Notifications</strong>
                      <p>{unreadCount ? `${unreadCount} unread` : 'You are all caught up'}</p>
                    </div>
                    {unreadCount > 0 && <button onClick={markAllNotificationsRead}>Mark all read</button>}
                  </div>
                  <div className="notification-dropdown-list">
                    {notifications.length === 0 ? (
                      <p className="notification-empty">No new activity yet.</p>
                    ) : notifications.slice(0, 6).map(notification => (
                      <button
                        key={notification.id}
                        className={`notification-item ${notification.read ? '' : 'unread'}`}
                        onClick={() => { setIsNotificationsOpen(false); navigate('/activity') }}
                      >
                        <span className="notification-item-icon"><Bell size={15} /></span>
                        <span>
                          <strong>{notification.title}</strong>
                          <small>{notification.message}</small>
                        </span>
                      </button>
                    ))}
                  </div>
                  <button className="notification-view-all" onClick={() => { setIsNotificationsOpen(false); navigate('/activity') }}>
                    View all activity <ArrowRight size={14} />
                  </button>
                </div>
              )}
            </div>

            {/* Dark Mode Toggle */}
            <button className="theme-toggle" onClick={toggleDark} title={dark ? 'Switch to light mode' : 'Switch to dark mode'}>
              {dark ? <Sun size={17} /> : <Moon size={17} />}
            </button>

            {/* Logout */}
            <button
              className="ghost-button"
              onClick={logout}
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600, fontSize: '0.875rem' }}
            >
              <LogOut size={16} /> Sign out
            </button>
          </div>
        </header>

        {children}
      </main>
    </div>
  )
}
