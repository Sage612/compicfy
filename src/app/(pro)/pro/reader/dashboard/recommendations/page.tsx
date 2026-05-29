import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  BookOpen, Plus, Eye, ThumbsUp, Clock,
  CheckCircle2, XCircle, Pencil,
} from 'lucide-react'
import { timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Recommendations | Pro' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function ProReaderRecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, is_approved, upvotes, downvotes, view_count, review_count, save_count, created_at, rejection_reason, appeal_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      {/* Header with icon */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
            <BookOpen size={20} className="text-violet-500" />
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight">My Recommendations</h1>
            <p className="text-sm text-muted-foreground">
              {recs?.length ?? 0} total · unlimited on Pro
            </p>
          </div>
        </div>
        <Link href="/pro/reader/dashboard/recommendations/new">
          <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white hover:opacity-90 shrink-0">
            <Plus size={13} />Submit New
          </Button>
        </Link>
      </div>

      {/* Empty */}
      {!recs?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4 text-center">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <BookOpen size={24} className="text-amber-500" />
          </div>
          <div>
            <p className="font-black text-sm">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">You have unlimited submissions on Pro</p>
          </div>
          <Link href="/pro/reader/dashboard/recommendations/new">
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white">
              <Plus size={13} />Submit your first
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(recs as any[]).map(rec => {
            const isApproved = rec.is_approved
            const isRejected = !rec.is_approved && !!rec.rejection_reason
            const isPending  = !isApproved && !isRejected
            const typeStyle  = TYPE_COLORS[rec.type] ?? 'bg-muted/40 text-muted-foreground border-border'

            return (
              <div key={rec.id} className="rounded-2xl border border-border bg-card hover:border-amber-500/30 transition-colors overflow-hidden">
                <div className="flex gap-3 p-3">
                  {/* Cover */}
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    {rec.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>}
                  </div>

                  {/* Info */}
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <p className="font-black text-sm line-clamp-1 leading-snug">{rec.title}</p>

                    {/* Badges row */}
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex items-center px-1.5 py-0.5 rounded-full text-[10px] font-bold border capitalize ${typeStyle}`}>
                        {rec.type}
                      </span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] font-bold border ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                        : isPending ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                        : 'bg-red-500/10 text-red-600 border-red-500/20'
                      }`}>
                        {isApproved ? <CheckCircle2 size={9} /> : isPending ? <Clock size={9} /> : <XCircle size={9} />}
                        {isApproved ? 'Live' : isPending ? 'Pending' : 'Rejected'}
                      </span>
                      <span className="text-[10px] text-muted-foreground">{timeAgo(rec.created_at)}</span>
                    </div>

                    {/* Stats */}
                    <div className="flex items-center gap-2.5 text-[10px] text-muted-foreground">
                      <span className="flex items-center gap-0.5">
                        <ThumbsUp size={9} className="text-emerald-500" />{rec.upvotes}
                      </span>
                      <span className="flex items-center gap-0.5">
                        <Eye size={9} className="text-blue-400" />{rec.view_count ?? 0}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Actions — full width row at bottom, never wraps */}
                <div className="flex items-center gap-2 px-3 pb-3">
                  <Link href={`/pro/reader/dashboard/recommendations/${rec.id}/edit`} className="flex-1">
                    <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full hover:border-amber-500/40 hover:text-amber-600">
                      <Pencil size={10} />Edit
                    </Button>
                  </Link>
                  {isApproved && (
                    <Link href={`/comic/${rec.id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="h-7 text-xs gap-1 w-full hover:border-primary/40 hover:text-primary">
                        <Eye size={10} />View
                      </Button>
                    </Link>
                  )}
                </div>

                {/* Rejection reason */}
                {isRejected && rec.rejection_reason && (
                  <div className="mx-3 mb-3 px-3 py-2 rounded-xl bg-red-500/5 border border-red-500/10">
                    <p className="text-xs text-red-500 leading-relaxed">Reason: {rec.rejection_reason}</p>
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