import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus, Eye, ThumbsUp, Bookmark, Star, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { formatNumber, timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Works' }

export default async function CreatorWorksPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: works } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, status, is_approved, upvotes, view_count, save_count, review_count, score, created_at, rejection_reason, appeal_status, genres')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const totalViews   = (works ?? []).reduce((s: number, w: any) => s + (w.view_count ?? 0), 0)
  const totalUpvotes = (works ?? []).reduce((s: number, w: any) => s + (w.upvotes    ?? 0), 0)

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight">My Works</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {works?.length ?? 0} submitted · {formatNumber(totalViews)} total views · {formatNumber(totalUpvotes)} upvotes
          </p>
        </div>
        <Link href="/creator/dashboard/works/new">
          <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
            <Plus size={13} />Add Work
          </Button>
        </Link>
      </div>

      {!works?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-teal-500/30 bg-teal-500/5 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-teal-500/15 flex items-center justify-center">
            <BookOpen size={24} className="text-teal-500" />
          </div>
          <div className="text-center">
            <p className="font-black text-sm">No works submitted yet</p>
            <p className="text-xs text-muted-foreground mt-1">Share your comic with the community.</p>
          </div>
          <Link href="/creator/dashboard/works/new">
            <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white">
              <Plus size={13} />Submit Your First Work
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(works as any[]).map(work => {
            const isApproved = work.is_approved
            const isPending  = !work.is_approved && work.appeal_status !== 'rejected'
            return (
              <div key={work.id} className="group rounded-2xl border border-border bg-card hover:border-teal-500/30 transition-colors overflow-hidden">
                <div className="flex items-start gap-4 p-4">
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                    {work.cover_url
                      ? <img src={work.cover_url} alt={work.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="font-black text-sm line-clamp-1">{work.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                            isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' :
                            isPending  ? 'bg-amber-500/10  text-amber-600  border-amber-500/20'  :
                                         'bg-red-500/10    text-red-600    border-red-500/20'
                          }`}>
                            {isApproved ? <><CheckCircle2 size={9} />Live</> : isPending ? <><Clock size={9} />Pending</> : <><XCircle size={9} />Rejected</>}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{work.type}</span>
                          <span className="text-[10px] text-muted-foreground capitalize">{work.status}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(work.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isApproved && (
                          <Link href={`/comic/${work.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Eye size={11} />View</Button>
                          </Link>
                        )}
                        <Link href={`/creator/dashboard/works/${work.id}/edit`}>
                          <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                        </Link>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{formatNumber(work.upvotes)} upvotes</span>
                      <span className="flex items-center gap-1"><Eye size={10} className="text-blue-500" />{formatNumber(work.view_count)} views</span>
                      <span className="flex items-center gap-1"><Bookmark size={10} className="text-violet-500" />{formatNumber(work.save_count)} saves</span>
                      <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" />{work.review_count} reviews</span>
                    </div>

                    {work.genres?.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {work.genres.slice(0, 4).map((g: string) => (
                          <span key={g} className="px-1.5 py-0.5 rounded text-[9px] font-semibold bg-muted border border-border text-muted-foreground">{g}</span>
                        ))}
                      </div>
                    )}

                    {work.rejection_reason && (
                      <p className="text-[10px] text-destructive bg-destructive/5 border border-destructive/20 rounded-lg px-2 py-1">
                        Rejection reason: {work.rejection_reason}
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
