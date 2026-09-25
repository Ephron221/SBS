import { createContext, useContext, useEffect, useState, type ReactNode } from 'react'
import axios from 'axios'
import { api, API_URL, getToken } from '../lib/api'
import type { UserSession, Product, Sale, FinanceSummary, ReportSummary, NotificationItem, AuditLogEntry, NormalizedProduct } from '../types'

interface AuthContextValue {
  session: UserSession | null
  products: NormalizedProduct[]
  sales: Sale[]
  finance: FinanceSummary | null
  reports: ReportSummary | null
  notifications: NotificationItem[]
  auditLogs: AuditLogEntry[]
  loginError: string
  loginLoading: boolean
  isManager: boolean
  isAdmin: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => void
  refreshAll: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue>(null!)
export const useAuth = () => useContext(AuthContext)

function normalize(p: Product): NormalizedProduct {
  const cat = typeof p.category === 'string' ? { id: '', name: p.category } : (p.category ?? { id: '', name: '' })
  return { ...p, categoryName: cat.name, categoryId: p.categoryId ?? cat.id }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<UserSession | null>(null)
  const [products, setProducts] = useState<NormalizedProduct[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [finance, setFinance] = useState<FinanceSummary | null>(null)
  const [reports, setReports] = useState<ReportSummary | null>(null)
  const [notifications, setNotifications] = useState<NotificationItem[]>([])
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([])
  const [loginError, setLoginError] = useState('')
  const [loginLoading, setLoginLoading] = useState(false)

  const isManager = session?.role === 'MANAGER' || session?.role === 'SUPER_ADMIN'
  const isAdmin = session?.role === 'SUPER_ADMIN'

  const loadData = async (role: string) => {
    const man = role === 'MANAGER' || role === 'SUPER_ADMIN'
    const [p, s, n] = await Promise.all([
      api.get('/api/products'),
      api.get('/api/sales'),
      api.get('/api/notifications'),
    ])
    setProducts((p.data.data || []).map(normalize))
    setSales(s.data.data || [])
    setNotifications(n.data.data || [])
    if (man) {
      const [f, r, a] = await Promise.all([
        api.get('/api/finance'),
        api.get('/api/reports/summary'),
        api.get('/api/audit-logs'),
      ])
      setFinance(f.data.data || null)
      setReports(r.data.data || null)
      setAuditLogs(a.data.data || [])
    }
  }

  const refreshAll = async () => { if (session) await loadData(session.role) }

  useEffect(() => {
    if (!session) return
    const refreshNotifications = async () => {
      try {
        const response = await api.get('/api/notifications')
        setNotifications(response.data.data || [])
      } catch { /* Keep the most recently loaded notifications on a transient error. */ }
    }
    const timer = window.setInterval(refreshNotifications, 10000)
    return () => window.clearInterval(timer)
  }, [session])

  useEffect(() => {
    const token = getToken()
    if (!token) return
    axios.get(`${API_URL}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } })
      .then(async (res) => { setSession(res.data.user); await loadData(res.data.user.role) })
      .catch(() => localStorage.removeItem('sbs-token'))
  }, [])

  const login = async (email: string, password: string) => {
    setLoginLoading(true); setLoginError('')
    try {
      const res = await axios.post(`${API_URL}/api/auth/login`, { email, password })
      localStorage.setItem('sbs-token', res.data.token)
      setSession(res.data.user)
      await loadData(res.data.user.role)
    } catch (err: any) {
      setLoginError(err.response?.data?.message || 'Unable to sign in.')
    } finally { setLoginLoading(false) }
  }

  const logout = () => { localStorage.removeItem('sbs-token'); setSession(null) }

  return (
    <AuthContext.Provider value={{ session, products, sales, finance, reports, notifications, auditLogs, loginError, loginLoading, isManager, isAdmin, login, logout, refreshAll }}>
      {children}
    </AuthContext.Provider>
  )
}
