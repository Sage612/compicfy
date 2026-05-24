import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Plus, Eye, ThumbsUp, Clock, CheckCircle2, XCircle, AlertCircle } from 'lucide-react'
import { formatDate, timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'My Recommendations' }

const STATUS_CONFIG = {
  approved:  { label: 'Live',    icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20' },
  pending:   { label: 'Pending', icon: Clock,        color: 'text-amber-500',   bg: 'bg-amber-500/10   border-amber-500/20'   },
  rejected:  { label: 'Rejected',icon: XCircle,      color: 'text-destructive', bg: 'bg-destructive/10 border-destructive/20' },
  appealing: { label: 'Appeal',  icon: AlertCircle,  color: 'text-blue-500',    bg: 'bg-blue-500/10    border-blue-500/20'    },
}

export default async function ReaderRecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: recs } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, type, status, is_approved, upvotes, view_count, review_count, created_at, rejection_reason, appeal_status')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const approved = (recs ?? []).filter((r: any) => r.is_approved).length
  const pending  = (recs ?? []).filter((r: any) => !r.is_approved && r.appeal_status !== 'rejected').length

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight">My Recommendations</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {approved} live · {pending} pending
          </p>
        </div>
        <Link href="/reader/dashboard/recommendations/new">
          <Button size="sm" className="gap-1.5">
            <Plus size={13} />Submit New
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
            const statusKey = rec.is_approved ? 'approved' : rec.appeal_status === 'rejected' ? 'rejected' : rec.appeal_status === 'pending' ? 'appealing' : 'pending'
            const status    = STATUS_CONFIG[statusKey as keyof typeof STATUS_CONFIG]
            const StatusIcon = status.icon
            return (
              <div key={rec.id} className="group flex items-center gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors">
                <div className="w-10 h-14 rounded-lg overflow-hidden bg-muted shrink-0">
                  {rec.cover_url
                    ? <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                    : <div className="w-full h-full flex items-center justify-center"><BookOpen size={12} className="text-muted-foreground opacity-40" /></div>
                  }
                </div>
                <div className="flex-1 min-w-0 space-y-1">
                  <p className="font-black text-sm line-clamp-1">{rec.title}</p>
                  <div className="flex items-center gap-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${status.bg}`}>
                      <StatusIcon size={9} className={status.color} />
                      {status.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground capitalize">{rec.type}</span>
                    <span className="text-[10px] text-muted-foreground">{timeAgo(rec.created_at)}</span>
                  </div>
                  {rec.rejection_reason && (
                    <p className="text-[10px] text-destructive line-clamp-1">Reason: {rec.rejection_reason}</p>
                  )}
                </div>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground shrink-0">
                  <span className="flex items-center gap-1"><ThumbsUp size={9} className="text-emerald-500" />{rec.upvotes}</span>
                  <span className="flex items-center gap-1"><Eye size={9} className="text-blue-500" />{rec.view_count}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  {rec.is_approved && (
                    <Link href={`/comic/${rec.id}`}>
                      <Button variant="ghost" size="sm" className="h-7 text-xs gap-1"><Eye size={11} />View</Button>
                    </Link>
                  )}
                  <Link href={`/reader/dashboard/recommendations/${rec.id}/edit`}>
                    <Button variant="outline" size="sm" className="h-7 text-xs">Edit</Button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
