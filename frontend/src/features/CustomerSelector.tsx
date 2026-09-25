import { useState, useEffect, useRef } from 'react'
import { User, Search, Check, Loader2 } from 'lucide-react'
import { api } from '../lib/api'
import type { Customer } from '../types'

interface Props {
  selectedCustomerId: string | null
  onSelect: (customer: Customer | null) => void
}

export default function CustomerSelector({ selectedCustomerId, onSelect }: Props) {
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
      console.error(e)
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
    c.phone?.includes(search)
  )

  const handleAdd = async () => {
    if (!newCustomer.name) return
    setSaving(true)
    try {
      const res = await api.post('/api/customers', newCustomer)
      const created = res.data.data
      setCustomers([created, ...customers])
      onSelect(created)
      setShowAdd(false)
      setNewCustomer({ name: '', phone: '', email: '' })
    } catch (err: any) {
      alert(err.response?.data?.message || 'Failed to add customer')
    } finally {
      setSaving(false)
    }
  }

  const selected = customers.find(c => c.id === selectedCustomerId)

  return (
    <div className="field-group" ref={dropdownRef} style={{ position: 'relative' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between' }}>
        Customer
        <button type="button" className="ghost-button" style={{ padding: 0, fontSize: '0.75rem' }} onClick={() => setShowAdd(!showAdd)}>
          {showAdd ? 'Cancel' : '+ New Customer'}
        </button>
      </label>

      {showAdd ? (
        <div style={{ background: '#f8fafc', padding: '0.75rem', borderRadius: '10px', border: '1px solid var(--border)', display: 'grid', gap: '0.5rem' }}>
          <input className="input-field" style={{ padding: '0.4rem' }} placeholder="Name" value={newCustomer.name} onChange={e => setNewCustomer({...newCustomer, name: e.target.value})} />
          <input className="input-field" style={{ padding: '0.4rem' }} placeholder="Phone" value={newCustomer.phone} onChange={e => setNewCustomer({...newCustomer, phone: e.target.value})} />
          <button type="button" className="primary-button" style={{ padding: '0.4rem' }} disabled={saving} onClick={handleAdd}>
            {saving ? <Loader2 className="animate-spin" size={14} /> : 'Save & Select'}
          </button>
        </div>
      ) : (
        <div style={{ position: 'relative' }}>
          <div 
            className="input-field" 
            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'white' }}
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
                  style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
                  onClick={() => { onSelect(null); setIsOpen(false) }}
                  className="list-item-hover"
                >
                  <span>Walk-in Customer</span>
                  {!selectedCustomerId && <Check size={14} />}
                </li>
                {filtered.map(c => (
                  <li 
                    key={c.id}
                    style={{ padding: '0.5rem 0.75rem', borderRadius: '6px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between' }}
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
                {filtered.length === 0 && !loading && <li style={{ padding: '1rem', textAlign: 'center' }} className="muted">No customers found</li>}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
