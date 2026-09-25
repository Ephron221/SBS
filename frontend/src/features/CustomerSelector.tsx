import { useState, useEffect, useRef } from 'react'
import { User, Search, Check, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import { useToast } from '../context/ToastContext'
import type { Customer } from '../types'

interface Props {
  selectedCustomerId: string | null
  onSelect: (customer: Customer | null) => void
}

export default function CustomerSelector({ selectedCustomerId, onSelect }: Props) {
  const { toast } = useToast()
  const [customers, setCustomers] = useState<Customer[]>([])
  const [search, setSearch] = useState('')
  const [isOpen, setIsOpen] = useState(false)
  const [showAdd, setShowAdd] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' })
  const [saving, setSaving] = useState(false)

  const fetchCustomers = async () => {
    setLoading(true)
    try {
      const res = await api.get('/api/customers')
      setCustomers(res.data.data || [])
    } catch (e) {
      console.error('[CustomerSelector] Failed to fetch customers:', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCustomers()
    const clickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) setIsOpen(false)
    }
    document.addEventListener('mousedown', clickOutside)
    return () => document.removeEventListener('mousedown', clickOutside)
  }, [])

  const filtered = customers.filter(c => 
    c.name.toLowerCase().includes(search.toLowerCase()) || 
    (c.phone && c.phone.includes(search))
  )

  const handleAdd = async () => {
    const trimmedName = newCustomer.name.trim()
    if (!trimmedName) {
      toast.warning('Name Required', 'Please enter a customer name.')
      return
    }

    setSaving(true)
    try {
      const payload = {
        name: trimmedName,
        phone: newCustomer.phone.trim() || undefined,
        email: newCustomer.email.trim() || undefined,
      }
      const res = await api.post('/api/customers', payload)
      const customerData = res.data.data

      if (res.data.isExisting) {
        toast.info('Existing Customer', res.data.message || `Selected existing customer ${customerData.name}`)
      } else {
        toast.success('Customer Added', `Customer ${customerData.name} saved and selected.`)
      }

      // Add to list if not already present
      setCustomers(prev => {
        const exists = prev.some(c => c.id === customerData.id)
        return exists ? prev : [customerData, ...prev]
      })

      onSelect(customerData)
      setShowAdd(false)
      setNewCustomer({ name: '', phone: '', email: '' })
    } catch (err: any) {
      const msg = err.response?.data?.message || err.message || 'Failed to save customer'
      toast.error('Customer Error', msg)
    } finally {
      setSaving(false)
    }
  }

  const selected = customers.find(c => c.id === selectedCustomerId)

  return (
    <div className="field-group" ref={dropdownRef} style={{ position: 'relative' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span>Customer</span>
        <button
          type="button"
          className="ghost-button"
          style={{ padding: '0.2rem 0.5rem', fontSize: '0.78rem', height: 'auto' }}
          onClick={() => setShowAdd(!showAdd)}
        >
          {showAdd ? 'Cancel' : '+ New Customer'}
        </button>
      </label>

      {showAdd ? (
        <div style={{
          background: 'var(--bg-card, #f8fafc)',
          padding: '0.85rem',
          borderRadius: '10px',
          border: '1px solid var(--border)',
          display: 'grid',
          gap: '0.6rem',
        }}>
          <input
            className="input-field"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            placeholder="Full Name (required)"
            value={newCustomer.name}
            onChange={e => setNewCustomer(prev => ({ ...prev, name: e.target.value }))}
            autoFocus
          />
          <input
            className="input-field"
            style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}
            placeholder="Phone Number (e.g. 078...)"
            value={newCustomer.phone}
            onChange={e => setNewCustomer(prev => ({ ...prev, phone: e.target.value }))}
          />
          <button
            type="button"
            className="primary-button"
            style={{ padding: '0.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            disabled={saving || !newCustomer.name.trim()}
            onClick={handleAdd}
          >
            {saving ? <Loader2 className="animate-spin" size={15} /> : 'Save & Select'}
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div 
            className="input-field" 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            onClick={() => setIsOpen(!isOpen)}
          >
            <User size={14} className="muted" />
            {selected ? (
              <span style={{ fontWeight: 600 }}>{selected.name} {selected.phone && `(${selected.phone})`}</span>
            ) : (
              <span className="muted">Walk-in Customer</span>
            )}
          </div>

          {isOpen && (
            <div className="pos-dropdown" style={{ top: '100%', left: 0, right: 0, marginTop: '0.25rem', zIndex: 100 }}>
              <div style={{ padding: '0.5rem', borderBottom: '1px solid var(--border)' }}>
                <div style={{ position: 'relative' }}>
                  <Search size={14} style={{ position: 'absolute', left: '8px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
                  <input 
                    className="input-field" 
                    style={{ paddingLeft: '1.8rem', paddingBlock: '0.3rem', width: '100%', fontSize: '0.85rem' }} 
                    placeholder="Search customers..."
                    autoFocus
                    value={search}
                    onChange={e => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <ul style={{ listStyle: 'none', margin: 0, padding: '0.25rem', maxHeight: '200px', overflowY: 'auto' }}>
                <li 
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                  onClick={() => { onSelect(null); setIsOpen(false) }}
                  className="list-item-hover"
                >
                  <span>Walk-in Customer</span>
                  {!selectedCustomerId && <Check size={14} />}
                </li>
                {filtered.map(c => (
                  <li 
                    key={c.id}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
                    onClick={() => { onSelect(c); setIsOpen(false) }}
                    className="list-item-hover"
                  >
                    <div>
                      <p style={{ margin: 0, fontWeight: 500 }}>{c.name}</p>
                      {c.phone && <p className="muted" style={{ margin: 0, fontSize: '0.75rem' }}>{c.phone}</p>}
                    </div>
                    {selectedCustomerId === c.id && <Check size={14} />}
                  </li>
                ))}
                {filtered.length === 0 && !loading && (
                  <li style={{ padding: '1rem', textAlign: 'center' }} className="muted">
                    No customers found
                  </li>
                )}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
