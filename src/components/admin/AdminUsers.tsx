'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Search, Ban, CheckCircle, Shield, Loader2, ChevronDown, ChevronUp, XCircle, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'

const FILTERS = [
  { value: 'all',       label: 'All Users'    },
  { value: 'banned',    label: '🚫 Banned'    },
  { value: 'moderator', label: '🛡️ Moderators' },
  { value: 'admin',     label: '👑 Admins'    },
]

const ROLES = ['user', 'moderator', 'admin']

const ROLE_STYLES: Record<string, string> = {
  admin:     'bg-primary/10   text-primary   border-primary/20',
  moderator: 'bg-blue-500/10  text-blue-600  border-blue-500/20',
  user:      'bg-muted        text-muted-foreground border-border',
}

export function AdminUsers() {
  const [users, setUsers] = useState<any[]>([])
  const [filter, setFilter] = useState('all')
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [banReason, setBanReason] = useState('')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      if (search) params.set('q', search)
      const res = await fetch(`/api/admin/users?${params}`)
      const data = await res.json()
      setUsers(data.users ?? [])
    } catch { toast.error('Failed to fetch users') }
    finally { setLoading(false) }
  }, [filter, search])

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timeout)
  }, [fetchUsers])

  const handleAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
    setActionLoading(`${id}-${action}`)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) throw new Error()
      toast.success(`✅ ${action} successful`)
      fetchUsers(); setExpandedId(null); setBanReason('')
    } catch { toast.error(`Failed to ${action}`) }
    finally { setActionLoading(null) }
  }

  const handleDelete = async (id: string, username: string) => {
    setActionLoading(`${id}-delete`)
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User deleted successfully')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err: any) { toast.error(err.message ?? 'Failed to delete user') }
    finally { setActionLoading(null) }
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input placeholder="Search by username..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9 h-10" />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ value, label }) => (
            <button key={value} onClick={() => setFilter(value)}
              className={cn('px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                filter === value ? 'bg-primary text-primary-foreground border-primary shadow-sm' : 'border-border text-muted-foreground hover:border-primary'
              )}>{label}</button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>
      ) : users.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border">
          <p className="text-sm text-muted-foreground">No users found</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isExpanded = expandedId === user.id
            const initials = (user.display_name || user.username || 'U').slice(0, 2).toUpperCase()

            return (
              <div key={user.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
                <div className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-violet-500 text-white font-bold">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/profile/${user.username}`} target="_blank">
                        <p className="text-sm font-black hover:text-primary transition-colors">@{user.username}</p>
                      </Link>
                      <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', ROLE_STYLES[user.role])}>
                        {user.role === 'admin' && <Shield size={9} className="mr-1" />}{user.role}
                      </span>
                      {user.is_banned && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-600 border-red-500/20">🚫 Banned</span>}
                      {user.appeal_status === 'pending' && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-500/10 text-orange-600 border-orange-500/20">🚩 Appeal</span>}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.total_recommendations} recs · {user.total_reviews} reviews · Joined {formatDate(user.member_since)}
                    </p>
                    {user.ban_reason && <p className="text-xs text-red-500 mt-0.5">Ban reason: {user.ban_reason}</p>}
                  </div>
                  <div className="flex gap-0.5 shrink-0">
                    {user.is_banned ? (
                      <Button variant="ghost" size="sm" className="gap-1.5 text-emerald-500 hover:text-emerald-500 h-8 text-xs" onClick={() => handleAction(user.id, 'unban')} disabled={!!actionLoading}>
                        <CheckCircle size={12} /> Unban
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-500" onClick={() => setExpandedId(isExpanded ? null : user.id)} title="Ban user">
                        <Ban size={13} />
                      </Button>
                    )}
                    <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-500" disabled={!!actionLoading}
                      onClick={() => { if (window.confirm(`Permanently delete @${user.username}?`)) handleDelete(user.id, user.username) }} title="Delete user">
                      {actionLoading === `${user.id}-delete` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                    </Button>
                    <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(isExpanded ? null : user.id)}>
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4 bg-muted/10">
                    <div className="space-y-2">
                      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Change Role</p>
                      <div className="flex gap-2">
                        {ROLES.map((role) => (
                          <Button key={role} size="sm" variant={user.role === role ? 'default' : 'outline'} className="h-7 text-xs capitalize"
                            onClick={() => handleAction(user.id, 'change_role', { role })} disabled={user.role === role || !!actionLoading}>
                            {actionLoading === `${user.id}-change_role` && user.role !== role ? <Loader2 size={11} className="animate-spin" /> : role}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {!user.is_banned && (
                      <div className="space-y-2">
                        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Ban User</p>
                        <Textarea value={banReason} onChange={e => setBanReason(e.target.value)} placeholder="Reason for ban..." rows={2} className="resize-none text-sm" />
                        <Button size="sm" variant="destructive" onClick={() => handleAction(user.id, 'ban', { reason: banReason })} disabled={!banReason.trim() || !!actionLoading} className="gap-2">
                          {actionLoading === `${user.id}-ban` ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />} Ban User
                        </Button>
                      </div>
                    )}

                    {user.appeal_status === 'pending' && user.appeal_text && (
                      <div className="space-y-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
                        <p className="text-xs font-bold text-orange-600">Ban Appeal</p>
                        <p className="text-sm">{user.appeal_text}</p>
                        <div className="flex gap-2">
                          <Button size="sm" className="gap-1.5 bg-emerald-500 hover:bg-emerald-600" onClick={() => handleAction(user.id, 'resolve_appeal', { appeal_status: 'approved' })} disabled={!!actionLoading}><CheckCircle size={13} /> Approve (Unban)</Button>
                          <Button size="sm" variant="destructive" onClick={() => handleAction(user.id, 'resolve_appeal', { appeal_status: 'rejected' })} disabled={!!actionLoading}><XCircle size={13} /> Reject Appeal</Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}