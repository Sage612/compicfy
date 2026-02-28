import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { CalendarDays, BookOpen, Star, ThumbsUp } from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Profile, Recommendation } from '@/types/database.types'

interface Props {
  params: Promise<{ username: string }>
}

type RecPreview = Pick<Recommendation, 'id' | 'title' | 'cover_url' | 'upvotes' | 'type' | 'genres'>

import type { Metadata } from 'next'

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username}` }
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('*')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile = profileData as Profile

  const { data: recData } = await supabase
    .from('recommendations')
    .select('id, title, cover_url, upvotes, type, genres')
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .order('created_at', { ascending: false })
    .limit(6)

  const recommendations = (recData ?? []) as RecPreview[]

  const initials = (profile.display_name || profile.username)
    .slice(0, 2)
    .toUpperCase()

  const roleColors: Record<string, string> = {
    admin: 'bg-destructive text-destructive-foreground',
    moderator: 'bg-secondary text-secondary-foreground',
    user: 'bg-muted text-muted-foreground',
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {/* Profile header */}
      <div className="flex flex-col sm:flex-row gap-6 items-start mb-8">
        <Avatar className="h-24 w-24 border-4 border-border shrink-0">
          <AvatarImage src={profile.avatar_url ?? undefined} />
          <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
            {initials}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            <h1 className="text-2xl font-bold truncate">
              {profile.display_name || profile.username}
            </h1>
            {profile.role !== 'user' && (
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${roleColors[profile.role]}`}>
                {profile.role}
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm mb-3">@{profile.username}</p>

          {profile.bio && (
            <p className="text-sm leading-relaxed mb-4 max-w-lg">{profile.bio}</p>
          )}

          {/* Stats row */}
          <div className="flex flex-wrap gap-4 text-sm">
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <BookOpen size={14} />
              <span>
                <strong className="text-foreground">{profile.total_recommendations}</strong> recommendations
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <Star size={14} />
              <span>
                <strong className="text-foreground">{profile.total_reviews}</strong> reviews
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <ThumbsUp size={14} />
              <span>
                <strong className="text-foreground">{profile.total_votes_received}</strong> votes received
              </span>
            </div>
            <div className="flex items-center gap-1.5 text-muted-foreground">
              <CalendarDays size={14} />
              <span>Joined {formatDate(profile.member_since)}</span>
            </div>
          </div>

          {/* Favorite genres */}
          {profile.favorite_genres?.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-4">
              {profile.favorite_genres.map((genre: string) => (
                <Badge key={genre} variant="secondary" className="text-xs">
                  {genre}
                </Badge>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Recent recommendations */}
      {recommendations.length > 0 && (
        <div>
          <h2 className="text-lg font-semibold mb-4">Recent Recommendations</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {recommendations.map((rec) => (
              <Link
                key={rec.id}
                href={`/comic/${rec.id}`}
                className="group block rounded-lg border border-border overflow-hidden hover:border-primary transition-colors bg-card"
              >
                <div className="aspect-[3/4] bg-muted relative overflow-hidden">
                  {rec.cover_url ? (
                    <img
                      src={rec.cover_url}
                      alt={rec.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center">
                      <BookOpen size={32} className="text-muted-foreground" />
                    </div>
                  )}
                </div>
                <div className="p-2">
                  <p className="text-xs font-medium truncate">{rec.title}</p>
                  <p className="text-xs text-muted-foreground">{rec.type}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {recommendations.length === 0 && (
        <div className="text-center py-12 text-muted-foreground">
          <BookOpen size={40} className="mx-auto mb-3 opacity-30" />
          <p>No recommendations yet</p>
        </div>
      )}
    </div>
  )
}