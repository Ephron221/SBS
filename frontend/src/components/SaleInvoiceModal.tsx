import { useState } from 'react'
import { Printer, Trash2, X, Receipt, User, CreditCard, Calendar, ShoppingBag, Hash, Phone, UserRoundCheck } from 'lucide-react'
import { api } from '../lib/api'
import type { Sale } from '../types'
import { useConfirm } from '../context/ConfirmContext'
import { useToast } from '../context/ToastContext'

interface Props { sale: Sale; onClose: () => void; isManager: boolean; onDeleted: () => void }

export default function SaleInvoiceModal({ sale, onClose, isManager, onDeleted }: Props) {
  const [deleting, setDeleting] = useState(false)
  const { confirm } = useConfirm()
  const { toast } = useToast()

  const handleDelete = async () => {
    const ok = await confirm({
      title: 'Void Sale Invoice',
      message: `Are you sure you want to void invoice ${sale.invoiceNumber}? This will reverse the transaction and return items to inventory.`,
      confirmLabel: 'Void Invoice',
      danger: true,
    })
    if (!ok) return

    setDeleting(true)
    try {
      await api.delete(`/api/sales/${sale.id}`)
      toast.success('Invoice Voided', `Invoice ${sale.invoiceNumber} has been voided.`)
      onDeleted()
      onClose()
    } catch {
      toast.error('Void Failed', 'Failed to void invoice. Please try again.')
    } finally {
      setDeleting(false)
    }
  }

  const discountVal = sale.discountAmount ?? 0
  const subtotal = sale.totalAmount + discountVal
  const customerName = sale.customer?.name || sale.customerName || 'Walk-in Customer'
  const customerPhone = sale.customer?.phone

  return (
    <div className="modal-overlay animate-fade-in" onClick={onClose} style={{ zIndex: 120 }}>
      <div
        className="modal-card"
        onClick={(e) => e.stopPropagation()}
        style={{
          maxWidth: 640,
          padding: 0,
          overflow: 'hidden',
          border: '1px solid var(--border)',
          display: 'flex',
          flexDirection: 'column',
          maxHeight: '92vh',
          background: 'var(--bg-card)',
        }}
      >
        {/* Fixed Header */}
        <div className="no-print" style={{ padding: '1.25rem 2rem', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem' }}>
            <div className="stat-icon" style={{ background: 'var(--primary)', color: 'white', width: '40px', height: '40px', borderRadius: '12px' }}>
              <Receipt size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.15rem', fontWeight: 800 }}>Invoice Details</h3>
              <p className="muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Hash size={12} /> {sale.invoiceNumber}
              </p>
            </div>
          </div>
          <button className="ghost-button icon-btn" onClick={onClose} style={{ background: 'var(--bg-main)' }}><X size={18} /></button>
        </div>

        {/* Scrollable Content Area */}
        <div style={{ padding: '2rem', background: 'var(--bg-card)', overflowY: 'auto', flex: 1 }}>
          <div id="invoice-print">
            <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
              <h2 style={{ margin: 0, color: 'var(--primary)', fontSize: '2rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Smart Boutique</h2>
              <p style={{ margin: '0.4rem 0', letterSpacing: '0.3em', fontWeight: 700, fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Official Sales Receipt</p>
              <div style={{ display: 'inline-block', marginTop: '1rem', padding: '0.5rem 1.25rem', border: '2px solid var(--primary)', borderRadius: '10px', fontWeight: 800, fontSize: '1rem', color: 'var(--primary)' }}>
                {sale.invoiceNumber}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '2rem' }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: '0.6rem' }}>Customer Information</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  <User size={15} style={{ color: 'var(--primary)' }} /> {customerName}
                </div>
                {customerPhone ? (
                  <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.3rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                    <Phone size={12} /> {customerPhone}
                  </p>
                ) : (
                  <p className="muted" style={{ fontSize: '0.75rem', marginTop: '0.2rem' }}>No phone number provided</p>
                )}
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="eyebrow" style={{ marginBottom: '0.6rem' }}>Payment method</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: 'flex-end', fontWeight: 700, fontSize: '1rem', color: 'var(--text-main)' }}>
                  <CreditCard size={16} style={{ color: 'var(--primary)' }} /> {sale.paymentMethod || 'Cash'}
                </div>
                <p className="muted" style={{ fontSize: '0.68rem', marginTop: '0.2rem' }}>Payment received</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'flex-end', fontSize: '0.8rem', marginTop: '0.2rem' }} className="muted">
                  {new Date(sale.createdAt).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' })} <Calendar size={13} />
                </div>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', padding: '1rem 1.25rem', background: 'var(--bg-main)', borderRadius: '14px', border: '1px solid var(--border)' }}>
              <div>
                <p className="eyebrow" style={{ marginBottom: '0.3rem', fontSize: '0.65rem' }}>Sold by</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-main)' }}>
                  <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: 'white', display: 'grid', placeItems: 'center', fontSize: '0.7rem' }}>
                    <UserRoundCheck size={13} />
                  </div>
                  {sale.seller?.name || 'Sales staff'}
                </div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <p className="eyebrow" style={{ marginBottom: '0.3rem', fontSize: '0.65rem' }}>Status</p>
                <div className="badge badge-success" style={{ padding: '0.3rem 0.8rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.7rem' }}>PAID IN FULL</div>
              </div>
            </div>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '2rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--primary)' }}>
                  <th style={{ textAlign: 'left', padding: '0.85rem 0', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</th>
                  <th style={{ textAlign: 'center', padding: '0.85rem 0', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Qty</th>
                  <th style={{ textAlign: 'right', padding: '0.85rem 0', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Unit Price</th>
                  <th style={{ textAlign: 'right', padding: '0.85rem 0', fontWeight: 800, fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Total</th>
                </tr>
              </thead>
              <tbody>
                {(sale.items ?? []).map((i) => (
                  <tr key={i.id} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem 0' }}>
                      <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-main)' }}>{i.product.name}</div>
                      <div className="muted" style={{ fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem', marginTop: '0.1rem' }}>
                        <ShoppingBag size={11} /> {i.product.unit || 'Piece'} {i.product.size ? `• Size: ${i.product.size}` : ''}
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', padding: '1rem 0', fontWeight: 600 }}>{i.quantity}</td>
                    <td style={{ textAlign: 'right', padding: '1rem 0' }}>RWF {i.unitPrice.toLocaleString()}</td>
                    <td style={{ textAlign: 'right', padding: '1rem 0', fontWeight: 800, color: 'var(--primary)' }}>RWF {i.lineTotal.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
              <div style={{ width: '280px', background: 'var(--bg-main)', padding: '1.25rem', borderRadius: '14px', border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', fontSize: '0.9rem' }}>
                  <span className="muted" style={{ fontWeight: 600 }}>Subtotal</span>
                  <span style={{ fontWeight: 700 }}>RWF {subtotal.toLocaleString()}</span>
                </div>
                {discountVal > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.3rem 0', color: '#ef4444', fontSize: '0.9rem' }}>
                    <span className="muted" style={{ fontWeight: 600, color: 'inherit' }}>Discount</span>
                    <span style={{ fontWeight: 700 }}>−RWF {discountVal.toLocaleString()}</span>
                  </div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 0 0.25rem', borderTop: '2px dashed var(--border)', marginTop: '0.6rem', fontWeight: 900, fontSize: '1.25rem' }}>
                  <span style={{ color: 'var(--text-main)' }}>Total</span>
                  <span style={{ color: 'var(--primary)' }}>RWF {sale.totalAmount.toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div style={{ textAlign: 'center', marginTop: '3rem', borderTop: '1px dashed var(--border)', paddingTop: '1.5rem' }}>
              <p style={{ fontWeight: 700, color: 'var(--primary)', marginBottom: '0.2rem', fontSize: '0.9rem' }}>Thank you for your business!</p>
              <p className="muted" style={{ fontSize: '0.75rem' }}>Visit us again at Smart Boutique for premium collections.</p>
            </div>
          </div>
        </div>

        {/* Fixed Footer */}
        <div className="invoice-modal-footer no-print" style={{ padding: '1.25rem 2rem', background: 'var(--bg-main)', borderTop: '1px solid var(--border)', display: 'flex', gap: '1rem', flexShrink: 0 }}>
          <button className="primary-button" style={{ flex: 2, display: 'flex', gap: '0.6rem', alignItems: 'center', justifyContent: 'center', height: '48px', fontSize: '1rem', background: 'var(--primary)', color: 'white' }} onClick={() => window.print()}>
            <Printer size={18} /> Print Invoice
          </button>
          {isManager && (
            <button
              className="ghost-button"
              style={{ flex: 1.2, color: '#ef4444', borderColor: '#fee2e2', background: 'var(--bg-card)', display: 'flex', gap: '0.4rem', alignItems: 'center', justifyContent: 'center', height: '48px' }}
              onClick={handleDelete}
              disabled={deleting}
            >
              <Trash2 size={16} /> {deleting ? 'Voiding...' : 'Void Sale'}
            </button>
          )}
          <button className="ghost-button" style={{ flex: 0.8, height: '48px', background: 'var(--bg-card)' }} onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  )
}
