import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  Plus, BookOpen, Clock, CheckCircle, XCircle,
  ThumbsUp, ThumbsDown, MessageSquare, Bookmark,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/database.types'
import { AppealButton } from '@/components/user/AppealButton'

export const metadata: Metadata = { title: 'My Recommendations' }

type ExtendedRecommendation = Recommendation & {
  rejection_reason: string | null
  appeal_status: 'none' | 'pending' | 'approved' | 'rejected' | null
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function MyRecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recommendationsData } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const recommendations = (recommendationsData ?? []) as ExtendedRecommendation[]

  const getStatus = (rec: ExtendedRecommendation) => {
    if (rec.is_approved)      return { label: 'Approved',       icon: CheckCircle, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' }
    if (rec.rejection_reason) return { label: 'Rejected',       icon: XCircle,     color: 'text-red-500',     bg: 'bg-red-500/10     border-red-500/20'     }
    return                           { label: 'Pending Review', icon: Clock,       color: 'text-amber-500',   bg: 'bg-amber-500/10  border-amber-500/20'   }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">

      {/* ── Header ── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        {/* Left: icon + title + count — all on one line, never wraps awkwardly */}
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20 shrink-0">
            <BookOpen size={16} className="text-white" />
          </div>
          <div className="min-w-0">
            <h1 className="text-2xl font-black tracking-tight leading-tight">My Recommendations</h1>
            <p className="text-muted-foreground text-sm mt-0.5">
              {recommendations.length} total submission{recommendations.length !== 1 ? 's' : ''}
            </p>
          </div>
        </div>

        {/* Right: Add New button — sits on its own row on mobile, inline on sm+ */}
        <Link href="/dashboard/recommendations/new" className="self-start sm:self-auto shrink-0">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-md shadow-primary/20">
            <Plus size={15} />
            Add New
          </Button>
        </Link>
      </div>

      {/* ── Empty state ── */}
      {!recommendations.length ? (
        <div className="text-center py-20 rounded-2xl border border-dashed border-border">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto mb-4">
            <BookOpen size={24} className="text-muted-foreground opacity-40" />
          </div>
          <h3 className="font-black text-lg mb-1">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground mb-5">Share your first comic with the community</p>
          <Link href="/dashboard/recommendations/new">
            <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20">
              <Plus size={15} />
              Submit a Recommendation
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const status = getStatus(rec)
            const StatusIcon = status.icon
            const typeStyle = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'

            return (
              <div key={rec.id} className="group flex gap-4 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200">

                {/* Cover */}
                <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm">
                  {rec.cover_url ? (
                    <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={16} className="text-muted-foreground opacity-40" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0 space-y-2">
                  {/* Title row + status badge */}
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0 flex-1">
                      <h3 className="font-black truncate group-hover:text-primary transition-colors text-sm leading-snug">
                        {rec.title}
                      </h3>
                      <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                          {rec.type}
                        </span>
                        <span className="text-xs text-muted-foreground">{formatDate(rec.created_at)}</span>
                      </div>
                    </div>
                    {/* Status badge — shrinks to icon only on very small screens */}
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border shrink-0 ${status.bg} ${status.color}`}>
                      <StatusIcon size={11} />
                      <span className="hidden xs:inline">{status.label}</span>
                    </span>
                  </div>

                  {/* Stats row */}
                  <div className="flex items-center gap-3 text-xs text-muted-foreground flex-wrap">
                    <span className="flex items-center gap-1"><ThumbsUp   size={11} className="text-emerald-500" />{rec.upvotes}</span>
                    <span className="flex items-center gap-1"><ThumbsDown size={11} className="text-red-400"     />{rec.downvotes}</span>
                    <span className="flex items-center gap-1"><MessageSquare size={11} className="text-blue-400" />{rec.review_count}</span>
                    <span className="flex items-center gap-1"><Bookmark   size={11} className="text-violet-400"  />{rec.save_count}</span>
                  </div>

                  {/* Rejection reason + appeal */}
                  {rec.rejection_reason && (
                    <div className="space-y-1.5 pt-1">
                      <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-lg px-2.5 py-1.5 leading-relaxed">
                        Reason: {rec.rejection_reason}
                      </p>
                      {(!rec.appeal_status || rec.appeal_status === 'none') && (
                        <AppealButton recommendationId={rec.id} />
                      )}
                      {rec.appeal_status === 'pending'  && <span className="text-xs text-amber-500">🚩 Appeal pending review</span>}
                      {rec.appeal_status === 'approved' && <span className="text-xs text-emerald-500">✅ Appeal approved</span>}
                      {rec.appeal_status === 'rejected' && <span className="text-xs text-muted-foreground">Appeal rejected</span>}
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}