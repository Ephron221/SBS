import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { Category, NormalizedProduct } from '../types'
import { X, Save, Package, DollarSign, Layers, Truck, Loader2, Type, Palette, Plus } from 'lucide-react'
import { useAuth } from '../context/AuthContext'

interface Props {
  product?: NormalizedProduct | null
  onSaved: () => void
  onCancel: () => void
}

const SIZES = ['XS', 'S', 'M', 'L', 'XL', 'XXL', '38', '40', '42', '44', 'Free Size', 'N/A']

export default function ProductForm({ product, onSaved, onCancel }: Props) {
  const { isManager } = useAuth()
  const [categories, setCategories] = useState<Category[]>([])
  const [units, setUnits] = useState<{ id: string, name: string }[]>([])
  
  const [showAddCategory, setShowAddCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  
  const [showAddUnit, setShowAddUnit] = useState(false)
  const [newUnitName, setNewUnitName] = useState('')

  const [form, setForm] = useState({
    name: product?.name ?? '',
    categoryId: product?.categoryId ?? '',
    description: product?.description ?? '',
    buyingPrice: product?.buyingPrice ?? '',
    sellingPrice: product?.sellingPrice ?? '',
    currentQuantity: product?.currentQuantity ?? 0,
    minimumStockLevel: product?.minimumStockLevel ?? 5,
    unit: product?.unit ?? '',
    supplier: product?.supplier ?? '',
    size: product?.size ?? 'N/A',
    color: product?.color ?? '',
    sku: (product as any)?.sku ?? '',
  })
  
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const fetchData = async () => {
    try {
      const [catRes, unitRes] = await Promise.all([
        api.get('/api/categories'),
        api.get('/api/units')
      ])
      setCategories(catRes.data.data || [])
      setUnits(unitRes.data.data || [])
      
      // If adding a new product and units exist, set default if not set
      if (!product && unitRes.data.data?.length > 0 && !form.unit) {
        set('unit', unitRes.data.data[0].name)
      }
    } catch (e) {
      console.error('Failed to fetch metadata', e)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  const set = (key: string, value: string | number) => setForm((f) => ({ ...f, [key]: value }))

  const handleAddCategory = async () => {
    if (!newCategoryName) return
    try {
      const res = await api.post('/api/categories', { name: newCategoryName })
      setCategories([...categories, res.data.data])
      set('categoryId', res.data.data.id)
      setNewCategoryName('')
      setShowAddCategory(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add category')
    }
  }

  const handleAddUnit = async () => {
    if (!newUnitName) return
    try {
      const res = await api.post('/api/units', { name: newUnitName })
      setUnits([...units, res.data.data])
      set('unit', res.data.data.name)
      setNewUnitName('')
      setShowAddUnit(false)
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add unit')
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      if (product) {
        await api.put(`/api/products/${product.id}`, form)
      } else {
        await api.post('/api/products', form)
      }
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to save product.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 100 }}>
      <div className="modal-card" style={{ maxWidth: '700px' }}>
        <div className="panel-head" style={{ borderBottom: '1px solid var(--border)', paddingBottom: '1rem', marginBottom: '1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: '36px', height: '36px' }}>
              <Package size={20} />
            </div>
            <h3 style={{ fontSize: '1.25rem' }}>{product ? 'Edit Product Details' : 'Add New Boutique Item'}</h3>
          </div>
          <button className="ghost-button icon-btn" onClick={onCancel}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '1.25rem' }}>
            <div style={{ gridColumn: 'span 2' }}>
              <p className="eyebrow" style={{ marginBottom: '0.75rem' }}>Product Essentials</p>
              <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '1rem' }}>
                <div className="field-group">
                  <label>Full Name</label>
                  <input className="input-field" value={form.name} onChange={(e) => set('name', e.target.value)} required placeholder="e.g. Italian Leather Shoes" />
                </div>
                <div className="field-group">
                  <label>SKU / Barcode</label>
                  <input className="input-field" value={form.sku} onChange={(e) => set('sku', e.target.value)} placeholder="e.g. SH-001" />
                </div>
              </div>
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Category
                {isManager && !showAddCategory && (
                  <button type="button" className="icon-btn" style={{ padding: '2px' }} onClick={() => setShowAddCategory(true)}>
                    <Plus size={14} />
                  </button>
                )}
              </label>
              {showAddCategory ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    className="input-field" 
                    autoFocus
                    placeholder="New category..." 
                    value={newCategoryName} 
                    onChange={e => setNewCategoryName(e.target.value)}
                  />
                  <button type="button" className="primary-button" style={{ padding: '0 0.8rem' }} onClick={handleAddCategory}>Add</button>
                  <button type="button" className="ghost-button" onClick={() => setShowAddCategory(false)}>✕</button>
                </div>
              ) : (
                <select className="input-field" value={form.categoryId} onChange={(e) => set('categoryId', e.target.value)} required>
                  <option value="">Select Category</option>
                  {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </select>
              )}
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                Inventory Unit
                {isManager && !showAddUnit && (
                  <button type="button" className="icon-btn" style={{ padding: '2px' }} onClick={() => setShowAddUnit(true)}>
                    <Plus size={14} />
                  </button>
                )}
              </label>
              {showAddUnit ? (
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <input 
                    className="input-field" 
                    autoFocus
                    placeholder="New unit..." 
                    value={newUnitName} 
                    onChange={e => setNewUnitName(e.target.value)}
                  />
                  <button type="button" className="primary-button" style={{ padding: '0 0.8rem' }} onClick={handleAddUnit}>Add</button>
                  <button type="button" className="ghost-button" onClick={() => setShowAddUnit(false)}>✕</button>
                </div>
              ) : (
                <select className="input-field" value={form.unit} onChange={(e) => set('unit', e.target.value)} required>
                  <option value="">Select Unit</option>
                  {units.map((u) => <option key={u.id} value={u.name}>{u.name}</option>)}
                </select>
              )}
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Type size={14} /> Size Variant</label>
              <select className="input-field" value={form.size} onChange={(e) => set('size', e.target.value)}>
                {SIZES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}><Palette size={14} /> Color / Pattern</label>
              <input className="input-field" value={form.color} onChange={(e) => set('color', e.target.value)} placeholder="e.g. Midnight Blue" />
            </div>

            <div style={{ gridColumn: 'span 2' }}>
              <p className="eyebrow" style={{ margin: '0.5rem 0 0.75rem' }}>Financial & Stock</p>
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <DollarSign size={14} /> Buying Price
              </label>
              <input className="input-field" type="number" min="0" value={form.buyingPrice} onChange={(e) => set('buyingPrice', e.target.value)} required />
            </div>

            <div className="field-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <DollarSign size={14} /> Selling Price
              </label>
              <input className="input-field" type="number" min="0" value={form.sellingPrice} onChange={(e) => set('sellingPrice', e.target.value)} required />
            </div>

            {!product && (
              <div className="field-group">
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                  <Layers size={14} /> Initial Quantity
                </label>
                <input className="input-field" type="number" min="0" value={form.currentQuantity} onChange={(e) => set('currentQuantity', Number(e.target.value))} />
              </div>
            )}

            <div className="field-group">
              <label>Low Stock Alert Level</label>
              <input className="input-field" type="number" min="0" value={form.minimumStockLevel} onChange={(e) => set('minimumStockLevel', Number(e.target.value))} />
            </div>

            <div className="field-group" style={{ gridColumn: 'span 2' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <Truck size={14} /> Supplier & Distribution
              </label>
              <input className="input-field" value={form.supplier} onChange={(e) => set('supplier', e.target.value)} placeholder="Main distributor name..." />
            </div>
          </div>

          {error && (
            <div className="error" style={{ marginTop: '1.5rem', padding: '0.75rem', borderRadius: '8px', background: '#fef2f2', fontSize: '0.85rem' }}>
              {error}
            </div>
          )}

          <div className="form-actions" style={{ marginTop: '2rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
            <button type="button" className="ghost-button" onClick={onCancel} style={{ padding: '0.8rem 1.5rem' }}>
              Discard
            </button>
            <button 
              type="submit" 
              className="primary-button" 
              disabled={saving} 
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.8rem 2.5rem', background: 'var(--primary)', color: 'white' }}
            >
              {saving ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
              {product ? 'Update Inventory' : 'Add to Inventory'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
