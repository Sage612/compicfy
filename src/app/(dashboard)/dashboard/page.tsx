import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { BookOpen, Bookmark, Star, ThumbsUp, Plus, Settings } from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import type { Profile } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Dashboard' }

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profileData } = await supabase
  .from('profiles')
  .select('*')
  .eq('id', user.id)
  .single()

if (!profileData) redirect('/login')

const profile = profileData as Profile

  const initials = (profile.display_name || profile.username)
    .slice(0, 2)
    .toUpperCase()

  const stats = [
    {
      label: 'Recommendations',
      value: profile.total_recommendations,
      icon: BookOpen,
      href: '/dashboard/recommendations',
      color: 'text-primary',
      bg: 'bg-primary/10',
    },
    {
      label: 'Saved Comics',
      value: '—',
      icon: Bookmark,
      href: '/dashboard/saved',
      color: 'text-secondary',
      bg: 'bg-secondary/10',
    },
    {
      label: 'Reviews Written',
      value: profile.total_reviews,
      icon: Star,
      href: '/dashboard/reviews',
      color: 'text-yellow-500',
      bg: 'bg-yellow-500/10',
    },
    {
      label: 'Votes Received',
      value: profile.total_votes_received,
      icon: ThumbsUp,
      href: '/dashboard/recommendations',
      color: 'text-green-500',
      bg: 'bg-green-500/10',
    },
  ]

  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">

      {/* Welcome card */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 p-6 rounded-xl border border-border bg-card">
        <Avatar className="h-16 w-16 border-2 border-border shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1 min-w-0">
          <h1 className="text-xl font-bold truncate">
            Welcome back, {profile.display_name || profile.username}!
          </h1>
          <p className="text-sm text-muted-foreground">
            Member since {formatDate(profile.member_since)}
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <Link href="/dashboard/settings">
            <Button variant="outline" size="sm" className="gap-1.5">
              <Settings size={14} />
              Settings
            </Button>
          </Link>
          <Link href="/dashboard/recommendations/new">
            <Button size="sm" className="gap-1.5">
              <Plus size={14} />
              Add Comic
            </Button>
          </Link>
        </div>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {stats.map(({ label, value, icon: Icon, href, color, bg }) => (
          <Link
            key={label}
            href={href}
            className="p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors group"
          >
            <div className={`w-9 h-9 rounded-lg ${bg} flex items-center justify-center mb-3`}>
              <Icon size={18} className={color} />
            </div>
            <p className="text-2xl font-bold">{value}</p>
            <p className="text-xs text-muted-foreground mt-0.5">{label}</p>
          </Link>
        ))}
      </div>

      {/* Quick actions */}
      <div>
        <h2 className="text-base font-semibold mb-3">Quick Actions</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Link href="/dashboard/recommendations/new">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                <Plus size={18} className="text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">Submit a Recommendation</p>
                <p className="text-xs text-muted-foreground">Share a comic with the community</p>
              </div>
            </div>
          </Link>
          <Link href="/browse">
            <div className="flex items-center gap-3 p-4 rounded-xl border border-border bg-card hover:border-primary transition-colors cursor-pointer">
              <div className="w-9 h-9 rounded-lg bg-secondary/10 flex items-center justify-center shrink-0">
                <BookOpen size={18} className="text-secondary" />
              </div>
              <div>
                <p className="text-sm font-medium">Browse Comics</p>
                <p className="text-xs text-muted-foreground">Discover new recommendations</p>
              </div>
            </div>
          </Link>
        </div>
      </div>
    </div>
  )
}