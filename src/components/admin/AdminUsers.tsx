'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import {
  Search, Ban, CheckCircle, Shield, Loader2,
  ChevronDown, ChevronUp, XCircle, Trash2, Clock, Users,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'
import Link from 'next/link'

// ── Types ─────────────────────────────────────────────────────────
interface UserRecord {
  id:                  string
  username:            string
  display_name:        string | null
  avatar_url:          string | null
  role:                string
  is_banned:           boolean
  ban_reason:          string | null
  is_suspended:        boolean
  suspended_until:     string | null
  suspension_reason:   string | null
  appeal_status:       string | null
  appeal_text:         string | null
  total_recommendations: number
  total_reviews:       number
  member_since:        string
}

const FILTERS = [
  { value: 'all',        label: 'All Users'      },
  { value: 'banned',     label: '🚫 Banned'      },
  { value: 'suspended',  label: '⏸️ Suspended'   },
  { value: 'moderator',  label: '🛡️ Moderators'  },
  { value: 'admin',      label: '👑 Admins'      },
]

const ROLES = ['user', 'moderator', 'admin']

const ROLE_STYLES: Record<string, string> = {
  admin:     'bg-primary/10   text-primary   border-primary/20',
  moderator: 'bg-blue-500/10  text-blue-600  border-blue-500/20',
  user:      'bg-muted        text-muted-foreground border-border',
}

// Suspension duration options
const SUSPENSION_DURATIONS = [
  { label: '1 hour',   hours: 1   },
  { label: '6 hours',  hours: 6   },
  { label: '24 hours', hours: 24  },
  { label: '3 days',   hours: 72  },
  { label: '1 week',   hours: 168 },
  { label: '1 month',  hours: 720 },
]

function isSuspensionActive(user: UserRecord): boolean {
  if (!user.is_suspended) return false
  if (!user.suspended_until) return true
  return new Date(user.suspended_until) > new Date()
}

function formatSuspendedUntil(iso: string | null): string {
  if (!iso) return 'indefinitely'
  const d = new Date(iso)
  const now = new Date()
  const diffMs = d.getTime() - now.getTime()
  if (diffMs <= 0) return 'expired'
  const diffH = Math.floor(diffMs / 3600000)
  if (diffH < 1) return 'less than 1h left'
  if (diffH < 24) return `${diffH}h left`
  const diffD = Math.floor(diffH / 24)
  return `${diffD}d left`
}

export function AdminUsers() {
  const [users, setUsers]           = useState<UserRecord[]>([])
  const [filter, setFilter]         = useState('all')
  const [search, setSearch]         = useState('')
  const [loading, setLoading]       = useState(true)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchUsers = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams({ filter })
      if (search) params.set('q', search)
      const res  = await fetch(`/api/admin/users?${params}`)
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
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ action, ...extra }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error ?? `Failed to ${action}`)
      }
      toast.success(`✅ ${action} successful`)
      fetchUsers()
      setExpandedId(null)
    } catch (err: any) {
      toast.error(err.message ?? `Failed to ${action}`)
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (id: string, username: string) => {
    setActionLoading(`${id}-delete`)
    try {
      const res  = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('User deleted successfully')
      setUsers(prev => prev.filter(u => u.id !== id))
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to delete user')
    } finally {
      setActionLoading(null)
    }
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
            onChange={e => setSearch(e.target.value)}
            className="pl-9 h-10"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {FILTERS.map(({ value, label }) => (
            <button
              key={value}
              onClick={() => setFilter(value)}
              className={cn(
                'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                filter === value
                  ? 'bg-primary text-primary-foreground border-primary shadow-sm'
                  : 'border-border text-muted-foreground hover:border-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-3 text-[10px] text-muted-foreground px-1">
        <span className="flex items-center gap-1"><Ban size={10} className="text-red-500" /> Permanent ban — account blocked indefinitely</span>
        <span className="flex items-center gap-1"><Clock size={10} className="text-amber-500" /> Suspension — temporary, auto-lifts after duration</span>
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <Loader2 size={24} className="animate-spin text-muted-foreground" />
        </div>
      ) : users.length === 0 ? (
        /* ── Empty state ── */
        <div className="relative flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border overflow-hidden">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-16 -left-16 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />
          <div className="relative mb-6 w-32 h-32 mx-auto">
            <div className="absolute top-0 left-0 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" style={{ width: '4.5rem', height: '6rem' }} />
            <div className="absolute top-2 left-5 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" style={{ width: '4.5rem', height: '6rem' }} />
            <div className="absolute top-4 left-9 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1" style={{ width: '4.5rem', height: '6rem' }}>
              <Users size={16} className="text-primary opacity-60" />
              <span className="text-[9px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">No users</span>
            </div>
          </div>
          <p className="text-sm font-black">No users found</p>
          <p className="text-xs text-muted-foreground mt-1">Try a different filter or search term</p>
        </div>
      ) : (
        <div className="space-y-2">
          {users.map((user) => {
            const isExpanded       = expandedId === user.id
            const initials         = (user.display_name || user.username || 'U').slice(0, 2).toUpperCase()
            const suspensionActive = isSuspensionActive(user)

            return (
              <UserRow
                key={user.id}
                user={user}
                isExpanded={isExpanded}
                initials={initials}
                suspensionActive={suspensionActive}
                actionLoading={actionLoading}
                onToggleExpand={() => setExpandedId(isExpanded ? null : user.id)}
                onAction={handleAction}
                onDelete={handleDelete}
              />
            )
          })}
        </div>
      )}
    </div>
  )
}

// ── Separate row component to keep the inner state clean ──────────
function UserRow({
  user,
  isExpanded,
  initials,
  suspensionActive,
  actionLoading,
  onToggleExpand,
  onAction,
  onDelete,
}: {
  user:              UserRecord
  isExpanded:        boolean
  initials:          string
  suspensionActive:  boolean
  actionLoading:     string | null
  onToggleExpand:    () => void
  onAction:          (id: string, action: string, extra?: Record<string, any>) => Promise<void>
  onDelete:          (id: string, username: string) => Promise<void>
}) {
  const [banReason,         setBanReason]         = useState('')
  const [suspendReason,     setSuspendReason]      = useState('')
  const [suspendDuration,   setSuspendDuration]    = useState<number>(24)
  const [activePanel, setActivePanel]              = useState<'ban' | 'suspend' | 'role' | null>(null)

  return (
    <div className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">

      {/* ── Header row ── */}
      <div className="flex items-center gap-3 p-4">
        <Avatar className="h-10 w-10 shrink-0">
          <AvatarImage src={user.avatar_url ?? undefined} />
          <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-violet-500 text-white font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <Link href={`/profile/${user.username}`} target="_blank">
              <p className="text-sm font-black hover:text-primary transition-colors">@{user.username}</p>
            </Link>
            <span className={cn('inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize', ROLE_STYLES[user.role] ?? ROLE_STYLES.user)}>
              {user.role === 'admin' && <Shield size={9} className="mr-1" />}{user.role}
            </span>
            {user.is_banned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-red-500/10 text-red-600 border-red-500/20">
                <Ban size={9} /> Banned
              </span>
            )}
            {suspensionActive && !user.is_banned && (
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                <Clock size={9} /> Suspended · {formatSuspendedUntil(user.suspended_until)}
              </span>
            )}
            {user.appeal_status === 'pending' && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-orange-500/10 text-orange-600 border-orange-500/20">
                🚩 Appeal
              </span>
            )}
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            {user.total_recommendations} recs · {user.total_reviews} reviews · Joined {formatDate(user.member_since)}
          </p>
          {user.is_banned && user.ban_reason && (
            <p className="text-xs text-red-500 mt-0.5">Ban: {user.ban_reason}</p>
          )}
          {suspensionActive && user.suspension_reason && (
            <p className="text-xs text-amber-600 mt-0.5">Suspended: {user.suspension_reason}</p>
          )}
        </div>

        {/* Quick action buttons */}
        <div className="flex gap-0.5 shrink-0">
          {/* Unban */}
          {user.is_banned && (
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-emerald-500 hover:text-emerald-500 h-8 text-xs"
              onClick={() => onAction(user.id, 'unban')}
              disabled={!!actionLoading}
            >
              <CheckCircle size={12} /> Unban
            </Button>
          )}

          {/* Unsuspend */}
          {suspensionActive && !user.is_banned && (
            <Button
              variant="ghost" size="sm"
              className="gap-1.5 text-amber-500 hover:text-amber-600 h-8 text-xs"
              onClick={() => onAction(user.id, 'unsuspend')}
              disabled={!!actionLoading}
            >
              <CheckCircle size={12} /> Unsuspend
            </Button>
          )}

          {/* Delete */}
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8 text-red-500 hover:text-red-500"
            disabled={!!actionLoading}
            onClick={() => {
              if (window.confirm(`Permanently delete @${user.username}? This cannot be undone.`)) {
                onDelete(user.id, user.username)
              }
            }}
            title="Delete user"
          >
            {actionLoading === `${user.id}-delete`
              ? <Loader2 size={13} className="animate-spin" />
              : <Trash2 size={13} />
            }
          </Button>

          {/* Expand */}
          <Button
            variant="ghost" size="icon"
            className="h-8 w-8"
            onClick={onToggleExpand}
          >
            {isExpanded ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
          </Button>
        </div>
      </div>

      {/* ── Expanded panel ── */}
      {isExpanded && (
        <div className="px-4 pb-4 border-t border-border pt-4 space-y-5 bg-muted/10">

          {/* Panel selector tabs */}
          <div className="flex gap-1.5 flex-wrap">
            {[
              { key: 'role',    label: '🛡️ Change Role'    },
              { key: 'suspend', label: '⏸️ Suspend'        },
              { key: 'ban',     label: '🚫 Permanent Ban'  },
            ].map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setActivePanel(activePanel === key as any ? null : key as any)}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-semibold border transition-all',
                  activePanel === key
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Role panel ── */}
          {activePanel === 'role' && (
            <div className="space-y-2">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Change Role</p>
              <div className="flex gap-2 flex-wrap">
                {ROLES.map((role) => (
                  <Button
                    key={role}
                    size="sm"
                    variant={user.role === role ? 'default' : 'outline'}
                    className="h-7 text-xs capitalize"
                    onClick={() => onAction(user.id, 'change_role', { role })}
                    disabled={user.role === role || !!actionLoading}
                  >
                    {actionLoading === `${user.id}-change_role` && user.role !== role
                      ? <Loader2 size={11} className="animate-spin mr-1" />
                      : null
                    }
                    {role}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* ── Suspend panel ── */}
          {activePanel === 'suspend' && (
            <div className="space-y-3 p-3 rounded-xl bg-amber-500/5 border border-amber-500/20">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-amber-600 mb-0.5">
                  Temporary Suspension
                </p>
                <p className="text-xs text-muted-foreground">
                  Suspensions auto-expire. The user cannot log in until the suspension lifts.
                  Unlike a ban, their account is not flagged permanently.
                </p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Duration</p>
                <div className="flex flex-wrap gap-1.5">
                  {SUSPENSION_DURATIONS.map(({ label, hours }) => (
                    <button
                      key={hours}
                      onClick={() => setSuspendDuration(hours)}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs border transition-colors',
                        suspendDuration === hours
                          ? 'bg-amber-500 text-white border-amber-500'
                          : 'border-border text-muted-foreground hover:border-amber-400'
                      )}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wide">Reason</p>
                <Textarea
                  value={suspendReason}
                  onChange={e => setSuspendReason(e.target.value)}
                  placeholder="Reason for suspension (shown to user)..."
                  rows={2}
                  className="resize-none text-sm"
                />
              </div>

              <Button
                size="sm"
                className="gap-2 bg-amber-500 hover:bg-amber-600 text-white border-0"
                onClick={() => onAction(user.id, 'suspend', { reason: suspendReason, duration_hours: suspendDuration })}
                disabled={!suspendReason.trim() || !!actionLoading}
              >
                {actionLoading === `${user.id}-suspend`
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Clock size={13} />
                }
                Suspend for {SUSPENSION_DURATIONS.find(d => d.hours === suspendDuration)?.label}
              </Button>
            </div>
          )}

          {/* ── Ban panel ── */}
          {activePanel === 'ban' && !user.is_banned && (
            <div className="space-y-3 p-3 rounded-xl bg-red-500/5 border border-red-500/20">
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-red-600 mb-0.5">
                  Permanent Ban
                </p>
                <p className="text-xs text-muted-foreground">
                  This permanently blocks the account until manually unbanned. Use suspension for temporary actions.
                </p>
              </div>

              <Textarea
                value={banReason}
                onChange={e => setBanReason(e.target.value)}
                placeholder="Reason for permanent ban (shown to user)..."
                rows={2}
                className="resize-none text-sm"
              />

              <Button
                size="sm"
                variant="destructive"
                className="gap-2"
                onClick={() => onAction(user.id, 'ban', { reason: banReason })}
                disabled={!banReason.trim() || !!actionLoading}
              >
                {actionLoading === `${user.id}-ban`
                  ? <Loader2 size={13} className="animate-spin" />
                  : <Ban size={13} />
                }
                Permanently Ban
              </Button>
            </div>
          )}

          {user.is_banned && activePanel === 'ban' && (
            <p className="text-xs text-muted-foreground px-1">
              User is already permanently banned. Use the <strong>Unban</strong> button above to lift it.
            </p>
          )}

          {/* ── Appeal panel ── */}
          {user.appeal_status === 'pending' && user.appeal_text && (
            <div className="space-y-2 p-3 rounded-xl bg-orange-500/5 border border-orange-500/20">
              <p className="text-xs font-bold text-orange-600">Ban Appeal</p>
              <p className="text-sm">{user.appeal_text}</p>
              <div className="flex gap-2 flex-wrap">
                <Button
                  size="sm"
                  className="gap-1.5 bg-emerald-500 hover:bg-emerald-600"
                  onClick={() => onAction(user.id, 'resolve_appeal', { appeal_status: 'approved' })}
                  disabled={!!actionLoading}
                >
                  <CheckCircle size={13} /> Approve (Unban)
                </Button>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => onAction(user.id, 'resolve_appeal', { appeal_status: 'rejected' })}
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
}