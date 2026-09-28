import { useState, useMemo } from 'react'
import { api } from '../lib/api'
import { X, ArrowUpCircle, ArrowDownCircle, Info, Loader2, MessageSquare, Package, History, Boxes, Calculator } from 'lucide-react'

interface Product { id: string; name: string; currentQuantity: number; unit: string }

interface Props {
  product: Product
  onSaved: () => void
  onCancel: () => void
}

export default function StockAdjustModal({ product, onSaved, onCancel }: Props) {
  const [calcMode, setCalcMode] = useState<'units' | 'casiye'>('units')
  const [delta, setDelta] = useState(1)
  const [boxCount, setBoxCount] = useState(1)

  // Smart detection for default items per casiye/box based on product name
  const defaultPackSize = useMemo(() => {
    const n = product.name.toUpperCase()
    if (n.includes('65CL') || n.includes('MANINI') || n.includes('2L') || n.includes('1.5L') || n.includes('LIQUOR') || n.includes('SMINOFF')) return 12
    if (n.includes('ITABI') || n.includes('CIGARETTE')) return 20
    return 24 // Standard Rwandan beer/soda crate (casiye)
  }, [product.name])

  const [unitsPerBox, setUnitsPerBox] = useState(defaultPackSize)
  const [type, setType] = useState<'add' | 'remove'>('add')
  const [reason, setReason] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  // Effective units to adjust
  const effectiveDelta = calcMode === 'casiye' ? Math.max(1, boxCount * unitsPerBox) : Math.max(1, delta)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    setError('')
    try {
      const defaultReason = calcMode === 'casiye'
        ? `${type === 'add' ? 'Restocked' : 'Removed'} ${boxCount} Casiye/Box (${effectiveDelta} ${product.unit}s)`
        : (type === 'add' ? 'Restock' : 'Reduction')

      await api.post('/api/stock/adjust', {
        productId: product.id,
        delta: type === 'add' ? effectiveDelta : -effectiveDelta,
        reason: reason || defaultReason,
      })
      onSaved()
    } catch (err: any) {
      setError(err.response?.data?.message || 'Adjustment failed.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="modal-overlay animate-fade-in" style={{ zIndex: 110 }}>
      <div className="modal-card stock-adjust-modal" role="dialog" aria-modal="true" aria-labelledby="stock-adjustment-title" style={{ maxWidth: 640, padding: 0 }}>
        <div className="panel-head stock-adjust-modal-header" style={{ padding: '1.25rem 1.5rem', borderBottom: '1px solid var(--border)', background: 'var(--bg-card-solid)', marginBottom: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: '36px', height: '36px', borderRadius: '10px' }}>
              <History size={20} />
            </div>
            <div>
              <h3 id="stock-adjustment-title" style={{ fontSize: '1.1rem', fontWeight: 800 }}>Inventory Adjustment</h3>
              <p className="muted" style={{ fontSize: '0.7rem', textTransform: 'uppercase' }}>Manual Stock Correction</p>
            </div>
          </div>
          <button className="ghost-button icon-btn" onClick={onCancel} style={{ background: '#f1f5f9' }}><X size={18} /></button>
        </div>

        <div className="stock-adjust-modal-body" style={{ padding: '1.5rem' }}>
          <div style={{ background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', marginBottom: '1.5rem', border: '1px solid var(--border)' }}>
            <p className="eyebrow" style={{ marginBottom: '0.5rem', fontSize: '0.65rem' }}>Target Product</p>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ width: '32px', height: '32px', background: 'white', borderRadius: '8px', display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
                  <Package size={16} className="muted" />
                </div>
                <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--primary)' }}>{product.name}</span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span className="badge badge-success" style={{ fontSize: '0.9rem', fontWeight: 800, padding: '0.4rem 0.8rem' }}>
                  {product.currentQuantity} {product.unit}
                </span>
                <p className="muted" style={{ fontSize: '0.65rem', marginTop: '0.2rem' }}>Currently On Hand</p>
              </div>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="form-grid" style={{ gap: '1.25rem' }}>
            <div className="field-group">
              <label className="eyebrow">Action Type</label>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button 
                  type="button" 
                  className={`ghost-button ${type === 'add' ? 'active' : ''}`}
                  onClick={() => setType('add')}
                  style={{ 
                    flex: 1, 
                    height: '48px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.6rem', 
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: type === 'add' ? '#dcfce7' : 'white',
                    color: type === 'add' ? '#166534' : 'var(--text-muted)',
                    borderColor: type === 'add' ? '#166534' : 'var(--border)',
                    borderWidth: '2px',
                    fontWeight: 700
                  }}
                >
                  <ArrowUpCircle size={18} /> Add Stock
                </button>
                <button 
                  type="button" 
                  className={`ghost-button ${type === 'remove' ? 'active' : ''}`}
                  onClick={() => setType('remove')}
                  style={{ 
                    flex: 1, 
                    height: '48px',
                    display: 'flex', 
                    alignItems: 'center', 
                    gap: '0.6rem', 
                    justifyContent: 'center',
                    borderRadius: '12px',
                    background: type === 'remove' ? '#fee2e2' : 'white',
                    color: type === 'remove' ? '#991b1b' : 'var(--text-muted)',
                    borderColor: type === 'remove' ? '#991b1b' : 'var(--border)',
                    borderWidth: '2px',
                    fontWeight: 700
                  }}
                >
                  <ArrowDownCircle size={18} /> Deduct Stock
                </button>
              </div>
            </div>

            <div className="field-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.4rem' }}>
                <label className="eyebrow" style={{ margin: 0 }}>Calculation Mode</label>
                <div style={{ display: 'flex', gap: '0.35rem', background: '#f1f5f9', padding: '0.2rem', borderRadius: '8px' }}>
                  <button
                    type="button"
                    onClick={() => setCalcMode('units')}
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: calcMode === 'units' ? 'var(--primary)' : 'transparent',
                      color: calcMode === 'units' ? 'white' : 'var(--text-muted)',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    Single {product.unit}s
                  </button>
                  <button
                    type="button"
                    onClick={() => setCalcMode('casiye')}
                    style={{
                      padding: '0.25rem 0.65rem',
                      fontSize: '0.75rem',
                      fontWeight: 700,
                      borderRadius: '6px',
                      border: 'none',
                      cursor: 'pointer',
                      background: calcMode === 'casiye' ? 'var(--primary)' : 'transparent',
                      color: calcMode === 'casiye' ? 'white' : 'var(--text-muted)',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.3rem',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    <Boxes size={13} /> Casiye / Boxes
                  </button>
                </div>
              </div>

              {calcMode === 'units' ? (
                <div style={{ position: 'relative' }}>
                  <Info size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input 
                    className="input-field"
                    type="number" 
                    min="1" 
                    value={delta} 
                    onChange={(e) => setDelta(Math.max(1, Number(e.target.value)))} 
                    required 
                    style={{ paddingLeft: '2.5rem', fontSize: '1.1rem', fontWeight: 700 }}
                  />
                </div>
              ) : (
                <div style={{ display: 'grid', gap: '0.75rem', background: 'var(--bg-main)', padding: '1rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                        Number of Casiye / Boxes
                      </label>
                      <input 
                        className="input-field"
                        type="number" 
                        min="1" 
                        value={boxCount} 
                        onChange={(e) => setBoxCount(Math.max(1, Number(e.target.value)))} 
                        required 
                        style={{ fontSize: '1.05rem', fontWeight: 800 }}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '0.3rem', display: 'block' }}>
                        {product.unit}s per Casiye / Box
                      </label>
                      <input 
                        className="input-field"
                        type="number" 
                        min="1" 
                        value={unitsPerBox} 
                        onChange={(e) => setUnitsPerBox(Math.max(1, Number(e.target.value)))} 
                        required 
                        style={{ fontSize: '1.05rem', fontWeight: 800 }}
                      />
                    </div>
                  </div>

                  {/* Quick Preset Buttons for Pack Size */}
                  <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
                    <span style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-muted)' }}>Presets:</span>
                    {[24, 12, 20, 6].map(size => (
                      <button
                        key={size}
                        type="button"
                        onClick={() => setUnitsPerBox(size)}
                        style={{
                          fontSize: '0.72rem',
                          fontWeight: 700,
                          padding: '0.2rem 0.55rem',
                          borderRadius: '6px',
                          border: unitsPerBox === size ? '1px solid var(--accent)' : '1px solid var(--border)',
                          background: unitsPerBox === size ? 'rgba(217, 145, 46, 0.15)' : 'white',
                          color: unitsPerBox === size ? 'var(--primary)' : 'var(--text-muted)',
                          cursor: 'pointer'
                        }}
                      >
                        {size} / Box
                      </button>
                    ))}
                  </div>

                  {/* Live Conversion Banner */}
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '0.75rem 1rem', background: '#dbeafe', borderRadius: '10px', color: '#1e40af' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                      <Calculator size={16} /> Total: {boxCount} Casiye × {unitsPerBox}
                    </span>
                    <span style={{ fontSize: '1.05rem', fontWeight: 900 }}>
                      = {effectiveDelta} {product.unit}s
                    </span>
                  </div>
                </div>
              )}
            </div>

            <div className="field-group">
              <label className="eyebrow">Reason / Comment</label>
              <div style={{ position: 'relative' }}>
                <MessageSquare size={16} style={{ position: 'absolute', left: '12px', top: '16px', color: '#9ca3af' }} />
                <textarea 
                  className="input-field"
                  value={reason} 
                  onChange={(e) => setReason(e.target.value)} 
                  placeholder={type === 'add' ? 'e.g. Received new shipment from supplier...' : 'e.g. Item damaged during display...'} 
                  style={{ paddingLeft: '2.5rem', minHeight: '80px', paddingTop: '0.8rem', resize: 'none' }}
                />
              </div>
            </div>

            {error && (
              <div style={{ display: 'flex', gap: '0.5rem', padding: '0.85rem', borderRadius: '12px', background: '#fef2f2', border: '1px solid #fee2e2' }}>
                <AlertCircle size={16} style={{ color: '#ef4444', flexShrink: 0 }} />
                <p style={{ fontSize: '0.8rem', color: '#b91c1c', fontWeight: 600 }}>{error}</p>
              </div>
            )}

            <div className="form-actions" style={{ marginTop: '1rem', paddingTop: '1.5rem', borderTop: '1px solid var(--border)' }}>
              <button type="button" className="ghost-button" onClick={onCancel} style={{ padding: '0.8rem 1.5rem', borderRadius: '12px' }}>
                Discard
              </button>
              <button 
                type="submit" 
                className="primary-button" 
                disabled={saving}
                style={{ 
                  flex: 1,
                  height: '52px',
                  background: type === 'add' ? '#10b981' : '#ef4444',
                  color: 'white',
                  borderRadius: '12px',
                  fontSize: '1rem',
                  fontWeight: 800,
                  boxShadow: `0 10px 15px -3px ${type === 'add' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`
                }}
              >
                {saving ? <Loader2 className="animate-spin" size={20} /> : 'Process Adjustment'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

function AlertCircle({ size, style }: { size: number, style?: any }) {
  return (
    <svg 
      xmlns="http://www.w3.org/2000/svg" 
      width={size} 
      height={size} 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="2" 
      strokeLinecap="round" 
      strokeLinejoin="round" 
      style={style}
    >
      <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
    </svg>
  )
}
