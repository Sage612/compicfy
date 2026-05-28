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

export const metadata: Metadata = { title: 'My Recommendations' }

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-violet-500/10 text-violet-500 border-violet-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
}

export default async function ReaderRecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, is_approved, upvotes, view_count, created_at, rejection_reason, appeal_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const approved = (recs ?? []).filter((r: any) => r.is_approved).length
  const pending  = (recs ?? []).filter((r: any) => !r.is_approved && r.appeal_status !== 'rejected').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-black tracking-tight">My Recs</h1>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <span className="text-xs text-muted-foreground">{recs?.length ?? 0} total</span>
            <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
            <span className="text-xs text-emerald-500 font-semibold">{approved} live</span>
            {pending > 0 && (
              <>
                <span className="w-1 h-1 rounded-full bg-muted-foreground/40" />
                <span className="text-xs text-amber-500 font-semibold">{pending} pending</span>
              </>
            )}
          </div>
        </div>
        <Link href="/reader/dashboard/recommendations/new" className="shrink-0">
          <Button size="sm" className="gap-1.5">
            <Plus size={13} />
            <span className="hidden sm:inline">Submit New</span>
            <span className="sm:hidden">New</span>
          </Button>
        </Link>
      </div>

      {!recs?.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <BookOpen size={24} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="font-black text-sm">No recommendations yet</p>
            <p className="text-xs text-muted-foreground mt-1">Share a comic you love with the community.</p>
          </div>
          <Link href="/reader/dashboard/recommendations/new">
            <Button size="sm" className="gap-1.5"><Plus size={13} />Submit your first</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-2">
          {(recs as any[]).map(rec => {
            const isApproved = rec.is_approved
            const isPending  = !rec.is_approved && rec.appeal_status !== 'rejected'
            const typeColor  = TYPE_COLORS[rec.type] ?? 'bg-muted text-muted-foreground border-border'
            return (
              <div key={rec.id} className="rounded-2xl border border-border bg-card hover:border-primary/20 transition-colors overflow-hidden">
                <div className="flex gap-3 p-3">
                  <div className="w-12 h-16 rounded-xl overflow-hidden bg-muted shrink-0">
                    {rec.cover_url
                      ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                      : <div className="w-full h-full flex items-center justify-center"><BookOpen size={14} className="text-muted-foreground opacity-40" /></div>
                    }
                  </div>
                  <div className="flex-1 min-w-0 py-0.5 space-y-1.5">
                    <p className="font-black text-sm leading-tight line-clamp-2 pr-1">{rec.title}</p>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className={`inline-flex px-1.5 py-0.5 rounded-md text-[9px] font-bold border capitalize ${typeColor}`}>{rec.type}</span>
                      <span className={`inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-bold border ${
                        isApproved ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                        : isPending ? 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                        : 'bg-red-500/10 text-red-500 border-red-500/20'
                      }`}>
                        {isApproved ? <><CheckCircle2 size={8} />Live</> : isPending ? <><Clock size={8} />Pending</> : <><XCircle size={8} />Rejected</>}
                      </span>
                      <span className="text-[9px] text-muted-foreground">{timeAgo(rec.created_at)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center justify-between gap-2 px-3 pb-3 pt-0">
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><ThumbsUp size={10} className="text-emerald-500" />{rec.upvotes}</span>
                    <span className="flex items-center gap-1"><Eye size={10} className="text-blue-500" />{rec.view_count}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {isApproved && (
                      <Link href={`/comic/${rec.id}`}>
                        <Button variant="ghost" size="sm" className="h-7 px-2.5 text-[11px] gap-1 text-muted-foreground hover:text-foreground">
                          <Eye size={11} />View
                        </Button>
                      </Link>
                    )}
                    <Link href={`/reader/dashboard/recommendations/${rec.id}/edit`}>
                      <Button variant="outline" size="sm" className="h-7 px-2.5 text-[11px] gap-1">
                        <Pencil size={11} />Edit
                      </Button>
                    </Link>
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