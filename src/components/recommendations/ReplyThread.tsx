'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { CornerDownRight, Send, Loader2, Trash2, ShieldCheck } from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

export interface ReplyWithProfile {
  id:         string
  review_id:  string
  user_id:    string
  content:    string
  is_edited:  boolean
  created_at: string
  profiles: {
    username:     string
    display_name: string | null
    avatar_url:   string | null
    role:         string
  } | null
}

interface Props {
  recommendationId: string
  reviewId:         string
  replies:          ReplyWithProfile[]
  canReply:         boolean
  currentUserId:    string | null
  isStaff:          boolean
  onReplyAdded:     (reply: ReplyWithProfile) => void
  onReplyDeleted:   (replyId: string) => void
}

const MAX_REPLY_LENGTH = 2000

export function ReplyThread({
  recommendationId,
  reviewId,
  replies,
  canReply,
  currentUserId,
  isStaff,
  onReplyAdded,
  onReplyDeleted,
}: Props) {
  const [showForm,   setShowForm]   = useState(false)
  const [content,    setContent]    = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)

  const handleSubmit = async () => {
    const trimmed = content.trim()
    if (!trimmed) return
    if (trimmed.length > MAX_REPLY_LENGTH) {
      toast.error(`Reply must be ${MAX_REPLY_LENGTH} characters or fewer`)
      return
    }

    setSubmitting(true)
    try {
      const res = await fetch(
        `/api/recommendations/${recommendationId}/reviews/${reviewId}/replies`,
        {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body:    JSON.stringify({ content: trimmed }),
        }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? 'Failed to post reply')

      onReplyAdded(data.reply)
      setContent('')
      setShowForm(false)
      toast.success('Reply posted')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to post reply')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (replyId: string) => {
    if (!confirm('Delete this reply?')) return
    setDeletingId(replyId)
    try {
      const res = await fetch(
        `/api/recommendations/${recommendationId}/reviews/${reviewId}/replies/${replyId}`,
        { method: 'DELETE' }
      )
      if (!res.ok) throw new Error()
      onReplyDeleted(replyId)
      toast.success('Reply deleted')
    } catch {
      toast.error('Failed to delete reply')
    } finally {
      setDeletingId(null)
    }
  }

  if (replies.length === 0 && !canReply) return null

  return (
    <div className="pl-4 border-l-2 border-border/60 space-y-2.5">
      {replies.map((reply) => {
        const profile      = reply.profiles
        const initials     = (profile?.display_name || profile?.username || 'U').slice(0, 2).toUpperCase()
        const replyIsStaff = profile?.role === 'admin' || profile?.role === 'moderator'
        const canDelete    = currentUserId === reply.user_id || isStaff

        return (
          <div key={reply.id} className="flex items-start gap-2">
            <Link href={profile?.username ? `/profile/${profile.username}` : '#'} className="shrink-0">
              <Avatar className="h-6 w-6">
                <AvatarImage src={profile?.avatar_url ?? undefined} />
                <AvatarFallback className="text-[10px] bg-primary text-primary-foreground">
                  {initials}
                </AvatarFallback>
              </Avatar>
            </Link>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <Link
                  href={profile?.username ? `/profile/${profile.username}` : '#'}
                  className="text-xs font-semibold hover:text-primary transition-colors"
                >
                  {profile?.display_name || profile?.username}
                </Link>
                {replyIsStaff && (
                  <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-primary/10 text-primary border border-primary/20">
                    <ShieldCheck size={8} />
                    Staff
                  </span>
                )}
                <span className="text-[10px] text-muted-foreground">{timeAgo(reply.created_at)}</span>
                {reply.is_edited && <span className="text-[10px] text-muted-foreground italic">(edited)</span>}
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{reply.content}</p>
            </div>
            {canDelete && (
              <button
                onClick={() => handleDelete(reply.id)}
                disabled={deletingId === reply.id}
                className="shrink-0 text-muted-foreground/50 hover:text-destructive transition-colors p-1"
                aria-label="Delete reply"
              >
                {deletingId === reply.id
                  ? <Loader2 size={12} className="animate-spin" />
                  : <Trash2 size={12} />
                }
              </button>
            )}
          </div>
        )
      })}

      {canReply && (
        <>
          {showForm ? (
            <div className="space-y-2 pt-1">
              <textarea
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write a reply…"
                rows={2}
                maxLength={MAX_REPLY_LENGTH}
                autoFocus
                className={cn(
                  'w-full resize-none rounded-lg border border-border bg-background px-3 py-2',
                  'text-xs placeholder:text-muted-foreground outline-none',
                  'focus:border-primary transition-colors'
                )}
              />
              <div className="flex items-center justify-between">
                <p className="text-[10px] text-muted-foreground">{content.length}/{MAX_REPLY_LENGTH}</p>
                <div className="flex gap-1.5">
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-xs"
                    onClick={() => { setShowForm(false); setContent('') }}
                    disabled={submitting}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    className="h-7 text-xs gap-1.5"
                    onClick={handleSubmit}
                    disabled={submitting || !content.trim()}
                  >
                    {submitting
                      ? <Loader2 size={11} className="animate-spin" />
                      : <Send size={11} />
                    }
                    Reply
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            <button
              onClick={() => setShowForm(true)}
              className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 font-medium transition-colors pt-0.5"
            >
              <CornerDownRight size={12} />
              Reply
            </button>
          )}
        </>
      )}
    </div>
  )
}