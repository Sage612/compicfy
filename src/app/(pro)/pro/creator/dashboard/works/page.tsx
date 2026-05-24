import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus, Eye, ThumbsUp, Bookmark, Star, CheckCircle2, Clock, XCircle } from 'lucide-react'
import { formatNumber, timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Works' }

export default async function ProCreatorWorksPage() {
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
            {works?.length ?? 0} submitted · {formatNumber(totalViews)} views · {formatNumber(totalUpvotes)} upvotes · unlimited on Pro
          </p>
        </div>
        <Link href="/pro/creator/dashboard/works/new">
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
          <p className="font-black text-sm">No works yet</p>
          <Link href="/pro/creator/dashboard/works/new">
            <Button size="sm" className="gap-1.5 bg-teal-500 hover:bg-teal-600 border-0 text-white"><Plus size={13} />Submit First Work</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {(works as any[]).map(work => {
            const isApproved = work.is_approved
            const isPending  = !work.is_approved && work.appeal_status !== 'rejected'
            return (
              <div key={work.id} className="rounded-2xl border border-border bg-card hover:border-teal-500/30 transition-colors p-4">
                <div className="flex items-start gap-4">
                  <div className="w-14 h-20 rounded-xl overflow-hidden bg-muted shrink-0">
                    {work.cover_url ? <img src={work.cover_url} alt={work.title} className="w-full h-full object-cover" /> : <div className="w-full h-full flex items-center justify-center"><BookOpen size={16} className="text-muted-foreground opacity-40" /></div>}
                  </div>
                  <div className="flex-1 min-w-0 space-y-2">
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <p className="font-black text-sm line-clamp-1">{work.title}</p>
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${isApproved ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20' : isPending ? 'bg-amber-500/10 text-amber-600 border-amber-500/20' : 'bg-red-500/10 text-red-600 border-red-500/20'}`}>
                            {isApproved ? <CheckCircle2 size={9} /> : isPending ? <Clock size={9} /> : <XCircle size={9} />}
                            {isApproved ? 'Live' : isPending ? 'Pending' : 'Rejected'}
                          </span>
                          <span className="text-[10px] text-muted-foreground capitalize">{work.type}</span>
                          <span className="text-[10px] text-muted-foreground">{timeAgo(work.created_at)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {isApproved && <Link href={`/comic/${work.id}`}><Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Eye size={11} />View</Button></Link>}
                        <Link href={`/pro/creator/dashboard/works/${work.id}/edit`}><Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button></Link>
                      </div>
                    </div>
                    <div className="flex items-center gap-4 text-[11px] text-muted-foreground">
                      <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{formatNumber(work.upvotes)}</span>
                      <span className="flex items-center gap-1"><Eye size={10} className="text-blue-500" />{formatNumber(work.view_count)}</span>
                      <span className="flex items-center gap-1"><Bookmark size={10} className="text-violet-500" />{formatNumber(work.save_count)}</span>
                      <span className="flex items-center gap-1"><Star size={10} className="text-amber-500" />{work.review_count}</span>
                    </div>
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
