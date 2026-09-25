import { useMemo, useState } from 'react'
import { ShoppingBag, History, Search, FileText, ChevronRight, User, Calendar, CreditCard, X } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import POSCart from '../features/POSCart'
import SaleInvoiceModal from '../components/SaleInvoiceModal'
import type { Sale } from '../types'

export default function SalesPage() {
  const { sales, products, isManager, refreshAll } = useAuth()
  const [tab, setTab] = useState<'pos' | 'history'>('pos')
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [search, setSearch] = useState('')
  const [posSearch, setPosSearch] = useState('')
  const [methodFilter, setMethodFilter] = useState('all')

  const paymentMethods = useMemo(() => Array.from(new Set(sales.map((s) => s.paymentMethod).filter(Boolean))), [sales])
  const filteredSales = sales.filter(s => {
    const query = search.toLowerCase()
    const matchesSearch = s.invoiceNumber.toLowerCase().includes(query) || (s.customerName && s.customerName.toLowerCase().includes(query))
    const matchesMethod = methodFilter === 'all' || s.paymentMethod === methodFilter
    return matchesSearch && matchesMethod
  })
  const filteredTotal = filteredSales.reduce((sum, sale) => sum + sale.totalAmount, 0)

  return (
    <section className="content-stack animate-fade-in">
      {selectedSale && (
        <SaleInvoiceModal 
          sale={selectedSale} 
          onClose={() => setSelectedSale(null)} 
          isManager={isManager} 
          onDeleted={refreshAll} 
        />
      )}

      <header className="sales-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', gap: '1.5rem', flexWrap: 'wrap' }}>
        <div style={{ flexShrink: 0, minWidth: '200px' }}>
          <p className="eyebrow">Commerce Hub</p>
          <h1 style={{ fontSize: 'clamp(1.2rem, 2vw, 1.5rem)', marginBottom: '0.25rem', fontWeight: 900 }}>Process New Sales</h1>
        </div>

        {tab === 'pos' && (
          <div className="header-search-wrap" style={{ flex: '1 1 300px', position: 'relative', minWidth: '0' }}>
            <Search size={18} style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', color: 'var(--primary)', opacity: 0.5 }} />
            <input
              className="input-field"
              placeholder="Search products or customers... (/)"
              value={posSearch}
              onChange={(e) => setPosSearch(e.target.value)}
              style={{
                width: '100%',
                height: '48px',
                paddingLeft: '3rem',
                paddingRight: '3rem',
                borderRadius: '16px',
                fontSize: '0.95rem',
                border: '2px solid var(--border)',
                background: 'white',
                boxShadow: 'var(--shadow-sm)',
                textOverflow: 'ellipsis'
              }}
              id="pos-search-input"
            />
            {posSearch && (
              <button
                onClick={() => setPosSearch('')}
                style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', background: '#f1f5f9', border: 'none', borderRadius: '50%', width: '26px', height: '26px', cursor: 'pointer', display: 'grid', placeItems: 'center', color: '#64748b' }}
              >
                <X size={14} />
              </button>
            )}
          </div>
        )}
      </header>

      <div className="panel-card" style={{ padding: '0.75rem', marginBottom: '1.5rem' }}>
        <div className="toolbar-row">
          <div className="segmented-control" style={{ background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px' }}>
            <button 
              className={tab === 'pos' ? 'primary-button' : 'ghost-button'} 
              style={{ 
                borderRadius: '8px', 
                padding: '0.5rem 1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem', 
                fontSize: '0.85rem',
                background: tab === 'pos' ? 'var(--primary)' : 'transparent', 
                color: tab === 'pos' ? 'white' : 'var(--text-muted)',
                boxShadow: tab === 'pos' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
              }} 
              onClick={() => setTab('pos')}
            >
              <ShoppingBag size={18} /> Point of Sale
            </button>
            <button 
              className={tab === 'history' ? 'primary-button' : 'ghost-button'} 
              style={{ 
                borderRadius: '8px', 
                padding: '0.5rem 1.25rem', 
                display: 'flex', 
                alignItems: 'center', 
                gap: '0.6rem', 
                fontSize: '0.85rem',
                background: tab === 'history' ? 'var(--primary)' : 'transparent', 
                color: tab === 'history' ? 'white' : 'var(--text-muted)',
                boxShadow: tab === 'history' ? '0 4px 6px -1px rgba(0,0,0,0.1)' : 'none'
              }} 
              onClick={() => setTab('history')}
            >
              <History size={18} /> Sales Archive
            </button>
          </div>

          {tab === 'history' && (
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              <div style={{ position: 'relative' }}>
                <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                <input 
                  className="input-field" 
                  placeholder="Invoice or customer..." 
                  value={search} 
                  onChange={(e) => setSearch(e.target.value)} 
                  style={{ paddingLeft: '2.5rem', width: '240px', height: '40px' }} 
                />
              </div>
              <select className="input-field" style={{ height: '40px' }} value={methodFilter} onChange={(e) => setMethodFilter(e.target.value)}>
                <option value="all">All Payments</option>
                {paymentMethods.map((method) => <option key={method} value={method}>{method}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      {tab === 'pos' ? (
        <POSCart products={products as any} onSaleComplete={refreshAll} search={posSearch} setSearch={setPosSearch} />
      ) : (
        <div className="panel-card animate-fade-in">
          <div className="panel-head">
            <div>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <History size={20} /> Transaction Journal
              </h3>
              <p className="muted" style={{ fontSize: '0.8rem' }}>Total volume: <strong>RWF {filteredTotal.toLocaleString()}</strong></p>
            </div>
            <span className="badge badge-success" style={{ padding: '0.4rem 0.8rem' }}>{filteredSales.length} Invoices</span>
          </div>
          
          <div className="list-stack">
            {filteredSales.length === 0 ? (
              <div className="empty-state" style={{ padding: '4rem 0' }}>
                <FileText size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                <p className="muted">No transactions found matching your filters.</p>
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '0.75rem' }}>
                {filteredSales.map((s) => (
                  <div className="list-item" key={s.id} onClick={() => setSelectedSale(s)} style={{ 
                    padding: '1.25rem', 
                    cursor: 'pointer',
                    background: 'white',
                    border: '1px solid var(--border)',
                    transition: 'all 0.2s ease'
                  }}>
                    <div style={{ display: 'flex', gap: '1.25rem', alignItems: 'center', flex: 1.5 }}>
                      <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#f1f5f9', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
                        <FileText size={22} />
                      </div>
                      <div>
                        <p style={{ fontWeight: 800, margin: 0, fontSize: '1rem' }}>{s.invoiceNumber}</p>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.2rem' }} className="muted">
                           <User size={12} />
                           <span style={{ fontSize: '0.8rem', fontWeight: 600 }}>{s.customerName || 'Walk-in Customer'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: 'var(--primary)', fontWeight: 700, fontSize: '0.85rem' }}>
                        <CreditCard size={14} />
                        {s.paymentMethod}
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', marginTop: '0.2rem' }} className="muted">
                        <Calendar size={12} />
                        <span style={{ fontSize: '0.75rem' }}>{new Date(s.createdAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
                      </div>
                    </div>

                    <div style={{ textAlign: 'right', marginRight: '1rem', minWidth: '140px' }}>
                      <p style={{ fontWeight: 900, fontSize: '1.1rem', color: 'var(--primary)', margin: 0 }}>RWF {s.totalAmount.toLocaleString()}</p>
                      <span className="badge badge-success" style={{ fontSize: '0.65rem', padding: '0.1rem 0.5rem', marginTop: '0.25rem' }}>Completed</span>
                    </div>

                    <div style={{ color: 'var(--border)' }}>
                      <ChevronRight size={20} />
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  )
}
