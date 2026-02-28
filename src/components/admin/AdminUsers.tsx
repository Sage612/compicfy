'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { XCircle } from 'lucide-react'
import { Search, Ban, CheckCircle, Shield, Loader2, ChevronDown, ChevronUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'

const FILTERS = [
  { value: 'all', label: 'All Users' },
  { value: 'banned', label: '🚫 Banned' },
  { value: 'moderator', label: '🛡️ Moderators' },
  { value: 'admin', label: '👑 Admins' },
]

const ROLES = ['user', 'moderator', 'admin']

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
    } catch {
      toast.error('Failed to fetch users')
    } finally {
      setLoading(false)
    }
  }, [filter, search])

  useEffect(() => {
    const timeout = setTimeout(fetchUsers, 300)
    return () => clearTimeout(timeout)
  }, [fetchUsers])

  const handleAction = async (id: string, action: string, extra: Record<string, any> = {}) => {
    setActionLoading(`${id}-${action}`)
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) throw new Error()
      toast.success(`✅ ${action} successful`)
      fetchUsers()
      setExpandedId(null)
      setBanReason('')
    } catch {
      toast.error(`Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive/10 text-destructive border-destructive/20',
    moderator: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
    user: 'bg-muted text-muted-foreground border-border',
  }

  return (
    <div className="space-y-4">
      {/* Search + filters */}
      <div className="space-y-2">
        <div className="relative">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 h-9"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-medium border transition-colors',
                filter === value
                  ? 'bg-primary text-primary-foreground border-primary'
                  : 'border-border text-muted-foreground hover:border-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">No users found</div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isExpanded = expandedId === user.id
            const initials = (user.display_name || user.username || 'U').slice(0, 2).toUpperCase()

            return (
              <div key={user.id} className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="flex items-center gap-3 p-4">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={user.avatar_url} />
                    <AvatarFallback className="text-xs bg-primary text-primary-foreground">{initials}</AvatarFallback>
                  </Avatar>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Link href={`/profile/${user.username}`} target="_blank">
                        <p className="text-sm font-semibold hover:text-primary transition-colors">
                          @{user.username}
                        </p>
                      </Link>
                      <Badge className={cn('text-xs border capitalize', roleColors[user.role])}>
                        {user.role}
                      </Badge>
                      {user.is_banned && (
                        <Badge className="text-xs bg-destructive/10 text-destructive border-destructive/20">
                          🚫 Banned
                        </Badge>
                      )}
                      {user.appeal_status === 'pending' && (
                        <Badge className="text-xs bg-orange-500/10 text-orange-600 border-orange-500/20">
                          🚩 Appeal
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {user.total_recommendations} recs · {user.total_reviews} reviews · Joined {formatDate(user.member_since)}
                    </p>
                    {user.ban_reason && (
                      <p className="text-xs text-destructive mt-0.5">Ban reason: {user.ban_reason}</p>
                    )}
                  </div>

                  <div className="flex gap-1 shrink-0">
                    {user.is_banned ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="gap-1.5 text-green-500 hover:text-green-500 h-7 text-xs"
                        onClick={() => handleAction(user.id, 'unban')}
                        disabled={!!actionLoading}
                      >
                        <CheckCircle size={12} />
                        Unban
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7 text-destructive hover:text-destructive"
                        onClick={() => setExpandedId(isExpanded ? null : user.id)}
                        title="Ban user"
                      >
                        <Ban size={13} />
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setExpandedId(isExpanded && expandedId !== `role-${user.id}` ? null : user.id)}
                    >
                      {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                    </Button>
                  </div>
                </div>

                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-border pt-4 space-y-4">
                    {/* Change role */}
                    <div className="space-y-2">
                      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Change Role</p>
                      <div className="flex gap-2">
                        {ROLES.map((role) => (
                          <Button
                            key={role}
                            size="sm"
                            variant={user.role === role ? 'default' : 'outline'}
                            className="h-7 text-xs capitalize"
                            onClick={() => handleAction(user.id, 'change_role', { role })}
                            disabled={user.role === role || !!actionLoading}
                          >
                            {role}
                          </Button>
                        ))}
                      </div>
                    </div>

                    {/* Ban form */}
                    {!user.is_banned && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">Ban User</p>
                        <Textarea
                          value={banReason}
                          onChange={(e) => setBanReason(e.target.value)}
                          placeholder="Reason for ban..."
                          rows={2}
                          className="resize-none text-sm"
                        />
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => handleAction(user.id, 'ban', { reason: banReason })}
                          disabled={!banReason.trim() || !!actionLoading}
                          className="gap-2"
                        >
                          {actionLoading === `${user.id}-ban` ? <Loader2 size={13} className="animate-spin" /> : <Ban size={13} />}
                          Ban User
                        </Button>
                      </div>
                    )}

                    {/* Appeal resolution */}
                    {user.appeal_status === 'pending' && user.appeal_text && (
                      <div className="space-y-2 p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                        <p className="text-xs font-semibold text-orange-600">Ban Appeal</p>
                        <p className="text-sm">{user.appeal_text}</p>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            className="gap-1.5 bg-green-500 hover:bg-green-600"
                            onClick={() => handleAction(user.id, 'resolve_appeal', { appeal_status: 'approved' })}
                            disabled={!!actionLoading}
                          >
                            <CheckCircle size={13} /> Approve (Unban)
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            onClick={() => handleAction(user.id, 'resolve_appeal', { appeal_status: 'rejected' })}
                            disabled={!!actionLoading}
                          >
                            <XCircle size={13} /> Reject Appeal
                          </Button>
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