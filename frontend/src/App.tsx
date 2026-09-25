import { lazy, Suspense } from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider, useAuth } from './context/AuthContext'
import { ToastProvider } from './context/ToastContext'
import { ConfirmProvider } from './context/ConfirmContext'
import Layout from './components/Layout'
import { SkeletonPage } from './components/Skeleton'
import './App.css'

// Lazy-load all pages for better performance
const LoginPage    = lazy(() => import('./pages/LoginPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ProductsPage  = lazy(() => import('./pages/ProductsPage'))
const SalesPage     = lazy(() => import('./pages/SalesPage'))
const FinancePage   = lazy(() => import('./pages/FinancePage'))
const ReportsPage   = lazy(() => import('./pages/ReportsPage'))
const ActivityPage  = lazy(() => import('./pages/ActivityPage'))
const UsersPage     = lazy(() => import('./pages/UsersPage'))
const SettingsPage  = lazy(() => import('./pages/SettingsPage'))

function AppRoutes() {
  const { session, isManager, isAdmin } = useAuth()
  if (!session) return (
    <Suspense fallback={<div className="shell auth-shell"><div className="skeleton" style={{ width: 480, height: 560, borderRadius: 24 }} /></div>}>
      <LoginPage />
    </Suspense>
  )
  return (
    <Layout>
      <Suspense fallback={<SkeletonPage />}>
        <Routes>
          <Route path="/"          element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/products"  element={<ProductsPage />} />
          <Route path="/sales"     element={<SalesPage />} />
          <Route path="/finance"   element={isManager ? <FinancePage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/reports"   element={isManager ? <ReportsPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/activity"  element={<ActivityPage />} />
          <Route path="/users"     element={isAdmin ? <UsersPage /> : <Navigate to="/dashboard" replace />} />
          <Route path="/settings"  element={isAdmin ? <SettingsPage /> : <Navigate to="/dashboard" replace />} />
        </Routes>
      </Suspense>
    </Layout>
  )
}

export default function App() {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <AuthProvider>
          <Router>
            <AppRoutes />
          </Router>
        </AuthProvider>
      </ConfirmProvider>
    </ToastProvider>
  )
}
