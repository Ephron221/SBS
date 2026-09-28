import { useEffect, useState } from 'react'
import { api } from '../lib/api'
import type { SBSUser } from '../types'
import { UserPlus, Users, UserCheck, UserX, Loader2, Search, AtSign, Mail, Pencil, Trash2, KeyRound } from 'lucide-react'
import UserForm from '../features/UserForm'
import PasswordResetModal from '../features/PasswordResetModal'
import { useToast } from '../context/ToastContext'
import { useConfirm } from '../context/ConfirmContext'
import { useAuth } from '../context/AuthContext'

export default function UsersPage() {
  const { session } = useAuth()
  const { toast } = useToast()
  const { confirm } = useConfirm()
  const [users, setUsers] = useState<SBSUser[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [showAddForm, setShowAddUser] = useState(false)
  const [editingUser, setEditingUser] = useState<SBSUser | null>(null)
  const [resetPasswordUser, setResetPasswordUser] = useState<SBSUser | null>(null)
  const [toggling, setToggling] = useState<string | null>(null)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const fetchUsers = async () => {
    setLoading(true)
    try {
      const r = await api.get('/api/admin/users')
      setUsers(r.data.data || [])
    } catch {
      toast.error('Load Failed', 'Could not fetch user list. Please refresh.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { fetchUsers() }, [])

  const handleUserSaved = async (savedUser: SBSUser) => {
    setShowAddUser(false)
    setEditingUser(null)
    toast.success(
      editingUser ? 'User Updated' : 'User Created',
      `${savedUser.name}'s account has been successfully saved.`
    )
    await fetchUsers()
  }

  const toggleActive = async (user: SBSUser) => {
    const newStatus = !user.active
    setToggling(user.id)
    setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: newStatus } : u))
    try {
      await api.patch(`/api/admin/users/${user.id}`, { active: newStatus })
      toast.success(
        newStatus ? 'User Activated' : 'User Deactivated',
        `${user.name}'s account has been ${newStatus ? 'activated' : 'deactivated'}.`
      )
    } catch {
      // Revert on failure
      setUsers(prev => prev.map(u => u.id === user.id ? { ...u, active: !newStatus } : u))
      toast.error('Update Failed', `Could not update ${user.name}'s status.`)
    } finally {
      setToggling(null)
    }
  }

  const handleDelete = async (user: SBSUser) => {
    if (user.id === session?.id) {
      toast.error('Operation Prohibited', 'You cannot delete your own account.')
      return
    }

    const ok = await confirm({
      title: `Delete ${user.name}?`,
      message: `Are you sure you want to permanently delete ${user.name} (@${user.username})? This action cannot be undone.`,
      confirmLabel: 'Delete User',
      danger: true,
    })
    if (!ok) return

    setDeletingId(user.id)
    try {
      await api.delete(`/api/admin/users/${user.id}`)
      toast.success('User Deleted', `${user.name} has been removed.`)
      await fetchUsers()
    } catch (err: any) {
      toast.error('Delete Failed', err.response?.data?.message || 'Could not delete user.')
    } finally {
      setDeletingId(null)
    }
  }

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'SUPER_ADMIN': return { class: 'badge-danger',  label: 'Administrator', color: '#ef4444' }
      case 'MANAGER':     return { class: 'badge-warning', label: 'Store Manager',  color: '#f59e0b' }
      default:            return { class: 'badge-success', label: 'Seller',         color: '#10b981' }
    }
  }

  const filteredUsers = users.filter(u => {
    const q = search.toLowerCase()
    const matchSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || u.username.toLowerCase().includes(q)
    const matchRole = roleFilter === 'all' || u.role === roleFilter
    return matchSearch && matchRole
  })

  const activeCount   = users.filter(u => u.active).length
  const inactiveCount = users.filter(u => !u.active).length

  return (
    <section className="content-stack animate-fade-in">
      {(showAddForm || editingUser) && (
        <UserForm 
          user={editingUser} 
          onSaved={handleUserSaved} 
          onCancel={() => { setShowAddUser(false); setEditingUser(null) }} 
        />
      )}

      {resetPasswordUser && (
        <PasswordResetModal
          user={resetPasswordUser}
          onSuccess={() => {
            setResetPasswordUser(null)
            fetchUsers()
          }}
          onCancel={() => setResetPasswordUser(null)}
        />
      )}

      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 style={{ fontSize: '1.6rem', fontWeight: 900, letterSpacing: '-0.02em' }}>Identity & Access</h1>
          <p className="muted" style={{ marginTop: '0.25rem' }}>Manage team members, roles, permissions, and passwords</p>
        </div>
        <button
          className="primary-button"
          onClick={() => { setEditingUser(null); setShowAddUser(true) }}
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', background: 'var(--primary)', color: 'white', boxShadow: '0 8px 20px rgba(35,65,95,0.25)' }}
        >
          <UserPlus size={18} /> Add User
        </button>
      </header>

      {/* Quick Stats */}
      <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 99, fontSize: '0.82rem', fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#10b981' }} />
          {activeCount} Active
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 99, fontSize: '0.82rem', fontWeight: 600 }}>
          <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af' }} />
          {inactiveCount} Inactive
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.5rem 1rem', background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 99, fontSize: '0.82rem', fontWeight: 600 }}>
          <Users size={14} className="muted" />
          {users.length} Total
        </div>
      </div>

      <div className="panel-card">
        <div className="toolbar-row" style={{ marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div style={{ position: 'relative', flex: 1, minWidth: 260, maxWidth: 380 }}>
            <Search size={15} style={{ position: 'absolute', left: 13, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-subtle)', pointerEvents: 'none' }} />
            <input
              className="input-field"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, email, username…"
              style={{ paddingLeft: '2.5rem' }}
            />
          </div>
          <div className="segmented-control">
            {(['all', 'SELLER', 'MANAGER', 'SUPER_ADMIN'] as const).map(role => (
              <button
                key={role}
                data-active={roleFilter === role}
                onClick={() => setRoleFilter(role)}
                className={roleFilter === role ? 'active' : ''}
                style={{ fontSize: '0.8rem' }}
              >
                {role === 'all' ? 'All Roles' : role === 'SELLER' ? 'Sellers' : role === 'MANAGER' ? 'Managers' : 'Admins'}
              </button>
            ))}
          </div>
        </div>

        <div className="list-stack">
          {loading ? (
            <>
              {[1, 2, 3].map(i => (
                <div key={i} className="list-item" style={{ padding: '1.1rem', border: '1px solid var(--border)' }}>
                  <div className="skeleton" style={{ width: 44, height: 44, borderRadius: 12, flexShrink: 0 }} />
                  <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                    <div className="skeleton" style={{ width: '40%', height: '0.9rem' }} />
                    <div className="skeleton" style={{ width: '60%', height: '0.75rem' }} />
                  </div>
                  <div className="skeleton" style={{ width: 80, height: 32, borderRadius: 8 }} />
                </div>
              ))}
            </>
          ) : filteredUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: '4rem 0' }}>
              <Users size={44} />
              <p style={{ fontWeight: 700 }}>No users found</p>
              <p className="muted">Try adjusting your search or role filter</p>
            </div>
          ) : (
            filteredUsers.map(u => {
              const role = getRoleBadge(u.role)
              const isSelf = u.id === session?.id

              return (
                <div key={u.id} className="list-item" style={{
                  padding: '1.1rem',
                  border: '1px solid var(--border)',
                  opacity: u.active ? 1 : 0.65,
                  transition: 'all 0.2s ease',
                  flexWrap: 'wrap',
                  gap: '1rem',
                }}>
                  {/* Avatar */}
                  <div style={{
                    width: 44, height: 44, borderRadius: 12, flexShrink: 0,
                    background: u.active ? 'linear-gradient(135deg, var(--primary), var(--primary-light))' : 'var(--border-strong)',
                    color: 'white',
                    display: 'grid', placeItems: 'center',
                    fontWeight: 800, fontSize: '1.1rem',
                    boxShadow: u.active ? '0 4px 12px rgba(35,65,95,0.2)' : 'none',
                  }}>
                    {u.name.charAt(0).toUpperCase()}
                  </div>

                  {/* Info */}
                  <div style={{ flex: 1, minWidth: '220px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.6rem', flexWrap: 'wrap' }}>
                      <p style={{ fontWeight: 700, fontSize: '0.95rem', margin: 0 }}>{u.name}</p>
                      {isSelf && <span className="badge" style={{ background: '#dbeafe', color: '#1e40af', fontSize: '0.65rem', fontWeight: 800 }}>You</span>}
                      <span className={`badge ${role.class}`} style={{ fontSize: '0.65rem' }}>{role.label}</span>
                      {!u.active && <span className="badge" style={{ background: 'var(--bg-main)', color: 'var(--text-subtle)', fontSize: '0.65rem' }}>Inactive</span>}
                    </div>
                    <div style={{ display: 'flex', gap: '1rem', marginTop: '0.35rem', flexWrap: 'wrap' }} className="muted">
                      <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <AtSign size={11} />{u.username}
                      </span>
                      <span style={{ fontSize: '0.78rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
                        <Mail size={11} />{u.email}
                      </span>
                    </div>
                  </div>

                  {/* Actions Column */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    {/* Edit Details */}
                    <button
                      className="ghost-button"
                      onClick={() => setEditingUser(u)}
                      title="Edit user details"
                      style={{
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        border: '1px solid var(--border)',
                        background: 'white',
                      }}
                    >
                      <Pencil size={14} /> Edit
                    </button>

                    {/* Reset Password */}
                    <button
                      className="ghost-button"
                      onClick={() => setResetPasswordUser(u)}
                      title="Update/Reset password for this user"
                      style={{
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        border: '1px solid #fed7aa',
                        background: '#fffbeb',
                        color: '#d97706',
                      }}
                    >
                      <KeyRound size={14} /> Password
                    </button>

                    {/* Toggle Active */}
                    <button
                      className="ghost-button"
                      onClick={() => toggleActive(u)}
                      disabled={toggling === u.id || isSelf}
                      title={isSelf ? 'Cannot deactivate your own account' : (u.active ? 'Deactivate user' : 'Activate user')}
                      style={{
                        fontSize: '0.8rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.35rem',
                        color: u.active ? '#ef4444' : '#10b981',
                        border: '1px solid currentColor',
                        padding: '0.45rem 0.75rem',
                        borderRadius: 'var(--radius-md)',
                        fontWeight: 700,
                        background: 'white',
                        opacity: isSelf ? 0.5 : 1,
                        cursor: isSelf ? 'not-allowed' : 'pointer',
                      }}
                    >
                      {toggling === u.id ? (
                        <Loader2 size={14} className="animate-spin" />
                      ) : u.active ? (
                        <><UserX size={14} /> Deactivate</>
                      ) : (
                        <><UserCheck size={14} /> Activate</>
                      )}
                    </button>

                    {/* Delete User */}
                    {!isSelf && (
                      <button
                        className="ghost-button icon-btn"
                        onClick={() => handleDelete(u)}
                        disabled={deletingId === u.id}
                        title="Permanently delete user"
                        style={{
                          color: '#ef4444',
                          border: '1px solid #fee2e2',
                          background: '#fef2f2',
                          width: '36px',
                          height: '36px',
                          borderRadius: 'var(--radius-md)',
                          display: 'grid',
                          placeItems: 'center',
                        }}
                      >
                        {deletingId === u.id ? <Loader2 size={15} className="animate-spin" /> : <Trash2 size={15} />}
                      </button>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>
      </div>
    </section>
  )
}
