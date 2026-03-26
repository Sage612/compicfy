import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Eye, Users } from 'lucide-react'
import Link from 'next/link'
import { formatDate, timeAgo } from '@/lib/utils/format'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Profile Views | Pro' }

export default async function ProfileViewsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, profile_views_count, profile_views_this_month')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  if (!isPro && profile?.role !== 'admin') redirect('/pricing?reason=pro_required')

  const { data: views } = await supabase
    .from('profile_views')
    .select('viewed_at, viewer_id, profiles!profile_views_viewer_id_fkey(username, display_name, avatar_url, is_pro, role)')
    .eq('profile_id', user.id)
    .order('viewed_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Eye size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Profile Views</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          {profile?.profile_views_this_month ?? 0} views this month · {profile?.profile_views_count ?? 0} total
        </p>
      </div>

      {/* Stats cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <p className="text-3xl font-black tabular-nums">{profile?.profile_views_this_month ?? 0}</p>
          <p className="text-xs text-muted-foreground">This month</p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
          <p className="text-3xl font-black tabular-nums">{profile?.profile_views_count ?? 0}</p>
          <p className="text-xs text-muted-foreground">All time</p>
        </div>
      </div>

      {/* Recent viewers */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
          Recent Visitors
        </h2>

        {!views || views.length === 0 ? (
          <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
            <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
              <Users size={22} className="text-muted-foreground opacity-40" />
            </div>
            <div>
              <p className="font-black text-sm">No profile views yet</p>
              <p className="text-xs text-muted-foreground mt-1">Share your profile to get more visibility</p>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            {views.map((view: any, i: number) => {
              const viewer = view.profiles
              const isAnon = !viewer
              const initials = isAnon ? '?' : (viewer.display_name || viewer.username).slice(0, 2).toUpperCase()

              return (
                <div key={i} className="flex items-center gap-3 p-3 rounded-2xl border border-border bg-card">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarImage src={viewer?.avatar_url ?? undefined} />
                    <AvatarFallback className="text-xs font-black bg-gradient-to-br from-primary to-violet-500 text-white">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    {isAnon ? (
                      <p className="text-xs font-semibold text-muted-foreground">Anonymous user</p>
                    ) : (
                      <Link href={`/profile/${viewer.username}`} className="text-xs font-black hover:text-primary transition-colors">
                        {viewer.display_name || viewer.username}
                      </Link>
                    )}
                    <p className="text-[10px] text-muted-foreground">{timeAgo(view.viewed_at)}</p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">{formatDate(view.viewed_at)}</span>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}