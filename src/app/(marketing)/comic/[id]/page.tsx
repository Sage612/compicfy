import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { ReviewSection } from '@/components/recommendations/ReviewSection'
import {
  BookOpen,
  Calendar,
  Hash,
  User,
  Palette,
  Globe,
  ExternalLink,
  ArrowLeft,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/database.types'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('title, description')
    .eq('id', id)
    .single()
  const rec = data as Pick<Recommendation, 'title' | 'description'> | null
  return {
    title: rec?.title ?? 'Comic',
    description: rec?.description?.slice(0, 160),
  }
}

const statusColors: Record<string, string> = {
  ongoing: 'bg-green-500/10 text-green-600 border-green-500/20',
  completed: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  hiatus: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
  cancelled: 'bg-red-500/10 text-red-600 border-red-500/20',
}

export default async function ComicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  // Increment view count
  await (supabase as any).rpc('increment_view_count', { rec_id: id }).maybeSingle()

  const { data: rawRec } = await supabase
  .from('recommendations')
  .select('*')
  .eq('id', id)
  .eq('is_approved', true)
  .single()

  if (!rawRec) notFound()
  const rec = rawRec as Recommendation

  const { data: profileData } = await supabase
  .from('profiles')
  .select('username, display_name, avatar_url')
  .eq('id', rec.user_id)
  .single()

  const profile = profileData as { username: string; display_name: string; avatar_url: string | null } | null

  const { data: { user } } = await supabase.auth.getUser()

  let userVote: 'up' | 'down' | null = null
  let isSaved = false

  if (user) {
    const [{ data: voteData }, { data: saveData }] = await Promise.all([
      (supabase as any)
        .from('votes')
        .select('vote_type')
        .eq('user_id', user.id)
        .eq('recommendation_id', id)
        .single(),
      (supabase as any)
        .from('saves')
        .select('id')
        .eq('user_id', user.id)
        .eq('recommendation_id', id)
        .single(),
    ])
    userVote = (voteData?.vote_type as 'up' | 'down') ?? null
    isSaved = !!saveData
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-6">
      {/* Back button */}
      <Link
        href="/browse"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={15} />
        Back to Browse
      </Link>

      <div className="flex flex-col md:flex-row gap-8">
        {/* Left: Cover + Actions */}
        <div className="flex flex-col gap-4 md:w-56 shrink-0">
          {/* Cover */}
          <div className="aspect-[3/4] rounded-xl overflow-hidden bg-muted border border-border">
            {rec.cover_url ? (
              <img
                src={rec.cover_url}
                alt={rec.title}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center">
                <BookOpen size={40} className="text-muted-foreground opacity-40" />
              </div>
            )}
          </div>

          {/* Vote + Save */}
          <VoteButtons
            recommendationId={id}
            initialUpvotes={rec.upvotes}
            initialDownvotes={rec.downvotes}
            initialVote={userVote}
            isLoggedIn={!!user}
          />

          <SaveButton
            recommendationId={id}
            initialSaved={isSaved}
            isLoggedIn={!!user}
          />

          {/* Platform links */}
          {rec.official_platforms?.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                Read On
              </p>
              {rec.official_platforms.map((platform: string, i: number) => (
                <div
                  key={platform}
                  className="flex items-center gap-2 px-3 py-2 rounded-lg border border-border bg-card text-sm hover:border-primary transition-colors"
                >
                  <Globe size={13} className="text-muted-foreground shrink-0" />
                  <span className="truncate flex-1">{platform}</span>
                  {rec.official_links?.[i] && (
                    <a
                     
  href={rec.official_links[i]}
  target="_blank"
  rel="noopener noreferrer"
  aria-label={`Read ${platform} externally`}
  onClick={(e) => e.stopPropagation()}
>
  <ExternalLink size={12} className="text-muted-foreground hover:text-primary" />
</a>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Details */}
        <div className="flex-1 min-w-0 space-y-5">
          {/* Title + status */}
          <div>
            <div className="flex flex-wrap items-start gap-2 mb-2">
              <h1 className="text-2xl md:text-3xl font-bold leading-tight">{rec.title}</h1>
              <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border capitalize mt-1 ${statusColors[rec.status] ?? ''}`}>
                {rec.status}
              </span>
            </div>

            {/* Meta row */}
            <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
              <span className="capitalize font-medium text-foreground">{rec.type}</span>
              {rec.author && (
                <span className="flex items-center gap-1">
                  <User size={13} />
                  {rec.author}
                </span>
              )}
              {rec.artist && rec.artist !== rec.author && (
                <span className="flex items-center gap-1">
                  <Palette size={13} />
                  {rec.artist}
                </span>
              )}
              {rec.year_released && (
                <span className="flex items-center gap-1">
                  <Calendar size={13} />
                  {rec.year_released}
                </span>
              )}
              {rec.chapter_count && (
                <span className="flex items-center gap-1">
                  <Hash size={13} />
                  {rec.chapter_count} chapters
                </span>
              )}
            </div>
          </div>

          {/* Genres */}
          <div className="flex flex-wrap gap-1.5">
            {rec.genres?.map((genre: string) => (
              <Link key={genre} href={`/browse?genre=${genre}`}>
                <Badge variant="secondary" className="hover:bg-primary hover:text-primary-foreground transition-colors cursor-pointer">
                  {genre}
                </Badge>
              </Link>
            ))}
            <Badge variant="outline" className="capitalize">{rec.content_rating}</Badge>
          </div>

          <Separator />

          {/* Description */}
          <div className="space-y-2">
            <h2 className="text-base font-semibold">About</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">{rec.description}</p>
          </div>

          {/* Why recommend */}
          {rec.why_recommend && (
            <>
              <Separator />
              <div className="space-y-2">
                <h2 className="text-base font-semibold">Why Read This?</h2>
                <div className="p-4 rounded-lg bg-primary/5 border border-primary/10">
                  <p className="text-sm leading-relaxed italic">"{rec.why_recommend}"</p>
                </div>
              </div>
            </>
          )}

          <Separator />

          {/* Stats */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {[
              { label: 'Upvotes', value: rec.upvotes },
              { label: 'Downvotes', value: rec.downvotes },
              { label: 'Reviews', value: rec.review_count },
              { label: 'Saves', value: rec.save_count },
            ].map(({ label, value }) => (
              <div key={label} className="text-center p-3 rounded-lg bg-card border border-border">
                <p className="text-xl font-bold">{value}</p>
                <p className="text-xs text-muted-foreground">{label}</p>
              </div>
            ))}
          </div>

          {/* Submitted by */}
          <Separator />
          <div className="flex items-center justify-between text-sm text-muted-foreground">
            <span>
              Submitted by{' '}
              <Link
                href={`/profile/${profile?.username}`}
                className="text-foreground hover:text-primary font-medium transition-colors"
              >
                @{profile?.display_name || profile?.username}
              </Link>
            </span>
            <span>{formatDate(rec.created_at)}</span>
          </div>
                {/* Reviews */}
      <Separator />
      <ReviewSection
        recommendationId={id}
        currentUserId={user?.id ?? null}
        isLoggedIn={!!user}
      />
        </div>
      </div>
    </div>
  )
}