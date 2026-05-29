import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import {
  BookOpen, Plus, Eye, ThumbsUp, ThumbsDown, MessageSquare, Bookmark, Clock,
  CheckCircle2, XCircle, Pencil, Crown, ArrowRight
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
    <div className="max-w-5xl mx-auto px-4 py-4 space-y-6">

      {/* ── HEADER BLOCK (Image 2 Premium Upgrade) ── */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-violet-500/10 to-purple-600/5 border border-purple-500/20 flex items-center justify-center shrink-0 shadow-sm">
            <BookOpen size={18} className="text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight leading-none mb-1.5">My Recommendations</h1>
            <div className="flex items-center gap-1.5">
              <Crown size={12} className="text-amber-500 fill-amber-500" />
              <span className="text-xs text-amber-600 font-bold tracking-wide uppercase text-[10px]">
                {recs?.length ?? 0} total · Unlimited Pro Status
              </span>
            </div>
          </div>
        </div>
        <Link href="/pro/reader/dashboard/recommendations/new">
          <Button size="sm" className="gap-1.5 h-9 text-xs font-bold bg-gradient-to-r from-primary to-violet-500 hover:opacity-95 shadow-sm">
            <Plus size={14} /> Submit New
          </Button>
        </Link>
      </div>

      {/* ── EMPTY STATE ── */}
      {!recs?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4 text-center bg-card shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/10 flex items-center justify-center">
            <BookOpen size={24} className="text-amber-500" />
          </div>
          <div>
            <p className="font-black text-sm">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">You have unlimited submissions on Pro</p>
          </div>
          <Link href="/pro/reader/dashboard/recommendations/new">
            <Button size="sm" className="gap-1.5 bg-gradient-to-r from-amber-400 to-orange-500 border-0 text-white font-bold">
              <Plus size={13} /> Submit your first
            </Button>
          </Link>
        </div>
      ) : (
        /* ── HIGH DENSITY RECOMMENDS CONTAINER ── */
        <div className="grid grid-cols-1 gap-3.5">
          {(recs as any[]).map(rec => {
            const isApproved = rec.is_approved
            const isRejected = !rec.is_approved && !!rec.rejection_reason
            const isPending  = !isApproved && !isRejected
            const typeStyle  = TYPE_COLORS[rec.type] ?? 'bg-muted/40 text-muted-foreground border-border'

            return (
              <div key={rec.id} className="group relative rounded-2xl border border-border bg-card hover:border-primary/30 hover:shadow-sm transition-all duration-200 overflow-hidden">
                <div className="flex gap-4 p-3.5">
                  
                  {/* Left Column: Premium Art Ratio Layout */}
                  <div className="w-20 h-26 sm:w-24 sm:h-32 rounded-xl overflow-hidden bg-muted shrink-0 shadow-sm relative border border-border/30">
                    {rec.cover_url ? (
                      <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover group-hover:scale-[1.01] transition-transform duration-200" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <BookOpen size={16} className="text-muted-foreground opacity-30" />
                      </div>
                    )}
                  </div>

                  {/* Right Column: Information Flow Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    
                    {/* Upper Text Row Blocks */}
                    <div className="space-y-1 relative pr-6">
                      
                      {/* Status Badges Pinned to the Top-Right Corner */}
                      <div className="absolute top-0 right-0">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                          isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
                          : isPending ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
                          : 'bg-red-500/10 text-red-600 border-red-500/20'
                        }`}>
                          {isApproved ? <CheckCircle2 size={9} /> : isPending ? <Clock size={9} /> : <XCircle size={9} />}
                          {isApproved ? 'Approved' : isPending ? 'Pending' : 'Rejected'}
                        </span>
                      </div>

                      {/* Title */}
                      <h3 className="font-black text-base truncate tracking-tight text-foreground pr-24 leading-tight">
                        {rec.title}
                      </h3>

                      {/* Type and Meta Timestamp */}
                      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
                        <span className={`inline-flex items-center px-1.5 py-0.5 rounded-md text-[10px] font-bold border uppercase tracking-wider ${typeStyle}`}>
                          {rec.type}
                        </span>
                        <span className="text-muted-foreground/40">•</span>
                        <span className="text-[11px] font-medium">{timeAgo(rec.created_at)}</span>
                      </div>
                    </div>

                    {/* Middle Block: Interactive Metric Feedback Strip (Image 2 Core Addition) */}
                    <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 my-2.5 text-xs text-muted-foreground border-y border-border/40 py-2">
                      <span className="flex items-center gap-1">
                        <ThumbsUp size={13} className="text-emerald-500/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.upvotes}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <ThumbsDown size={13} className="text-red-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.downvotes ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <MessageSquare size={13} className="text-blue-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.review_count ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Bookmark size={13} className="text-violet-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.save_count ?? 0}</strong>
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye size={13} className="text-indigo-400/80" /> 
                        <strong className="text-foreground font-black text-[11px]">{rec.view_count ?? 0}</strong>
                      </span>
                    </div>

                    {/* Bottom Inline Action Buttons Group */}
                    <div className="flex items-center justify-between gap-2 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <Link href={`/pro/reader/dashboard/recommendations/${rec.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-7 px-2.5 text-xs font-semibold gap-1 rounded-lg hover:border-amber-500/40 hover:text-amber-600 transition-colors">
                            <Pencil size={11} /> Edit
                          </Button>
                        </Link>
                      </div>

                      {isApproved && (
                        <Link href={`/comic/${rec.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-primary font-black hover:text-primary/80 gap-0.5">
                            View <ArrowRight size={12} className="mt-0.5" />
                          </Button>
                        </Link>
                      )}
                    </div>

                  </div>
                </div>

                {/* Rejection Reasons Blocks */}
                {isRejected && rec.rejection_reason && (
                  <div className="px-3.5 pb-3.5 border-t border-border/20 bg-muted/[0.02] pt-2.5">
                    <p className="text-xs text-red-500 bg-red-500/5 border border-red-500/10 rounded-xl px-3 py-2 leading-relaxed">
                      <strong className="font-bold">Reason:</strong> {rec.rejection_reason}
                    </p>
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



