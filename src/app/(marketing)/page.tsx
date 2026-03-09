import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { NewsCard } from '@/components/news/NewsCard'
import { ParticleCanvas } from '@/components/layout/ParticleCanvas'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import {
  ArrowRight, BookOpen, Users, TrendingUp,
  Star, Sparkles, ChevronRight, Flame, Heart,
} from 'lucide-react'
import type { Recommendation } from '@/types/database.types'
import type { News } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compicfy — Discover Your Next Favorite Comic',
  description:
    'A warm community for manga, manhwa, manhua, and webtoon fans. Discover, recommend, and vote for the best comics.',
  openGraph: {
    title: 'Compicfy — Discover Your Next Favorite Comic',
    description: 'Community-powered comic discovery. Browse, recommend, and vote.',
  },
}

const GENRES = [
  { label: 'Action',        emoji: '⚔️',  href: '/browse?genre=Action'        },
  { label: 'Romance',       emoji: '🌸',  href: '/browse?genre=Romance'       },
  { label: 'Fantasy',       emoji: '✨',  href: '/browse?genre=Fantasy'       },
  { label: 'Comedy',        emoji: '😂',  href: '/browse?genre=Comedy'        },
  { label: 'Sci-Fi',        emoji: '🚀',  href: '/browse?genre=Sci-Fi'        },
  { label: 'Drama',         emoji: '🎭',  href: '/browse?genre=Drama'         },
  { label: 'Horror',        emoji: '👻',  href: '/browse?genre=Horror'        },
  { label: 'Sports',        emoji: '⚡',  href: '/browse?genre=Sports'        },
  { label: 'Slice of Life', emoji: '🍵',  href: '/browse?genre=Slice-of-Life' },
  { label: 'Mystery',       emoji: '🔍',  href: '/browse?genre=Mystery'       },
]

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: trending },
    { data: recentNews },
    { count: memberCount },
    { count: comicCount },
  ] = await Promise.all([
    supabase
      .from('recommendations')
      .select('*')
      .eq('is_approved', true)
      .not('content_rating', 'in', '("adult","mature")')
      .order('score', { ascending: false })
      .limit(6),
    supabase
      .from('news')
      .select('*')
      .eq('is_published', true)
      .order('published_at', { ascending: false })
      .limit(3),
    supabase
      .from('profiles')
      .select('id', { count: 'exact', head: true }),
    supabase
      .from('recommendations')
      .select('id', { count: 'exact', head: true })
      .eq('is_approved', true),
  ])

  const { data: { user } } = await supabase.auth.getUser()

  const topComics    = (trending   as Recommendation[]) ?? []
  const latestNews   = (recentNews as News[])           ?? []
  const totalMembers = memberCount ?? 0
  const totalComics  = comicCount  ?? 0

  return (
    <div className="flex flex-col">

      {/* ── HERO ─────────────────────────────────────────────────── */}
      <section className="relative overflow-hidden min-h-[88vh] flex flex-col items-center justify-center">

        {/* Plain background — no amber tint */}
        <div className="absolute inset-0 bg-background" />

        {/* Subtle glow blobs — visible in both modes */}
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[400px] rounded-full bg-primary/8 blur-[120px]" />
          <div className="absolute bottom-0 right-1/4 w-[400px] h-[300px] rounded-full bg-primary/5 blur-[100px]" />
        </div>

        {/* Particles — higher opacity so visible in light mode */}
        <div className="absolute inset-0 opacity-60 dark:opacity-100">
          <ParticleCanvas />
        </div>

        {/* Comic-book decorative lines */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.05] hidden md:block" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 40 }).map((_, i) => {
              const angle = (i / 40) * 360
              const rad   = (angle * Math.PI) / 180
              return (
                <line key={i} x1="700" y1="80"
                  x2={700 + Math.cos(rad) * 1200}
                  y2={80  + Math.sin(rad) * 1200}
                  stroke="currentColor"
                  strokeWidth={i % 4 === 0 ? '2' : '0.8'}
                />
              )
            })}
          </svg>

          {/* Floating comic-panel outlines */}
          <div className="absolute top-12 right-24 w-28 h-36 rounded-lg border-2 border-primary/10 dark:border-primary/15 rotate-6 hidden md:block" />
          <div className="absolute top-6  right-40 w-20 h-28 rounded-lg border-2 border-primary/8 dark:border-primary/15 -rotate-3 hidden md:block" />
          <div className="absolute top-24 right-16 w-16 h-20 rounded-lg border border-primary/8 dark:border-primary/12 rotate-12 hidden md:block" />
          <div className="absolute bottom-8 right-56 w-24 h-32 rounded-lg border-2 border-primary/6 dark:border-primary/12 -rotate-6 hidden md:block" />

          {/* Kanji watermark */}
          <div className="absolute bottom-12 left-12 opacity-[0.04] dark:opacity-[0.06] text-[80px] font-black text-foreground leading-none select-none tracking-tighter hidden md:block">
            読む
          </div>
        </div>

        {/* ── Hero content ── */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 w-full">
          <div className="max-w-2xl mx-auto md:mx-0 text-center md:text-left space-y-7">

            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles size={13} />
              Community-Powered Discovery
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-[1.05] tracking-tight">
              Find your next{' '}
              <span className="relative inline-block">
                <span className="text-primary">obsession.</span>
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 240 10" preserveAspectRatio="none">
                  <path
                    d="M2,7 Q60,1 120,5 Q180,9 238,3"
                    stroke="currentColor" strokeWidth="3"
                    fill="none" strokeLinecap="round"
                    className="text-primary/50"
                  />
                </svg>
              </span>
            </h1>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
              A warm corner of the internet for manga, manhwa, manhua &amp; webtoon fans
              to discover, recommend, and vote for the best reads.
            </p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/browse">
                <Button size="lg" className="gap-2 h-12 px-6 font-semibold shadow-lg border-0">
                  <BookOpen size={17} />
                  Browse Comics
                  <ArrowRight size={15} />
                </Button>
              </Link>
              {!user && (
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="gap-2 h-12 px-6">
                    <Users size={17} />
                    Join Free
                  </Button>
                </Link>
              )}
              {user && (
                <Link href="/dashboard/recommendations/new">
                  <Button size="lg" variant="outline" className="gap-2 h-12 px-6">
                    <Sparkles size={17} />
                    Share a Pick
                  </Button>
                </Link>
              )}
            </div>

            {/* Live stats */}
            <div className="flex flex-wrap gap-5 pt-1 justify-center md:justify-start">
              {[
                { label: 'Members',         value: totalMembers, suffix: '+', icon: Users      },
                { label: 'Comics Shared',   value: totalComics,  suffix: '+', icon: BookOpen   },
                { label: 'Community Picks', value: null,         suffix: '',  icon: TrendingUp, text: 'Daily' },
              ].map(({ label, value, suffix, icon: Icon, text }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon size={14} className="text-primary shrink-0" />
                  <span className="font-semibold text-foreground tabular-nums">
                    {text ?? (
                      value !== null && value > 0
                        ? <AnimatedCounter target={value} suffix={suffix} />
                        : 'Growing'
                    )}
                  </span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Scroll indicator */}
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted-foreground/40 text-[10px] tracking-widest uppercase pointer-events-none">
          <span>scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/30 to-transparent" />
        </div>
      </section>

      {/* ── GENRE MOOD PILLS ──────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <div className="flex items-center gap-3 mb-5 justify-center">
            <span className="text-sm text-muted-foreground font-medium tracking-wide uppercase">
              Browse by mood
            </span>
          </div>
          <div className="flex flex-wrap gap-2 justify-center">
            {GENRES.map((g) => (
              <Link key={g.label} href={g.href}>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-border bg-background/60 hover:bg-primary/8 hover:border-primary/30 hover:text-primary text-sm text-muted-foreground transition-all duration-150 cursor-pointer select-none backdrop-blur-sm">
                  <span className="text-base leading-none">{g.emoji}</span>
                  {g.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── TRENDING COMICS ──────────────────────────────────────── */}
      {topComics.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                <Flame size={20} className="text-primary" />
                Trending Now
              </h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Top community recommendations right now
              </p>
            </div>
            <Link href="/browse?sort=score">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                View all <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
            {topComics.map((rec) => (
              <ComicCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 py-14 space-y-10">
          <div className="text-center space-y-2">
            <p className="text-xs text-primary uppercase tracking-widest font-medium">Getting Started</p>
            <h2 className="text-2xl font-bold">Simple as Sunday morning</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              No algorithms. Just real readers sharing what they love.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {[
              {
                step:  '01',
                icon:  BookOpen,
                title: 'Submit a Recommendation',
                desc:  'Share a manga, manhwa, or webtoon you love. Add genres, a cover, and tell us why others need to read it.',
                accent: 'text-primary bg-primary/10',
              },
              {
                step:  '02',
                icon:  TrendingUp,
                title: 'Community Votes',
                desc:  'The community upvotes great picks. The best ones rise to the top and land on the featured carousel.',
                accent: 'text-primary bg-primary/10',
              },
              {
                step:  '03',
                icon:  Heart,
                title: 'Discover & Save',
                desc:  'Find your next obsession through community picks. Leave reviews, save favourites, track your reading list.',
                accent: 'text-rose-500 bg-rose-500/10',
              },
            ].map(({ step, icon: Icon, title, desc, accent }) => (
              <div
                key={step}
                className="relative p-6 rounded-2xl bg-card border border-border space-y-4 hover:border-primary/30 hover:shadow-lg hover:shadow-primary/5 transition-all duration-200 group"
              >
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${accent}`}>
                    <Icon size={19} />
                  </div>
                  <span className="text-4xl font-black text-muted-foreground/10 group-hover:text-muted-foreground/15 transition-colors">
                    {step}
                  </span>
                </div>
                <h3 className="font-semibold text-lg leading-snug">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATEST NEWS ──────────────────────────────────────────── */}
      {latestNews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-14 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📰 Latest News</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Updates from the manga &amp; comics world
              </p>
            </div>
            <Link href="/news">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                All news <ChevronRight size={14} />
              </Button>
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {latestNews.map((item) => (
              <NewsCard key={item.id} news={item} />
            ))}
          </div>
        </section>
      )}

      {/* ── CTA BANNER ───────────────────────────────────────────── */}
      <section className="max-w-7xl mx-auto px-4 py-14 w-full">
        <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 dark:from-violet-500 dark:via-indigo-500 dark:to-violet-600">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-20 -left-10  w-72 h-72 rounded-full bg-white/5  pointer-events-none" />
          <div className="absolute top-4 right-32       w-20 h-20 rounded-full bg-white/8  pointer-events-none" />

          <div className="relative max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/15 text-white text-sm font-medium">
              <Star size={13} />
              Got a hidden gem?
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white drop-shadow-sm">
              Help others find their<br className="hidden md:block" /> next favourite read.
            </h2>

            <p className="text-white/85 leading-relaxed text-base">
              Share your favourite manga, manhwa, or webtoon with thousands of readers. Every good rec helps someone fall in love with a new story.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link href={user ? '/dashboard/recommendations/new' : '/signup'}>
                <Button
                  size="lg"
                  className="gap-2 h-11 bg-white text-violet-700 hover:bg-white/95 font-semibold shadow-lg border-0"
                >
                  <BookOpen size={15} />
                  {user ? 'Submit a Recommendation' : "Join Compicfy — it's free"}
                </Button>
              </Link>
              <Link href="/browse">
                <Button
                  size="lg"
                  className="gap-2 h-11 bg-white/10 text-white hover:bg-white/20 border border-white/30 font-semibold"
                >
                  Browse First
                  <ArrowRight size={15} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}