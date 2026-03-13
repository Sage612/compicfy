'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { toast } from 'sonner'
import { Trash2, Eye, EyeOff, Loader2, Star } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { createClient } from '@/lib/supabase/client'
import { cn } from '@/lib/utils'

export function AdminReviews() {
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  useEffect(() => {
    const fetchReviews = async () => {
      const supabase = createClient()
      const { data } = await supabase
        .from('reviews')
        .select('*, profiles(username, avatar_url), recommendations(title)')
        .order('created_at', { ascending: false })
        .limit(50)
      setReviews(data ?? [])
      setLoading(false)
    }
    fetchReviews()
  }, [])

  const handleToggleApproval = async (id: string, current: boolean) => {
    setActionLoading(`${id}-toggle`)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_approved: !current }),
      })
      if (!res.ok) throw new Error()
      setReviews(prev => prev.map(r => r.id === id ? { ...r, is_approved: !current } : r))
      toast.success(current ? 'Review hidden' : 'Review visible')
    } catch { toast.error('Failed to update') }
    finally { setActionLoading(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this review permanently?')) return
    setActionLoading(`${id}-delete`)
    try {
      const res = await fetch(`/api/admin/reviews/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setReviews(prev => prev.filter(r => r.id !== id))
      toast.success('Review deleted')
    } catch { toast.error('Failed to delete') }
    finally { setActionLoading(null) }
  }

  if (loading) return <div className="flex justify-center py-16"><Loader2 size={24} className="animate-spin text-muted-foreground" /></div>

  return (
    <div className="space-y-3">
      {reviews.map((review) => {
        const profile = review.profiles
        const rec = review.recommendations
        const initials = (profile?.username || 'U').slice(0, 2).toUpperCase()

        return (
          <div key={review.id} className={cn('p-4 rounded-2xl border bg-card space-y-2 hover:border-primary/30 transition-colors', !review.is_approved && 'opacity-60')}>
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={profile?.avatar_url} />
                  <AvatarFallback className="text-xs bg-gradient-to-br from-primary to-violet-500 text-white font-bold">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-xs font-semibold">@{profile?.username}</p>
                  <p className="text-xs text-muted-foreground">on "{rec?.title}"</p>
                </div>
              </div>
              <div className="flex items-center gap-1">
                {review.rating && (
                  <div className="flex items-center gap-0.5 mr-1.5">
                    {Array.from({ length: review.rating }).map((_, i) => (
                      <Star key={i} size={11} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => handleToggleApproval(review.id, review.is_approved)} disabled={!!actionLoading} title={review.is_approved ? 'Hide review' : 'Show review'}>
                  {actionLoading === `${review.id}-toggle` ? <Loader2 size={13} className="animate-spin" /> : review.is_approved ? <EyeOff size={13} /> : <Eye size={13} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-500" onClick={() => handleDelete(review.id)} disabled={!!actionLoading} title="Delete review">
                  {actionLoading === `${review.id}-delete` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </Button>
              </div>
            </div>

            <div className="flex gap-1.5 flex-wrap items-center">
              {!review.is_approved && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-muted text-muted-foreground border-border">Hidden</span>}
              {review.contains_spoilers && <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">⚠️ Spoiler</span>}
              <span className="text-xs text-muted-foreground">{formatDate(review.created_at)}</span>
            </div>

            <p className="text-sm text-muted-foreground line-clamp-2">{review.content}</p>
          </div>
        )
      })}
    </div>
  )
}