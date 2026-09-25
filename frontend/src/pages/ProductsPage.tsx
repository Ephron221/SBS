import { useMemo, useRef, useState } from 'react'
import { Pencil, Plus, Search, Package, AlertTriangle, CheckCircle, SlidersHorizontal, Tag, Barcode, ArrowRightLeft, ArrowLeftRight, ChevronLeft, ChevronRight, Boxes } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import ProductForm from '../features/ProductForm'
import StockAdjustModal from '../features/StockAdjustModal'
import type { NormalizedProduct } from '../types'
import { useToast } from '../context/ToastContext'

export default function ProductsPage() {
  const { products, isManager, refreshAll } = useAuth()
  const { toast } = useToast()
  const [showForm, setShowForm] = useState(false)
  const [editing, setEditing] = useState<NormalizedProduct | null>(null)
  const [adjusting, setAdjusting] = useState<NormalizedProduct | null>(null)
  const [search, setSearch] = useState('')
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out' | 'healthy'>('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const tableScrollRef = useRef<HTMLDivElement>(null)

  const categories = useMemo(() => Array.from(new Set(products.map((p) => p.categoryName).filter(Boolean))).sort(), [products])

  const totalCount = products.length
  const outCount = products.filter(p => p.currentQuantity <= 0).length
  const lowCount = products.filter(p => p.currentQuantity > 0 && p.currentQuantity <= p.minimumStockLevel).length
  const healthyCount = products.filter(p => p.currentQuantity > p.minimumStockLevel).length

  const filtered = products.filter((p) => {
    const query = search.toLowerCase().trim()
    const matchesSearch = !query ||
      p.name.toLowerCase().includes(query) ||
      p.categoryName.toLowerCase().includes(query) ||
      (p.sku || '').toLowerCase().includes(query)
    const matchesCategory = categoryFilter === 'all' || p.categoryName === categoryFilter
    const isOut = p.currentQuantity <= 0
    const isLow = p.currentQuantity > 0 && p.currentQuantity <= p.minimumStockLevel
    const matchesStock = stockFilter === 'all' || (stockFilter === 'out' && isOut) || (stockFilter === 'low' && isLow) || (stockFilter === 'healthy' && !isOut && !isLow)
    return matchesSearch && matchesCategory && matchesStock
  })

  const handleSaved = async () => {
    setShowForm(false)
    setEditing(null)
    await refreshAll()
    toast.success('Inventory Updated', 'Product catalog has been updated.')
  }

  const handleAdjusted = async () => {
    setAdjusting(null)
    await refreshAll()
    toast.success('Stock Adjusted', 'Inventory levels updated successfully.')
  }

  const getStockStatus = (p: NormalizedProduct) => {
    if (p.currentQuantity <= 0) return { label: 'Out of Stock', class: 'badge-danger', icon: AlertTriangle, color: '#ef4444' }
    if (p.currentQuantity <= p.minimumStockLevel) return { label: 'Low Stock', class: 'badge-warning', icon: AlertTriangle, color: '#f59e0b' }
    return { label: 'In Stock', class: 'badge-success', icon: CheckCircle, color: '#10b981' }
  }

  return (
    <section className="content-stack animate-fade-in">
      {(showForm || editing) && <ProductForm product={editing} onSaved={handleSaved} onCancel={() => { setShowForm(false); setEditing(null) }} />}
      {adjusting && <StockAdjustModal product={adjusting} onSaved={handleAdjusted} onCancel={() => setAdjusting(null)} />}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-main)' }}>Master Inventory</h1>
          <p className="muted">Catalog management and real-time stock monitoring</p>
        </div>
        {isManager && (
          <button
            className="primary-button"
            style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', padding: '0.8rem 1.5rem', background: 'var(--primary)', color: 'white', boxShadow: '0 8px 24px rgba(35, 65, 95, 0.25)' }}
            onClick={() => setShowForm(true)}
          >
            <Plus size={20} /> Add New Item
          </button>
        )}
      </header>

      {/* Summary Pills */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <button
          className="ghost-button"
          onClick={() => setStockFilter('all')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem',
            background: stockFilter === 'all' ? 'var(--bg-card)' : 'transparent',
            border: `1.5px solid ${stockFilter === 'all' ? 'var(--primary)' : 'var(--border)'}`,
            borderRadius: 99, fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-main)'
          }}
        >
          <Boxes size={14} /> Total Items: {totalCount}
        </button>
        <button
          className="ghost-button"
          onClick={() => setStockFilter('healthy')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem',
            background: stockFilter === 'healthy' ? 'rgba(22, 163, 74, 0.1)' : 'transparent',
            border: `1.5px solid ${stockFilter === 'healthy' ? '#16a34a' : 'var(--border)'}`,
            borderRadius: 99, fontSize: '0.82rem', fontWeight: 700, color: '#16a34a'
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#16a34a' }} />
          Healthy: {healthyCount}
        </button>
        <button
          className="ghost-button"
          onClick={() => setStockFilter('low')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem',
            background: stockFilter === 'low' ? 'rgba(217, 119, 6, 0.1)' : 'transparent',
            border: `1.5px solid ${stockFilter === 'low' ? '#d97706' : 'var(--border)'}`,
            borderRadius: 99, fontSize: '0.82rem', fontWeight: 700, color: '#d97706'
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#d97706' }} />
          Low Stock: {lowCount}
        </button>
        <button
          className="ghost-button"
          onClick={() => setStockFilter('out')}
          style={{
            display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.45rem 0.9rem',
            background: stockFilter === 'out' ? 'rgba(220, 38, 38, 0.1)' : 'transparent',
            border: `1.5px solid ${stockFilter === 'out' ? '#dc2626' : 'var(--border)'}`,
            borderRadius: 99, fontSize: '0.82rem', fontWeight: 700, color: '#dc2626'
          }}
        >
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#dc2626' }} />
          Out of Stock: {outCount}
        </button>
      </div>

      <div className="panel-card" style={{ padding: '1.25rem' }}>
        <div className="toolbar-row">
          <div style={{ position: 'relative', flex: 1, minWidth: 260 }}>
            <Search size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
            <input
              className="input-field"
              placeholder="Search name, category, SKU..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ paddingLeft: '2.5rem', height: '44px' }}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ position: 'relative' }}>
              <SlidersHorizontal size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)' }} />
              <select className="input-field" value={categoryFilter} onChange={(e) => setCategoryFilter(e.target.value)} style={{ paddingLeft: '2.5rem', minWidth: '180px', height: '44px' }}>
                <option value="all">All Categories</option>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </div>
          </div>
        </div>
      </div>

      <div className="list-stack">
        {filtered.length === 0 ? (
          <div className="panel-card empty-state" style={{ padding: '4.5rem 0' }}>
            <Package size={56} style={{ opacity: 0.2, marginBottom: '1rem' }} />
            <h3 style={{ color: 'var(--text-main)', marginBottom: '0.25rem' }}>No products found</h3>
            <p className="muted">Try adjusting your filters or search terms.</p>
          </div>
        ) : (
          <>
          <div className="table-scroll-hint">
            <span><ArrowLeftRight size={16} /> Scroll left or right to see all columns and the action buttons.</span>
            <div className="table-scroll-controls" aria-label="Scroll product table">
              <button type="button" className="table-scroll-button" onClick={() => tableScrollRef.current?.scrollBy({ left: -420, behavior: 'smooth' })}>
                <ChevronLeft size={16} /> Left
              </button>
              <button type="button" className="table-scroll-button" onClick={() => tableScrollRef.current?.scrollBy({ left: 420, behavior: 'smooth' })}>
                Right <ChevronRight size={16} />
              </button>
            </div>
          </div>
          <div ref={tableScrollRef} className="inventory-table-wrap" tabIndex={0} role="region" aria-label="Product inventory table. Scroll horizontally to view all columns and actions.">
            <table className="inventory-table">
              <thead>
                <tr>
                  <th scope="col">Product</th>
                  <th scope="col">Category</th>
                  <th scope="col"><abbr title="Stock Keeping Unit: the store's unique code for this product">SKU / Item code</abbr></th>
                  <th scope="col" className="number-cell">Quantity</th>
                  <th scope="col">Stock status</th>
                  <th scope="col" className="number-cell">Selling price</th>
                  <th scope="col" className="number-cell">Profit margin</th>
                  {isManager && <th scope="col" className="actions-cell">Actions</th>}
                </tr>
              </thead>
              <tbody>
            {filtered.map((p) => {
              const status = getStockStatus(p)
              return (
                <tr key={p.id}>
                  <td data-label="Product">
                    <div className="product-name-cell">
                      <div className="product-table-icon">
                      <Tag size={20} />
                      </div>
                      <strong>{p.name}</strong>
                    </div>
                  </td>
                  <td data-label="Category"><span className="table-meta"><Boxes size={14} /> {p.categoryName || 'Uncategorised'}</span></td>
                  <td data-label="SKU"><span className="table-sku"><Barcode size={14} /> {p.sku || 'No SKU'}</span></td>
                  <td data-label="Quantity" className="number-cell"><strong>{p.currentQuantity}</strong> <span className="table-unit">{p.unit}</span></td>
                  <td data-label="Stock status"><span className={`badge ${status.class}`}><status.icon size={14} />{status.label}</span></td>
                  <td data-label="Selling price" className="number-cell table-price">RWF {p.sellingPrice.toLocaleString()}</td>
                  <td data-label="Profit margin" className="number-cell table-margin">+RWF {(p.sellingPrice - p.buyingPrice).toLocaleString()}</td>

                  {isManager && (
                    <td data-label="Actions" className="actions-cell">
                      <div className="table-actions">
                      <button
                        className="table-action-button"
                        aria-label={`Edit ${p.name}`}
                        onClick={() => setEditing(p)}
                      >
                        <Pencil size={15} /> Edit
                      </button>
                      <button
                        className="table-action-button adjust"
                        aria-label={`Adjust stock for ${p.name}`}
                        onClick={() => setAdjusting(p)}
                      >
                        <ArrowRightLeft size={15} /> Adjust stock
                      </button>
                      </div>
                    </td>
                  )}
                </tr>
              )
            })}
              </tbody>
            </table>
          </div>
          </>
        )}
      </div>
    </section>
  )
}
