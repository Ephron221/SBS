import { useState, useRef, useEffect, useMemo } from 'react'
import { Minus, Plus, Printer, Trash2, Search, ShoppingBag, User, CreditCard, CheckCircle2, Percent, Globe, Package, Tag, ArrowRight, X, Zap, Loader2, AlertCircle, Sparkles, Layers, Barcode, Boxes } from 'lucide-react'
import { api } from '../lib/api'
import { useAuth } from '../context/AuthContext'
import { useToast } from '../context/ToastContext'
import type { Product, Customer } from '../types'
import CustomerSelector from './CustomerSelector'

interface CartItem { product: Product; quantity: number }
interface CompletedSale { 
  invoiceNumber: string; 
  customerName: string; 
  paymentMethod: string; 
  items: CartItem[]; 
  total: number; 
  subtotal: number;
  discountAmount: number;
  discountType: 'PERCENT' | 'FIXED';
  date: string; 
  generatedBy: string;
  salesChannel: string;
}

interface Props {
  products: Product[]
  onSaleComplete: () => void
  search: string
  setSearch: (s: string) => void
}

export default function POSCart({ products, onSaleComplete, search, setSearch }: Props) {
  const { session } = useAuth()
  const { toast } = useToast()
  const [cart, setCart] = useState<CartItem[]>([])
  const [isSearchFocused, setIsSearchFocused] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const [cartPulse, setCartPulse] = useState(false)
  const [isCartOpen, setIsCartOpen] = useState(false)

  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [paymentMethod, setPaymentMethod] = useState('Cash')
  const [salesChannel, setSalesChannel] = useState('In-Store')
  const [discountType, setDiscountType] = useState<'PERCENT' | 'FIXED'>('PERCENT')
  const [discountValue, setDiscountValue] = useState(0)
  
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [invoice, setInvoice] = useState<CompletedSale | null>(null)
  
  const searchContainerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const fetchCustomers = async () => {
      try {
        const res = await api.get('/api/customers')
        setCustomers(res.data.data || [])
      } catch (e) {
        console.error(e)
      }
    }
    fetchCustomers()
  }, [])

  // Global shortcut: press '/' to focus search
  useEffect(() => {
    const handleGlobalKey = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' && document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault()
        document.getElementById('pos-search-input')?.focus()
      }
    }
    window.addEventListener('keydown', handleGlobalKey)
    return () => window.removeEventListener('keydown', handleGlobalKey)
  }, [])

  useEffect(() => {
    const input = document.getElementById('pos-search-input')
    if (!input) return

    const onFocus = () => setIsSearchFocused(true)
    const onBlur = () => setTimeout(() => setIsSearchFocused(false), 200) // Delay to allow clicks on dropdown
    const onKey = (e: any) => handleKeyDown(e)

    input.addEventListener('focus', onFocus)
    input.addEventListener('blur', onBlur)
    input.addEventListener('keydown', onKey)

    return () => {
      input.removeEventListener('focus', onFocus)
      input.removeEventListener('blur', onBlur)
      input.removeEventListener('keydown', onKey)
    }
  }, [search, products, customers]) // Re-bind when data changes so handleKeyDown has latest state

  const { matches, related, matchedCustomers } = useMemo(() => {
    const query = search.toLowerCase().trim();
    if (query.length < 1) {
      return { 
        matches: [],
        related: [],
        matchedCustomers: []
      }
    }

    const matches = products.filter((p) => {
      const nameMatch = p.name.toLowerCase().includes(query)
      const skuMatch = (p.sku || '').toLowerCase().includes(query)
      const catName = (p as any).categoryName || (typeof p.category === 'string' ? p.category : (p.category as any)?.name) || ''
      const catMatch = catName.toLowerCase().includes(query)
      return (nameMatch || skuMatch || catMatch) && p.currentQuantity > 0
    }).slice(0, 8)

    let related: Product[] = []
    if (matches.length > 0) {
      const topMatch = matches[0] as any
      const topMatchCategory = topMatch.categoryName || (typeof topMatch.category === 'string' ? topMatch.category : topMatch.category?.name)
      
      related = products.filter(p => {
        const pCat = (p as any).categoryName || (typeof p.category === 'string' ? p.category : (p.category as any)?.name)
        return pCat === topMatchCategory && 
               !matches.find(m => m.id === p.id) &&
               p.currentQuantity > 0
      }).slice(0, 4)
    }

    const matchedCustomers = customers.filter(c => 
      c.name.toLowerCase().includes(query) || 
      c.phone?.includes(query)
    ).slice(0, 5)

    return { matches, related, matchedCustomers }
  }, [search, products, customers])

  const combinedFiltered = [...matches, ...related, ...matchedCustomers]

  useEffect(() => {
    setSelectedIndex(0)
  }, [search])

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.product.id === product.id)
      if (existing) return prev.map((i) => i.product.id === product.id ? { ...i, quantity: Math.min(i.quantity + 1, product.currentQuantity) } : i)
      return [...prev, { product, quantity: 1 }]
    })
    setSearch('')
    setCartPulse(true)
    setTimeout(() => setCartPulse(false), 300)
    document.getElementById('pos-search-input')?.focus()
  }

  const handleKeyDown = (e: KeyboardEvent) => {
    if (combinedFiltered.length === 0) return
    if (e.key === 'ArrowDown') {
      e.preventDefault(); setSelectedIndex(prev => (prev + 1) % combinedFiltered.length)
    } else if (e.key === 'ArrowUp') {
      e.preventDefault(); setSelectedIndex(prev => (prev - 1 + combinedFiltered.length) % combinedFiltered.length)
    } else if (e.key === 'Enter') {
      e.preventDefault(); 
      const selected = combinedFiltered[selectedIndex]
      if (selected) {
        if ('sellingPrice' in selected) {
          addToCart(selected as Product)
        } else {
          setSelectedCustomer(selected as Customer)
          setSearch('')
          setIsSearchFocused(false)
        }
      }
    } else if (e.key === 'Escape') {
      setSearch(''); setIsSearchFocused(false); (e.target as HTMLInputElement).blur()
    }
  }

  const updateQty = (id: string, qty: number) => {
    if (qty < 1) return removeFromCart(id)
    setCart((prev) => prev.map((i) => i.product.id === id ? { ...i, quantity: Math.min(qty, i.product.currentQuantity) } : i))
  }

  const highlightMatch = (text: string, query: string) => {
    if (!query) return text
    const parts = text.split(new RegExp(`(${query})`, 'gi'))
    return parts.map((p, i) => p.toLowerCase() === query.toLowerCase() 
      ? <strong key={i} style={{ color: 'var(--accent)', fontWeight: 900, textDecoration: 'underline' }}>{p}</strong> 
      : p
    )
  }

  const subtotal = useMemo(() => cart.reduce((s, i) => s + i.product.sellingPrice * i.quantity, 0), [cart])
  const discountAmount = useMemo(() => (discountType === 'PERCENT' ? (subtotal * discountValue) / 100 : discountValue), [subtotal, discountType, discountValue])
  const total = Math.max(0, subtotal - discountAmount)

  const handleCheckout = async () => {
    if (!cart.length) return
    setLoading(true); setError('')
    try {
      const customerName = selectedCustomer?.name || 'Walk-in'
      const res = await api.post('/api/sales', { 
        items: cart.map(i => ({ productId: i.product.id, quantity: i.quantity })), 
        paymentMethod, 
        customerName, 
        discountAmount, 
        discountType, 
        salesChannel,
        customerId: selectedCustomer?.id
      })
      setInvoice({ 
        invoiceNumber: res.data.invoiceNumber, 
        customerName, 
        paymentMethod, 
        items: [...cart], 
        total, 
        subtotal, 
        discountAmount, 
        discountType, 
        date: new Date().toLocaleString(), 
        generatedBy: session?.name || 'System', 
        salesChannel 
      })
      setCart([]); setSelectedCustomer(null); setPaymentMethod('Cash'); setDiscountValue(0); onSaleComplete()
      toast.success('Sale Completed', `Invoice ${res.data.invoiceNumber} processed successfully.`)
    } catch (err: any) { 
      const msg = err.response?.data?.message || 'Checkout failed.'
      setError(msg)
      toast.error('Sale Failed', msg)
    } finally { 
      setLoading(false) 
    }
  }

  const getProductInfo = (p: Product) => {
    const parts = [];
    if (p.size && p.size !== 'N/A') parts.push(`Size: ${p.size}`);
    if (p.color) parts.push(`Color: ${p.color}`);
    return parts.length > 0 ? parts.join(' | ') : null;
  }

  const getStockStatus = (p: Product) => {
    if (p.currentQuantity <= 0) return { label: 'OUT OF STOCK', class: 'badge-danger' }
    if (p.currentQuantity <= (p.minimumStockLevel || 5)) return { label: 'LOW STOCK', class: 'badge-warning' }
    return { label: 'IN STOCK', class: 'badge-success' }
  }

  const ProductResultItem = ({ p, idx, isRelated = false }: { p: Product, idx: number, isRelated?: boolean }) => {
    const status = getStockStatus(p);
    return (
      <li 
        key={p.id} 
        onClick={() => addToCart(p)} 
        onMouseEnter={() => setSelectedIndex(idx)} 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          padding: '1.25rem', 
          borderRadius: '16px', 
          background: selectedIndex === idx ? 'var(--bg-main)' : 'white', 
          cursor: 'pointer', 
          border: '1px solid', 
          borderColor: selectedIndex === idx ? 'var(--primary)' : 'var(--border)', 
          transition: 'all 0.2s ease',
          marginBottom: '0.5rem',
          boxShadow: selectedIndex === idx ? '0 10px 25px -5px rgba(35, 65, 95, 0.1)' : 'none',
          transform: selectedIndex === idx ? 'translateX(6px)' : 'none'
        }}
      >
        <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center', flex: 2 }}>
          <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: selectedIndex === idx ? 'var(--primary)' : '#f8fafc', color: selectedIndex === idx ? 'white' : 'var(--primary)', display: 'grid', placeItems: 'center', border: '1px solid var(--border)', transition: 'all 0.3s ease' }}>
            {isRelated ? <Layers size={22} /> : (selectedIndex === idx ? <Zap size={22} fill="white" /> : <Package size={22} />)}
          </div>
          <div style={{ textAlign: 'left' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem' }}>
              <h4 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>
                {highlightMatch(p.name, search)}
              </h4>
              {isRelated && <span className="badge" style={{ background: 'var(--accent)', color: 'var(--primary)', fontSize: '0.6rem', fontWeight: 900, textTransform: 'uppercase', padding: '2px 6px', borderRadius: '4px' }}>SIMILAR</span>}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
              <span className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Boxes size={14} /> {(p as any).categoryName || (typeof p.category === 'string' ? p.category : (p.category as any)?.name) || 'General'}
              </span>
              <span style={{ color: 'var(--border)' }}>|</span>
              <span className="muted" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                <Barcode size={14} /> {p.sku || 'NO-SKU'}
              </span>
            </div>
          </div>
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <div style={{ textAlign: 'center', minWidth: '60px' }}>
               <p style={{ fontSize: '1.2rem', fontWeight: 900, margin: 0 }}>{p.currentQuantity}</p>
               <p className="muted" style={{ fontSize: '0.65rem', textTransform: 'uppercase', fontWeight: 700 }}>{p.unit}</p>
            </div>
            <span className={`badge ${status.class}`} style={{ padding: '0.4rem 0.6rem', borderRadius: '8px', fontSize: '0.7rem', fontWeight: 800 }}>
              {status.label}
            </span>
          </div>
        </div>
        <div style={{ textAlign: 'right', display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div style={{ fontWeight: 900, color: 'var(--primary)', fontSize: '1.25rem' }}>RWF {p.sellingPrice.toLocaleString()}</div>
          <div style={{ width: '36px', height: '36px', borderRadius: '50%', background: selectedIndex === idx ? 'var(--accent)' : '#f1f5f9', color: selectedIndex === idx ? 'var(--primary)' : 'var(--text-muted)', display: 'grid', placeItems: 'center', transition: 'all 0.2s', boxShadow: selectedIndex === idx ? '0 4px 12px rgba(217, 145, 46, 0.4)' : 'none' }}>
            <Plus size={20} strokeWidth={3} />
          </div>
        </div>
      </li>
    )
  }

  const CustomerResultItem = ({ c, idx }: { c: Customer, idx: number }) => (
    <li 
      key={c.id} 
      onClick={() => { setSelectedCustomer(c); setSearch(''); setIsSearchFocused(false) }} 
      onMouseEnter={() => setSelectedIndex(idx)} 
      style={{ 
        display: 'flex', 
        justifyContent: 'space-between', 
        alignItems: 'center', 
        padding: '1rem 1.25rem', 
        borderRadius: '16px', 
        background: selectedIndex === idx ? 'var(--bg-main)' : 'white', 
        cursor: 'pointer', 
        border: '1px solid', 
        borderColor: selectedIndex === idx ? 'var(--primary)' : 'var(--border)', 
        transition: 'all 0.2s ease',
        marginBottom: '0.5rem',
        transform: selectedIndex === idx ? 'translateX(6px)' : 'none'
      }}
    >
      <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
        <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: selectedIndex === idx ? 'var(--primary)' : '#eff6ff', color: selectedIndex === idx ? 'white' : '#1e40af', display: 'grid', placeItems: 'center', border: '1px solid var(--border)' }}>
          <User size={20} />
        </div>
        <div style={{ textAlign: 'left' }}>
          <h4 style={{ fontSize: '1rem', fontWeight: 800, margin: 0, color: 'var(--primary)' }}>
            {highlightMatch(c.name, search)}
          </h4>
          <p className="muted" style={{ fontSize: '0.75rem', margin: 0 }}>{c.phone || 'No phone'}</p>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--accent)', fontWeight: 700, fontSize: '0.8rem' }}>
        SELECT CUSTOMER <ArrowRight size={14} />
      </div>
    </li>
  )

  const fastSellingProducts = useMemo(() => {
    return products.filter(p => p.currentQuantity > 0).sort((a, b) => b.currentQuantity - a.currentQuantity).slice(0, 10)
  }, [products])

  const removeFromCart = (id: string) => setCart((prev) => prev.filter((i) => i.product.id !== id))

  if (invoice) return (
    <div className="panel-card animate-fade-in" style={{ maxWidth: 540, margin: '2rem auto', border: 'none', boxShadow: 'var(--shadow)' }}>
      <div id="invoice-print" style={{ padding: '2.5rem' }}>
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <div style={{ display: 'inline-flex', background: '#dcfce7', color: '#166534', padding: '1.25rem', borderRadius: '50%', marginBottom: '1rem' }}><CheckCircle2 size={40} /></div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 900 }}>Payment Finalized</h2>
          <p className="muted" style={{ fontWeight: 600 }}>Invoice ID: {invoice.invoiceNumber}</p>
        </div>
        <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem', fontSize: '0.9rem' }}>
            <span className="muted">Customer</span><span style={{ fontWeight: 700 }}>{invoice.customerName}</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span className="muted">Details</span><span style={{ fontWeight: 700 }}>{invoice.paymentMethod} • {invoice.salesChannel}</span>
          </div>
        </div>
        <div style={{ marginTop: '2rem', borderTop: '2px dashed var(--border)', paddingTop: '1.5rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ fontSize: '1.1rem', fontWeight: 600 }}>Total Collected</span>
            <span style={{ fontSize: '1.8rem', fontWeight: 900, color: 'var(--primary)' }}>RWF {invoice.total.toLocaleString()}</span>
          </div>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '1rem', padding: '0 2.5rem 2.5rem' }}>
        <button className="primary-button" style={{ flex: 1.5, height: '54px', display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'center' }} onClick={() => window.print()}><Printer size={20} /> Print Receipt</button>
        <button className="ghost-button" style={{ flex: 1, height: '54px', fontWeight: 700 }} onClick={() => setInvoice(null)}>New Sale</button>
      </div>
    </div>
  )

  return (
    <>
      <div className={`cart-overlay ${isCartOpen ? 'open' : ''}`} onClick={() => setIsCartOpen(false)} />

      <button className="floating-cart-trigger" onClick={() => setIsCartOpen(true)}>
        <ShoppingBag size={20} />
        <span>View Order ({cart.length})</span>
        <span style={{ borderLeft: '1px solid rgba(255,255,255,0.3)', paddingLeft: '1rem' }}>RWF {total.toLocaleString()}</span>
      </button>

      <div className="pos-container animate-fade-in">
        <div className="pos-left">
          <div style={{ position: 'relative' }} ref={searchContainerRef}>
            {isSearchFocused && (combinedFiltered.length > 0 || search) && (
              <ul className="pos-dropdown animate-fade-in" style={{
                position: 'absolute',
                top: '-1.5rem',
                left: 0,
                right: 0,
                border: '1px solid var(--border)',
                boxShadow: '0 25px 50px -12px rgba(0,0,0,0.15)',
                borderRadius: '20px',
                padding: '1rem',
                maxHeight: '600px',
                overflowY: 'auto',
                zIndex: 100,
                background: 'white'
              }}>
                {matches.length > 0 && (
                  <>
                    <li style={{ padding: '0.5rem 0.8rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--text-muted)', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                      <span>Direct Matches</span>
                      <span>{matches.length} Results</span>
                    </li>
                    <div style={{ marginTop: '0.5rem' }}>
                      {matches.map((p, idx) => (
                        <ProductResultItem key={p.id} p={p} idx={idx} />
                      ))}
                    </div>
                  </>
                )}

                {related.length > 0 && (
                  <>
                    <li style={{ padding: '1.25rem 0.8rem 0.5rem', fontSize: '0.75rem', fontWeight: 900, color: 'var(--accent)', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em', borderTop: '1px dashed #f1f5f9', marginTop: '0.5rem', textTransform: 'uppercase' }}>
                      <span>Suggestions in this category</span>
                      <span>{related.length} items</span>
                    </li>
                    <div style={{ marginTop: '0.5rem' }}>
                      {related.map((p, idx) => (
                        <ProductResultItem key={p.id} p={p} idx={matches.length + idx} isRelated />
                      ))}
                    </div>
                  </>
                )}

                {matchedCustomers.length > 0 && (
                  <>
                    <li style={{ padding: '1.25rem 0.8rem 0.5rem', fontSize: '0.75rem', fontWeight: 900, color: '#1e40af', display: 'flex', justifyContent: 'space-between', letterSpacing: '0.1em', borderTop: '1px dashed #f1f5f9', marginTop: '0.5rem', textTransform: 'uppercase' }}>
                      <span>Customers</span>
                      <span>{matchedCustomers.length} results</span>
                    </li>
                    <div style={{ marginTop: '0.5rem' }}>
                      {matchedCustomers.map((c, idx) => (
                        <CustomerResultItem key={c.id} c={c} idx={matches.length + related.length + idx} />
                      ))}
                    </div>
                  </>
                )}

                {combinedFiltered.length === 0 && search && (
                  <li style={{ padding: '3rem 1rem', textAlign: 'center' }}>
                    <Search size={40} style={{ opacity: 0.1, marginBottom: '1rem', margin: '0 auto' }} />
                    <p className="muted" style={{ fontWeight: 600 }}>No results match "{search}"</p>
                  </li>
                )}
              </ul>
            )}
          </div>

          {!search && (
            <div className="panel-card animate-fade-in" style={{ marginBottom: '1.5rem', background: 'transparent', border: 'none', boxShadow: 'none', padding: 0 }}>
               <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', fontSize: '1rem', fontWeight: 800, color: 'var(--primary)', marginBottom: '1rem' }}>
                <Zap size={18} fill="var(--accent)" color="var(--accent)" /> QUICK ACCESS ITEMS
              </h3>
              <div className="quick-add-grid">
                {fastSellingProducts.map(p => (
                  <div key={p.id} className="quick-add-item" onClick={() => addToCart(p)}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '10px', background: 'var(--bg-main)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}>
                      <Package size={20} />
                    </div>
                    <p style={{ fontSize: '0.85rem', fontWeight: 700, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', width: '100%' }}>{p.name}</p>
                    <p style={{ fontSize: '0.75rem', fontWeight: 800, color: 'var(--accent)', margin: 0 }}>RWF {p.sellingPrice.toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="panel-card cart-card-main" style={{ border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.03)', background: 'white', borderRadius: '24px' }}>
            <div className="panel-head" style={{ padding: '1.5rem 1.75rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1.2rem' }}>
                <div className={cartPulse ? 'animate-cart-pulse' : ''} style={{ position: 'relative', background: 'var(--bg-main)', padding: '0.6rem', borderRadius: '14px', color: 'var(--primary)', transition: 'transform 0.2s cubic-bezier(0.175, 0.885, 0.32, 1.275)' }}>
                  <ShoppingBag size={24} />
                  {cart.length > 0 && <span style={{ position: 'absolute', top: '-6px', right: '-6px', background: '#ef4444', color: 'white', fontSize: '0.65rem', width: '22px', height: '22px', borderRadius: '50%', display: 'grid', placeItems: 'center', fontWeight: 900, border: '3px solid white' }}>{cart.length}</span>}
                </div>
                {selectedCustomer ? `Order for ${selectedCustomer.name}` : 'Current Order'}
              </h3>
              {cart.length > 0 && <button className="ghost-button" onClick={() => setCart([])} style={{ fontSize: '0.8rem', color: '#ef4444', fontWeight: 700, padding: '0.5rem 1rem', borderRadius: '10px' }}>Empty Basket</button>}
            </div>
            <div className="cart-items-scroll" style={{ padding: '0 1.5rem 1.5rem', maxHeight: '500px' }}>
              {cart.length === 0 ? (
                <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
                  <div style={{ width: '120px', height: '120px', borderRadius: '50%', background: '#f8fafc', display: 'grid', placeItems: 'center', margin: '0 auto 2rem', color: '#cbd5e1', border: '3px dashed #e2e8f0' }}><ShoppingBag size={56} /></div>
                  <h3 style={{ color: 'var(--text-main)', marginBottom: '0.75rem', fontWeight: 800 }}>Point of Sale Ready</h3>
                  <p className="muted" style={{ maxWidth: '280px', margin: '0 auto', fontSize: '0.9rem', lineHeight: 1.6 }}>Scan barcodes or search items in the header to start processing sales.</p>
                </div>
              ) : (
                <div className="list-stack" style={{ gap: '1rem' }}>
                  {cart.map((item) => (
                    <div key={item.product.id} className="list-item animate-slide-in" style={{
                      padding: '1.25rem',
                      background: 'white',
                      border: '1px solid var(--border)',
                      borderRadius: '20px',
                      boxShadow: '0 4px 12px -2px rgba(0,0,0,0.03)'
                    }}>
                      <div style={{ flex: 1, display: 'flex', gap: '1.25rem', alignItems: 'center' }}>
                        <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: 'var(--bg-main)', display: 'grid', placeItems: 'center', color: 'var(--primary)' }}><Tag size={22} /></div>
                        <div style={{ textAlign: 'left' }}>
                          <p style={{ fontWeight: 800, margin: 0, color: 'var(--primary)', fontSize: '1.05rem' }}>{item.product.name}</p>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', marginTop: '0.2rem' }}>
                             <span className="muted" style={{ fontSize: '0.8rem', fontWeight: 500 }}>{getProductInfo(item.product) || 'Standard'}</span>
                             <span style={{ fontSize: '0.85rem', fontWeight: 900, color: 'var(--accent)' }}>@ RWF {item.product.sellingPrice.toLocaleString()}</span>
                          </div>
                        </div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '1.75rem' }}>
                        <div className="qty-control" style={{ background: '#f1f5f9', padding: '0.4rem', borderRadius: '16px' }}>
                          <button className="icon-btn" style={{ background: 'white', width: '38px', height: '38px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} onClick={() => updateQty(item.product.id, item.quantity - 1)}><Minus size={16} /></button>
                          <span style={{ minWidth: '50px', textAlign: 'center', fontWeight: 900, fontSize: '1.15rem' }}>{item.quantity}</span>
                          <button className="icon-btn" style={{ background: 'white', width: '38px', height: '38px', borderRadius: '12px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }} onClick={() => updateQty(item.product.id, item.quantity + 1)}><Plus size={16} /></button>
                        </div>
                        <div style={{ width: '150px', textAlign: 'right' }}>
                          <p className="eyebrow" style={{ fontSize: '0.65rem', marginBottom: '0.2rem', color: 'var(--text-muted)' }}>LINE TOTAL</p>
                          <p style={{ fontWeight: 900, fontSize: '1.2rem', color: 'var(--primary)', margin: 0 }}>RWF {(item.product.sellingPrice * item.quantity).toLocaleString()}</p>
                        </div>
                        <button className="ghost-button icon-btn" onClick={() => removeFromCart(item.product.id)} style={{ color: '#ef4444', border: '1px solid #fee2e2', width: '44px', height: '44px', borderRadius: '14px' }}><Trash2 size={20} /></button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className={`pos-right ${isCartOpen ? 'open' : ''}`}>
          <div className="panel-card cart-card" style={{ height: '100%', display: 'flex', flexDirection: 'column', padding: '2.5rem', border: 'none', boxShadow: 'var(--shadow)', borderRadius: '24px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', fontSize: '1.3rem', fontWeight: 900 }}><div style={{ padding: '0.6rem', background: '#eff6ff', borderRadius: '14px', color: '#1e40af' }}><CreditCard size={24} /></div> Order Checkout</h3>
              <button className="icon-btn" style={{ background: '#f1f5f9', display: 'none' }} onClick={() => setIsCartOpen(false)} id="mobile-cart-close">
                <X size={20} />
              </button>
              <style>{`
                @media (max-width: 1024px) {
                  #mobile-cart-close { display: grid !important; }
                }
              `}</style>
            </div>

            <div className="cart-items-scroll" style={{ display: 'none', marginBottom: '2rem' }} id="mobile-cart-items">
              <style>{`
                @media (max-width: 1024px) {
                  #mobile-cart-items { display: block !important; }
                }
              `}</style>
               <div className="list-stack" style={{ gap: '0.75rem' }}>
                {cart.map((item) => (
                  <div key={item.product.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#f8fafc', borderRadius: '16px' }}>
                    <div>
                      <p style={{ fontWeight: 700, margin: 0 }}>{item.product.name}</p>
                      <p className="muted" style={{ fontSize: '0.8rem', margin: 0 }}>{item.quantity} x RWF {item.product.sellingPrice.toLocaleString()}</p>
                    </div>
                    <p style={{ fontWeight: 800, margin: 0 }}>RWF {(item.product.sellingPrice * item.quantity).toLocaleString()}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="form-grid" style={{ gap: '1.75rem' }}>
              <CustomerSelector
                selectedCustomerId={selectedCustomer?.id || null}
                onSelect={(c) => setSelectedCustomer(c)}
              />
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.25rem' }}>
                <div className="field-group">
                  <label style={{ fontWeight: 700 }}><CreditCard size={15} /> Payment Mode</label>
                  <select className="input-field" value={paymentMethod} onChange={(e) => setPaymentMethod(e.target.value)} style={{ height: '54px', borderRadius: '14px', fontWeight: 600 }}>
                    <option value="Cash">Physical Cash</option><option value="Momo">MTN Mobile Money</option><option value="Card">Bank Card</option><option value="Credit">Store Credit</option>
                  </select>
                </div>
                <div className="field-group">
                  <label style={{ fontWeight: 700 }}><Globe size={15} /> Sales Channel</label>
                  <select className="input-field" value={salesChannel} onChange={(e) => setSalesChannel(e.target.value)} style={{ height: '54px', borderRadius: '14px', fontWeight: 600 }}>
                    <option value="In-Store">Physical Shop</option><option value="WhatsApp">WhatsApp Business</option><option value="Instagram">Social Media</option>
                  </select>
                </div>
              </div>
              <div style={{ background: '#f8fafc', padding: '1.75rem', borderRadius: '22px', border: '1px solid var(--border)', marginTop: '0.5rem' }}>
                 <label className="eyebrow" style={{ marginBottom: '1.25rem', display: 'flex', alignItems: 'center', gap: '0.6rem', fontWeight: 900, color: 'var(--text-muted)' }}><Percent size={15} /> APPLY PROMOTIONAL DISCOUNT</label>
                <div style={{ display: 'flex', gap: '1.25rem' }}>
                  <select className="input-field" style={{ width: '130px', height: '52px', fontWeight: 800 }} value={discountType} onChange={(e) => setDiscountType(e.target.value as any)}>
                    <option value="PERCENT">PERCENT %</option><option value="FIXED">FLAT RWF</option>
                  </select>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <input type="number" className="input-field" style={{ width: '100%', height: '52px', fontWeight: 900, fontSize: '1.2rem', paddingRight: '3.5rem' }} value={discountValue} onChange={(e) => setDiscountValue(Number(e.target.value))} />
                    <span style={{ position: 'absolute', right: '1.25rem', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: 'var(--text-muted)', fontSize: '0.9rem' }}>{discountType === 'PERCENT' ? '%' : 'RWF'}</span>
                  </div>
                </div>
              </div>
            </div>
            <div style={{ marginTop: 'auto', paddingTop: '2.5rem' }}>
              <div style={{ background: 'linear-gradient(135deg, var(--primary), var(--primary-strong))', color: 'white', borderRadius: '28px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(35, 65, 95, 0.4)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', opacity: 0.8, fontSize: '1rem', fontWeight: 500 }}><span>Cart Subtotal</span><span>RWF {subtotal.toLocaleString()}</span></div>
                {discountAmount > 0 && <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem', color: '#ffc9c9', fontSize: '1rem', fontWeight: 700 }}><span>Total Savings</span><span>- RWF {discountAmount.toLocaleString()}</span></div>}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid rgba(255,255,255,0.15)', paddingTop: '1.5rem', marginTop: '0.5rem' }}>
                  <span style={{ fontWeight: 600, fontSize: '1.15rem' }}>Final Payable</span>
                  <span style={{ fontSize: '2.2rem', fontWeight: 900, letterSpacing: '-0.03em' }}>RWF {total.toLocaleString()}</span>
                </div>
              </div>
              {error && <div className="error animate-fade-in" style={{ marginTop: '1.5rem', padding: '1.25rem', borderRadius: '16px', background: '#fef2f2', color: '#b91c1c', border: '1px solid #fee2e2', display: 'flex', gap: '0.75rem', alignItems: 'center', fontWeight: 700 }}><AlertCircle size={20} /> {error}</div>}
              <button className="primary-button" style={{ width: '100%', marginTop: '1.75rem', height: '68px', fontSize: '1.3rem', fontWeight: 950, background: 'var(--accent)', color: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '1rem', borderRadius: '20px', boxShadow: '0 15px 30px -5px rgba(217, 145, 46, 0.4)', border: 'none' }} onClick={handleCheckout} disabled={loading || !cart.length}>
                {loading ? <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}><Loader2 className="animate-spin" size={28} /><span>Finalizing Order...</span></div> : <><Sparkles size={28} /> Confirm & Print Receipt</> }
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  )
}
