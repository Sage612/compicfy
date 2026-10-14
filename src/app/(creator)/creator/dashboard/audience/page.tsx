import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'
import { formatDate, formatNumber } from '@/lib/utils/format'
import { getProfileRoute } from '@/lib/utils/routes'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Audience' }

export default async function CreatorAudiencePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const [
    { count: followersCount },
    { data: recentFollowers },
    { count: profileViews },
  ] = await Promise.all([
    supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', user.id),
    supabase
      .from('follows')
      .select('follower_id, created_at, profiles!follows_follower_id_fkey(username, display_name, avatar_url, total_recommendations)')
      .eq('following_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20),
    (supabase as any).from('profile_views').select('*', { count: 'exact', head: true }).eq('profile_id', user.id),
  ])

  const stats: { label: string; value: number | string }[] = [
    { label: 'Total followers', value: followersCount ?? 0 },
    { label: 'Profile views',   value: profileViews   ?? 0 },
    { label: 'Views this month', value: '—' },
  ]

  return (
    <PageShell>
      <PageHeader
        eyebrow="Creator"
        title="Audience"
        subtitle="People who follow your work."
        backHref="/creator/dashboard"
        backLabel="Dashboard"
      />

      <div className="grid grid-cols-3 gap-3">
        {stats.map(({ label, value }) => (
          <div key={label} className="rounded-xl border border-border bg-card p-4 space-y-2">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">{label}</p>
            <p className="font-dashboard-serif text-2xl text-foreground tabular-nums">
              {typeof value === 'number' ? formatNumber(value) : value}
            </p>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between gap-4 rounded-xl border border-border bg-card px-4 py-3">
        <p className="text-xs text-muted-foreground">
          Monthly views, growth tracking, and deeper audience insights are available on Pro.
        </p>
        <Link href="/pricing" className="shrink-0 text-xs text-foreground underline underline-offset-4">
          Upgrade
        </Link>
      </div>

      <section className="space-y-3">
        <h2 className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Recent followers</h2>
        {!recentFollowers?.length ? (
          <div className="rounded-xl border border-dashed border-border px-6 py-14 text-center space-y-2">
            <p className="font-dashboard-serif text-lg text-foreground">No followers yet</p>
            <p className="text-sm text-muted-foreground">Submit your works and build your audience.</p>
            <Link href="/creator/dashboard/works/new" className="inline-block text-xs text-foreground underline underline-offset-4">
              Submit a work
            </Link>
          </div>
        ) : (
          <div className="divide-y divide-border rounded-xl border border-border bg-card">
            {(recentFollowers as any[]).map(follow => {
              const p        = Array.isArray(follow.profiles) ? follow.profiles[0] : follow.profiles
              const initials = (p?.display_name || p?.username || 'U').slice(0, 2).toUpperCase()
              return (
                <Link
                  key={follow.follower_id}
                  href={p?.username ? getProfileRoute(p.username, 'reader') : '#'}
                  className="flex items-center gap-3 px-4 py-3 hover:bg-muted/40 transition-colors first:rounded-t-xl last:rounded-b-xl"
                >
                  <Avatar className="h-8 w-8 shrink-0">
                    <AvatarImage src={p?.avatar_url} />
                    <AvatarFallback className="text-xs bg-muted text-foreground">{initials}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-foreground truncate">{p?.display_name || p?.username}</p>
                    <p className="text-xs text-muted-foreground tabular-nums">
                      {p?.total_recommendations ?? 0} recs · Followed {formatDate(follow.created_at)}
                    </p>
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </section>
    </PageShell>
  )
}
