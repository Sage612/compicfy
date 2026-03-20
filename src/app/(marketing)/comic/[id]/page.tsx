import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { Badge } from '@/components/ui/badge'
import { ReviewSection } from '@/components/recommendations/ReviewSection'
import { AddToListButton } from '@/components/recommendations/AddToListButton'
import { SimilarComics } from '@/components/recommendations/SimilarComics'
import {
  BookOpen, Calendar, Hash, User, Palette,
  Globe, ExternalLink, ArrowLeft, ShieldAlert,
  Star, ThumbsUp, Bookmark, MessageSquare,
} from 'lucide-react'
import Link from 'next/link'
import { formatDate } from '@/lib/utils/format'
import { VoteButtons } from '@/components/recommendations/VoteButtons'
import { SaveButton } from '@/components/recommendations/SaveButton'
import { ShareButton } from '@/components/recommendations/ShareButton'
import type { Metadata } from 'next'
import type { Recommendation } from '@/types/database.types'
import { Button } from '@/components/ui/button'

// NEW IMPORT: Affiliate Components and Suspense
import { Suspense } from 'react'
import { ContextualOffers } from '@/components/affiliate/ContextualOffers'

interface Props {
  params: Promise<{ id: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params
  const supabase = await createClient()
  const { data } = await supabase
    .from('recommendations')
    .select('title, description, type, genres, author, cover_url, status')
    .eq('id', id)
    .single()

  const rec = data as Pick<
    Recommendation,
    'title' | 'description' | 'type' | 'genres' | 'author' | 'cover_url' | 'status'
  > | null
  if (!rec) return { title: 'Comic | Compicfy' }

  const typeLabel = rec.type
    ? rec.type.charAt(0).toUpperCase() + rec.type.slice(1)
    : 'Comic'

  const genreList = rec.genres?.slice(0, 3).join(', ') ?? ''

  // Title optimised for search — e.g. "Solo Leveling Manhwa | Compicfy"
  const title = `${rec.title} ${typeLabel} | Compicfy`

  // Description targets "where to read", "review" search intent
  const descParts = [
    `${rec.title} is a ${typeLabel.toLowerCase()}`,
    rec.author ? `by ${rec.author}` : null,
    genreList ? `in the genres ${genreList}` : null,
    rec.status ? `— currently ${rec.status}` : null,
    rec.description
      ? `. ${rec.description.slice(0, 100)}`
      : '. Discover where to read it and what the community thinks.',
  ].filter(Boolean).join(' ')

  const description = descParts.slice(0, 160)

  // Keywords target high-intent searches
  const keywords = [
    rec.title,
    `${rec.title} ${rec.type}`,
    `${rec.title} review`,
    `${rec.title} where to read`,
    `${rec.title} recommendation`,
    ...(rec.genres ?? []),
    rec.author ?? '',
    typeLabel,
    'manga recommendation',
    'manhwa recommendation',
    'webtoon recommendation',
  ].filter(Boolean)

  return {
    title,
    description,
    keywords,
    openGraph: {
      title,
      description,
      type: 'article',
      url: `https://compicfy.site/comic/${id}`,
      images: rec.cover_url
        ? [
            {
              url: rec.cover_url,
              width: 400,
              height: 600,
              alt: `${rec.title} cover`,
            },
          ]
        : [],
    },
    twitter: {
      card: 'summary_large_image',
      title,
      description,
      images: rec.cover_url ? [rec.cover_url] : [],
    },
    alternates: {
      canonical: `https://compicfy.site/comic/${id}`,
    },
  }
}

const TYPE_STYLES: Record<string, { gradient: string; badge: string; glow: string; border: string }> = {
  manga:   { gradient: 'from-rose-500   to-pink-600',    badge: 'bg-rose-500/15   text-rose-500   border-rose-500/25',   glow: 'bg-rose-500/20',   border: 'border-rose-500/30'   },
  manhwa:  { gradient: 'from-violet-500 to-purple-600',  badge: 'bg-violet-500/15 text-violet-500 border-violet-500/25', glow: 'bg-violet-500/20', border: 'border-violet-500/30' },
  manhua:  { gradient: 'from-amber-500  to-orange-500',  badge: 'bg-amber-500/15  text-amber-500  border-amber-500/25',  glow: 'bg-amber-500/20',  border: 'border-amber-500/30'  },
  webtoon: { gradient: 'from-teal-500   to-cyan-600',    badge: 'bg-teal-500/15   text-teal-500   border-teal-500/25',   glow: 'bg-teal-500/20',   border: 'border-teal-500/30'   },
  comic:   { gradient: 'from-blue-500   to-indigo-600',  badge: 'bg-blue-500/15   text-blue-500   border-blue-500/25',   glow: 'bg-blue-500/20',   border: 'border-blue-500/30'   },
}

const STATUS_STYLES: Record<string, string> = {
  ongoing:   'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20',
  completed: 'bg-blue-500/10   text-blue-600    dark:text-blue-400    border-blue-500/20',
  hiatus:    'bg-amber-500/10  text-amber-600   dark:text-amber-400   border-amber-500/20',
  cancelled: 'bg-red-500/10    text-red-600     dark:text-red-400     border-red-500/20',
}

export default async function ComicDetailPage({ params }: Props) {
  const { id } = await params
  const supabase = await createClient()

  await (supabase as any).rpc('increment_view_count', { rec_id: id })

  const { data: rawRec } = await supabase
    .from('recommendations')
    .select('*')
    .eq('id', id)
    .eq('is_approved', true)
    .single()

  if (!rawRec) notFound()
  const rec = rawRec as Recommendation

  const { data: { user } } = await supabase.auth.getUser()

  if (rec.content_rating === 'adult' || rec.content_rating === 'mature') {
    if (!user) {
      return (
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-black">Age Restricted</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This comic contains {rec.content_rating === 'adult' ? '18+' : '17+'} content. Log in and enable adult content in settings to view it.
          </p>
          <div className="flex justify-center gap-3">
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/login"><Button>Log In</Button></Link>
          </div>
        </div>
      )
    }
    const { data: profileFlag } = await supabase.from('profiles').select('adult_content_enabled').eq('id', user.id).single()
    if (!(profileFlag as any)?.adult_content_enabled) {
      return (
        <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
          <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
            <ShieldAlert size={32} className="text-destructive" />
          </div>
          <h1 className="text-2xl font-black">Adult Content Disabled</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">Enable adult content in your profile settings to view this comic.</p>
          <div className="flex justify-center gap-3">
            <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
            <Link href="/dashboard/settings"><Button>Go to Settings</Button></Link>
          </div>
        </div>
      )
    }
  }

  const { data: profileData } = await supabase
    .from('profiles').select('username, display_name, avatar_url').eq('id', rec.user_id).maybeSingle()
  const profile = profileData as { username: string; display_name: string; avatar_url: string | null } | null

  let userVote: 'up' | 'down' | null = null
  let isSaved = false
  if (user) {
    const [voteRes, saveRes] = await Promise.all([
      (supabase as any).from('votes').select('vote_type').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle(),
      (supabase as any).from('saves').select('id').eq('user_id', user.id).eq('recommendation_id', id).maybeSingle(),
    ])
    userVote = (voteRes.data?.vote_type as 'up' | 'down') ?? null
    isSaved  = !!saveRes.data
  }

  const typeStyle = TYPE_STYLES[rec.type] ?? {
    gradient: 'from-primary to-violet-500',
    badge: 'bg-primary/15 text-primary border-primary/25',
    glow: 'bg-primary/20',
    border: 'border-primary/30',
  }

  return (
    <div className="min-h-screen">

      {/* ── CINEMATIC HERO ── */}
      <div className="relative h-56 md:h-72 overflow-hidden">
        {rec.cover_url && (
          <img
            src={rec.cover_url}
            alt=""
            className="absolute inset-0 w-full h-full object-cover scale-110 blur-xl opacity-25 dark:opacity-20"
            aria-hidden
          />
        )}
        <div className={`absolute inset-0 bg-gradient-to-br ${typeStyle.gradient} opacity-15 dark:opacity-25`} />
        <div className="absolute inset-0 bg-gradient-to-t from-background via-background/70 to-transparent" />
        <div className="absolute top-4 left-4 z-10">
          <Link
            href="/browse"
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background/80 backdrop-blur-sm border border-border text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft size={13} />
            Browse
          </Link>
        </div>
      </div>

      {/* ── CONTENT ── */}
      <div className="max-w-5xl mx-auto px-4 -mt-28 md:-mt-40 relative z-10 pb-20">
        <div className="flex flex-col md:flex-row gap-8">

          {/* ── LEFT: Cover + actions ── */}
          <div className="flex flex-col gap-3 md:w-52 shrink-0">

            {/* Cover with glow */}
            <div className="relative">
              <div className={`absolute -inset-3 rounded-3xl ${typeStyle.glow} blur-2xl opacity-60`} />
              <div className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-muted border border-border shadow-2xl">
                {rec.cover_url ? (
                  <img src={rec.cover_url} alt={rec.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <BookOpen size={40} className="text-muted-foreground opacity-40" />
                  </div>
                )}
                <div className="absolute top-2 left-2">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-[10px] font-bold border capitalize backdrop-blur-sm ${typeStyle.badge}`}>
                    {rec.type}
                  </span>
                </div>
                {rec.is_featured && (
                  <div className="absolute top-2 right-2">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-500 border border-amber-500/30 backdrop-blur-sm">
                      <Star size={8} className="fill-amber-500" />
                      Featured
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Action buttons */}
            <VoteButtons
              recommendationId={id}
              initialUpvotes={rec.upvotes}
              initialDownvotes={rec.downvotes}
              initialVote={userVote}
              isLoggedIn={!!user}
            />
            <SaveButton recommendationId={id} initialSaved={isSaved} isLoggedIn={!!user} />
            {user && <AddToListButton recommendationId={id} userId={user.id} />}
            {/* Share button */}
<ShareButton
  title={rec.title}
  url={`https://compicfy.site/comic/${id}`}
/>

            {/* Platforms */}
            {rec.official_platforms && rec.official_platforms.length > 0 && (
              <div className="space-y-1.5 pt-1">
                <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground px-1">Read On</p>
                {rec.official_platforms.map((platform: string, i: number) => (
                  <div key={platform} className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border bg-card text-xs hover:border-primary/40 transition-colors">
                    <Globe size={11} className="text-muted-foreground shrink-0" />
                    <span className="truncate flex-1">{platform}</span>
                    {rec.official_links?.[i] && (
                      <a href={rec.official_links[i]} target="_blank" rel="noopener noreferrer" onClick={(e) => e.stopPropagation()}>
                        <ExternalLink size={11} className="text-muted-foreground hover:text-primary transition-colors" />
                      </a>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* ── RIGHT: Details ── */}
          <div className="flex-1 min-w-0 space-y-6 pt-2 md:pt-20">

            {/* Header */}
            <div className="space-y-3">
              <div className="flex flex-wrap gap-2">
                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-bold border capitalize ${STATUS_STYLES[rec.status] ?? ''}`}>
                  {rec.status}
                </span>
                <span className="text-xs text-muted-foreground border border-border rounded-full px-2.5 py-1 capitalize">
                  {rec.content_rating?.replace('_', ' ')}
                </span>
              </div>

              <h1 className="text-3xl md:text-4xl font-black leading-tight tracking-tight">{rec.title}</h1>

              <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm text-muted-foreground">
                {rec.author && <span className="flex items-center gap-1.5"><User size={13} />{rec.author}</span>}
                {rec.artist && rec.artist !== rec.author && <span className="flex items-center gap-1.5"><Palette size={13} />{rec.artist}</span>}
                {rec.year_released && <span className="flex items-center gap-1.5"><Calendar size={13} />{rec.year_released}</span>}
                {rec.chapter_count && <span className="flex items-center gap-1.5"><Hash size={13} />{rec.chapter_count} ch.</span>}
              </div>

              <div className="flex flex-wrap gap-1.5">
                {rec.genres?.map((genre: string) => (
                  <Link key={genre} href={`/browse?genre=${genre}`}>
                    <span className="inline-flex px-2.5 py-1 rounded-full text-xs font-semibold bg-muted border border-border hover:bg-primary/10 hover:border-primary/30 hover:text-primary transition-colors cursor-pointer">
                      {genre}
                    </span>
                  </Link>
                ))}
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-4 gap-2">
              {[
                { icon: ThumbsUp,      label: 'Upvotes', value: rec.upvotes,      color: 'text-emerald-500', bg: 'bg-emerald-500/8' },
                { icon: Star,          label: 'Reviews', value: rec.review_count, color: 'text-amber-500',   bg: 'bg-amber-500/8'  },
                { icon: Bookmark,      label: 'Saves',   value: rec.save_count,   color: 'text-blue-500',    bg: 'bg-blue-500/8'   },
                { icon: MessageSquare, label: 'Score',   value: rec.score,        color: 'text-violet-500',  bg: 'bg-violet-500/8' },
              ].map(({ icon: Icon, label, value, color, bg }) => (
                <div key={label} className={`flex flex-col items-center gap-1 p-3 rounded-2xl ${bg} border border-border`}>
                  <Icon size={14} className={color} />
                  <p className="text-lg font-black tabular-nums leading-none">{value ?? 0}</p>
                  <p className="text-[10px] text-muted-foreground font-medium">{label}</p>
                </div>
              ))}
            </div>

            {/* About */}
            <div className="space-y-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">About</h2>
              <p className="text-sm leading-relaxed text-foreground/80">{rec.description}</p>
            </div>

            {/* Why recommend */}
            {rec.why_recommend && (
              <div className="space-y-2">
                <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Why Read This?</h2>
                <div className={`relative pl-5 pr-4 py-4 rounded-2xl border ${typeStyle.border} bg-card`}>
                  <div className={`absolute left-0 top-3 bottom-3 w-1 rounded-full bg-gradient-to-b ${typeStyle.gradient}`} />
                  <p className="text-sm leading-relaxed italic text-muted-foreground">"{rec.why_recommend}"</p>
                </div>
              </div>
            )}

            {/* Submitted by */}
            <div className="flex items-center justify-between py-3 border-t border-border text-xs text-muted-foreground">
              <span>
                Recommended by{' '}
                <Link href={`/profile/${profile?.username}`} className="text-foreground hover:text-primary font-semibold transition-colors">
                  @{profile?.display_name || profile?.username || 'unknown'}
                </Link>
              </span>
              <span>{formatDate(rec.created_at)}</span>
            </div>

            {/* Reviews */}
            <div className="space-y-3">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">Reviews</h2>
              <ReviewSection recommendationId={id} currentUserId={user?.id ?? null} isLoggedIn={!!user} />
            </div>

            {/* ── NEW: AFFILIATE MERCHANDISE SECTION ── */}
            <Suspense fallback={<div className="h-40 bg-muted/30 animate-pulse rounded-2xl border border-border mt-6" />}>
              <ContextualOffers 
                comicId={id} 
                comicTitle={rec.title} 
                genre={rec.genres?.[0] || 'Action'} // Passes primary genre or defaults to Action
              />
            </Suspense>

            {/* Similar */}
            <div className="space-y-3 pt-2">
              <h2 className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">You Might Also Like</h2>
              <SimilarComics comicId={id} contentRating={rec.content_rating} />
            </div>

          </div>
        </div>
      </div>
    </div>
  )
}