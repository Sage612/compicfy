import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Plus, BookOpen, Clock, CheckCircle, XCircle } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/database.types'
import { AppealButton } from '@/components/user/AppealButton'

export const metadata: Metadata = { title: 'My Recommendations' }

type ExtendedRecommendation = Recommendation & {
  rejection_reason: string | null
  appeal_status: 'none' | 'pending' | 'approved' | 'rejected' | null
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

  const statusConfig = {
    approved: { label: 'Approved', icon: CheckCircle, className: 'text-green-500' },
    pending: { label: 'Pending Review', icon: Clock, className: 'text-yellow-500' },
    rejected: { label: 'Rejected', icon: XCircle, className: 'text-destructive' },
  }

  const getStatus = (rec: ExtendedRecommendation) => {
    if (rec.is_approved) return statusConfig.approved
    if (rec.rejection_reason) return statusConfig.rejected
    return statusConfig.pending
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">My Recommendations</h1>
          <p className="text-muted-foreground text-sm mt-1">
            {recommendations.length} total submissions
          </p>
        </div>
        <Link href="/dashboard/recommendations/new">
          <Button className="gap-2">
            <Plus size={16} />
            Add New
          </Button>
        </Link>
      </div>

      {!recommendations.length ? (
        <div className="text-center py-16 border border-dashed border-border rounded-xl">
          <BookOpen size={40} className="mx-auto mb-3 text-muted-foreground opacity-40" />
          <h3 className="font-semibold mb-1">No recommendations yet</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Share your first comic with the community
          </p>
          <Link href="/dashboard/recommendations/new">
            <Button className="gap-2">
              <Plus size={16} />
              Submit a Recommendation
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {recommendations.map((rec) => {
            const config = getStatus(rec)
            const StatusIcon = config.icon

            return (
              <div
                key={rec.id}
                className="flex gap-4 p-4 rounded-xl border border-border bg-card hover:border-primary/50 transition-colors"
              >
                {/* Cover */}
                <div className="w-12 h-16 rounded-md overflow-hidden bg-muted shrink-0">
                  {rec.cover_url ? (
                    <img
                      src={rec.cover_url}
                      alt={rec.title}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={16} className="text-muted-foreground" />
                    </div>
                  )}
                </div>

                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold truncate">{rec.title}</h3>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <Badge variant="secondary" className="text-xs capitalize">
                          {rec.type}
                        </Badge>
                        <span className="text-xs text-muted-foreground">
                          {formatDate(rec.created_at)}
                        </span>
                      </div>
                    </div>
                    <div className={`flex items-center gap-1 text-xs font-medium shrink-0 ${config.className}`}>
                      <StatusIcon size={13} />
                      {config.label}
                    </div>
                  </div>

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                    <span>👍 {rec.upvotes}</span>
                    <span>👎 {rec.downvotes}</span>
                    <span>💬 {rec.review_count}</span>
                    <span>🔖 {rec.save_count}</span>
                  </div>

                  {rec.rejection_reason && (
                    <div className="mt-2 space-y-1.5">
                      <p className="text-xs text-destructive">
                        Reason: {rec.rejection_reason}
                      </p>
                      {(!rec.appeal_status || rec.appeal_status === 'none') && (
                        <AppealButton recommendationId={rec.id} />
                      )}
                      {rec.appeal_status === 'pending' && (
                        <span className="text-xs text-orange-500">🚩 Appeal pending review</span>
                      )}
                      {rec.appeal_status === 'approved' && (
                        <span className="text-xs text-green-500">✅ Appeal approved</span>
                      )}
                      {rec.appeal_status === 'rejected' && (
                        <span className="text-xs text-muted-foreground">Appeal rejected</span>
                      )}
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