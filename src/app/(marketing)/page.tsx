import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { NewsCard } from '@/components/news/NewsCard'
import { ParticleCanvas } from '@/components/layout/ParticleCanvas'
import { AnimatedCounter } from '@/components/ui/AnimatedCounter'
import {
  ArrowRight, BookOpen, Users, TrendingUp,
  Star, Sparkles, ChevronRight, Heart, Zap,
} from 'lucide-react'
import type { Recommendation } from '@/types/database.types'
import type { News } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compicfy — Find your next obsession.',
   description:
    'A warm community for manga, manhwa, manhua, and webtoon fans. Discover, recommend, and vote for the best comics.',
  openGraph: {
    title: 'Compicfy — Find your next obsession.',
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
  { label: 'Slice of Life', emoji: '🍵',  href: '/browse?genre=Slice+of+Life' },
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
      <section className="relative overflow-hidden min-h-[92vh] flex flex-col items-center justify-center">

        <div className="absolute inset-0 bg-background" />

        {/* Dramatic glow blobs */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] h-[500px] rounded-full bg-violet-500/8 dark:bg-violet-500/12 blur-[140px]" />
          <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] rounded-full bg-rose-500/6 dark:bg-rose-500/10 blur-[100px]" />
          <div className="absolute bottom-0 right-0 w-[500px] h-[400px] rounded-full bg-primary/5 dark:bg-primary/8 blur-[120px]" />
        </div>

        {/* Particles */}
        <div className="absolute inset-0 opacity-50 dark:opacity-90">
          <ParticleCanvas />
        </div>

        {/* Decorative manga panels */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none hidden md:block">
          <div className="absolute top-16 right-20 w-32 h-44 rounded-2xl border border-primary/10 dark:border-primary/15 rotate-6 bg-primary/[0.02]" />
          <div className="absolute top-8  right-40 w-24 h-32 rounded-2xl border border-violet-500/10 dark:border-violet-500/15 -rotate-3 bg-violet-500/[0.02]" />
          <div className="absolute top-40 right-12 w-16 h-24 rounded-xl border border-rose-500/8 dark:border-rose-500/12 rotate-12" />
          <div className="absolute bottom-20 right-52 w-28 h-36 rounded-2xl border border-primary/8 dark:border-primary/12 -rotate-6 bg-primary/[0.01]" />
          <div className="absolute bottom-16 left-10 text-[100px] font-black leading-none select-none opacity-[0.03] dark:opacity-[0.05] text-foreground tracking-tighter">
            読む
          </div>
          <svg className="absolute inset-0 w-full h-full opacity-[0.03] dark:opacity-[0.04]" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 32 }).map((_, i) => {
              const angle = (i / 32) * 360
              const rad = (angle * Math.PI) / 180
              return (
                <line key={i} x1="720" y1="60"
                  x2={720 + Math.cos(rad) * 1400}
                  y2={60 + Math.sin(rad) * 1400}
                  stroke="currentColor"
                  strokeWidth={i % 5 === 0 ? '2' : '0.6'}
                />
              )
            })}
          </svg>
        </div>

        {/* Hero content */}
        <div className="relative z-10 max-w-7xl mx-auto px-4 py-24 w-full">
          <div className="max-w-2xl mx-auto md:mx-0 text-center md:text-left space-y-8">

            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-gradient-to-r from-violet-500/15 to-primary/15 border border-primary/20 text-primary text-sm font-semibold">
              <Zap size={13} className="fill-primary" />
              Community-Powered Discovery
            </div>

            <div className="space-y-1">
              <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
                Find your
              </h1>
              <h1 className="text-5xl md:text-7xl font-black leading-[0.95] tracking-tight">
                next{' '}
                <span className="relative inline-block">
                  <span className="bg-gradient-to-r from-primary via-violet-500 to-rose-500 bg-clip-text text-transparent">
                    obsession.
                  </span>
                  <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 12" preserveAspectRatio="none">
                    <path d="M2,9 Q75,2 150,6 Q225,10 298,4" stroke="url(#heroGrad)" strokeWidth="3" fill="none" strokeLinecap="round" />
                    <defs>
                      <linearGradient id="heroGrad" x1="0%" y1="0%" x2="100%" y2="0%">
                        <stop offset="0%" stopColor="#8b5cf6" stopOpacity="0.6" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.6" />
                      </linearGradient>
                    </defs>
                  </svg>
                </span>
              </h1>
            </div>

            <p className="text-lg text-muted-foreground leading-relaxed max-w-lg mx-auto md:mx-0">
              The community where manga, manhwa, manhua &amp; webtoon fans discover, recommend, and vote for the best reads.
            </p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/browse">
                <Button size="lg" className="gap-2 h-12 px-7 font-bold shadow-xl shadow-primary/20 border-0 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 text-white">
                  <BookOpen size={17} />
                  Browse Comics
                  <ArrowRight size={15} />
                </Button>
              </Link>
              {!user ? (
                <Link href="/signup">
                  <Button size="lg" variant="outline" className="gap-2 h-12 px-7 font-semibold hover:border-primary/50">
                    <Users size={17} />
                    Join Free
                  </Button>
                </Link>
              ) : (
                <Link href="/dashboard/recommendations/new">
                  <Button size="lg" variant="outline" className="gap-2 h-12 px-7 font-semibold hover:border-primary/50">
                    <Sparkles size={17} />
                    Share a Pick
                  </Button>
                </Link>
              )}
            </div>

            {/* Stats */}
            <div className="flex flex-wrap gap-6 pt-2 justify-center md:justify-start">
              {[
                { label: 'Members',       value: totalMembers, suffix: '+', icon: Users,      color: 'text-violet-500', bg: 'bg-violet-500/10' },
                { label: 'Comics Shared', value: totalComics,  suffix: '+', icon: BookOpen,   color: 'text-rose-500',   bg: 'bg-rose-500/10'   },
                { label: 'Updated',       value: null,         suffix: '',  icon: TrendingUp, color: 'text-emerald-500', bg: 'bg-emerald-500/10', text: 'Daily' },
              ].map(({ label, value, suffix, icon: Icon, color, bg, text }) => (
                <div key={label} className="flex items-center gap-2 text-sm">
                  <div className={`w-8 h-8 rounded-lg ${bg} flex items-center justify-center ${color}`}>
                    <Icon size={14} />
                  </div>
                  <div>
                    <p className="font-bold text-foreground tabular-nums leading-tight">
                      {text ?? (value !== null && value > 0 ? <AnimatedCounter target={value} suffix={suffix} /> : 'Growing')}
                    </p>
                    <p className="text-xs text-muted-foreground leading-tight">{label}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1.5 text-muted-foreground/30 text-[10px] tracking-widest uppercase pointer-events-none">
          <span>scroll</span>
          <div className="w-px h-8 bg-gradient-to-b from-muted-foreground/20 to-transparent" />
        </div>
      </section>

      {/* ── GENRE MOOD PILLS ──────────────────────────────────────── */}
      <section className="border-y border-border bg-muted/20">
        <div className="max-w-7xl mx-auto px-4 py-8">
          <p className="text-center text-xs font-bold uppercase tracking-widest text-muted-foreground mb-5">
            Browse by mood
          </p>
          <div className="flex flex-wrap gap-2 justify-center">
            {GENRES.map((g) => (
              <Link key={g.label} href={g.href}>
                <span className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-border bg-background hover:bg-primary/8 hover:border-primary/40 hover:text-primary hover:scale-105 text-sm text-muted-foreground transition-all duration-150 cursor-pointer select-none font-medium">
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
        <section className="max-w-7xl mx-auto px-4 py-16 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">🔥</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Trending Now</h2>
                <div className="h-0.5 w-10 rounded-full bg-rose-500 mt-1" />
              </div>
            </div>
            <Link href="/browse?sort=score">
              <Button variant="ghost" size="sm" className="gap-1 text-muted-foreground hover:text-foreground">
                View all <ChevronRight size={14} />
              </Button>
            </Link>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {topComics.map((rec) => (
              <ComicCard key={rec.id} recommendation={rec} />
            ))}
          </div>
        </section>
      )}

      {/* ── HOW IT WORKS ─────────────────────────────────────────── */}
      <section className="relative overflow-hidden border-y border-border bg-muted/20">
        <div className="absolute inset-0 pointer-events-none">
          <div className="absolute top-0 left-1/4 w-64 h-64 rounded-full bg-violet-500/5 blur-3xl" />
          <div className="absolute bottom-0 right-1/4 w-64 h-64 rounded-full bg-rose-500/5 blur-3xl" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 py-16 space-y-12">
          <div className="text-center space-y-3">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest">
              <Sparkles size={11} />
              How it works
            </div>
            <h2 className="text-3xl font-black tracking-tight">Simple as Sunday morning</h2>
            <p className="text-muted-foreground text-sm max-w-sm mx-auto">
              No algorithms. Just real readers sharing what they love.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: BookOpen,
                title: 'Submit a Recommendation',
                desc: 'Share a manga, manhwa, or webtoon you love. Add genres, a cover, and tell us why others need to read it.',
                gradient: 'from-violet-500 to-purple-600',
                glow: 'group-hover:shadow-violet-500/20',
              },
              {
                step: '02',
                icon: TrendingUp,
                title: 'Community Votes',
                desc: 'The community upvotes great picks. The best ones rise to the top and land on the featured carousel.',
                gradient: 'from-primary to-blue-600',
                glow: 'group-hover:shadow-primary/20',
              },
              {
                step: '03',
                icon: Heart,
                title: 'Discover & Save',
                desc: 'Find your next obsession through community picks. Leave reviews, save favourites, track your reading list.',
                gradient: 'from-rose-500 to-pink-600',
                glow: 'group-hover:shadow-rose-500/20',
              },
            ].map(({ step, icon: Icon, title, desc, gradient, glow }) => (
              <div key={step} className={`group relative p-7 rounded-3xl bg-card border border-border space-y-4 hover:border-transparent hover:shadow-2xl ${glow} transition-all duration-300`}>
                <span className="absolute top-5 right-6 text-5xl font-black text-muted-foreground/8 group-hover:text-muted-foreground/12 transition-colors select-none">
                  {step}
                </span>
                <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${gradient} flex items-center justify-center shadow-lg`}>
                  <Icon size={21} className="text-white" />
                </div>
                <h3 className="font-black text-lg leading-snug">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── LATEST NEWS ──────────────────────────────────────────── */}
      {latestNews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-16 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-3xl">📰</span>
              <div>
                <h2 className="text-2xl font-black tracking-tight">Latest News</h2>
                <div className="h-0.5 w-10 rounded-full bg-primary mt-1" />
              </div>
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
      <section className="max-w-7xl mx-auto px-4 py-16 w-full">
        <div className="relative overflow-hidden rounded-3xl p-8 md:p-14 bg-zinc-950 dark:bg-zinc-900 border border-white/5">
          <div className="absolute -top-20 -right-20 w-80 h-80 rounded-full bg-violet-500/20 blur-3xl pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-80 h-80 rounded-full bg-rose-500/15 blur-3xl pointer-events-none" />
          <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent pointer-events-none" />

          <div className="relative max-w-2xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/10 text-white text-sm font-semibold border border-white/10">
              <Star size={13} className="fill-amber-400 text-amber-400" />
              Got a hidden gem?
            </div>

            <h2 className="text-3xl md:text-4xl font-black text-white leading-tight tracking-tight">
              Help others find their<br className="hidden md:block" />
              <span className="bg-gradient-to-r from-violet-400 to-rose-400 bg-clip-text text-transparent"> next favourite read.</span>
            </h2>

            <p className="text-white/60 leading-relaxed text-base max-w-lg">
              Share your favourite manga, manhwa, or webtoon with thousands of readers. Every good rec helps someone fall in love with a new story.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link href={user ? '/dashboard/recommendations/new' : '/signup'}>
                <Button size="lg" className="gap-2 h-12 bg-gradient-to-r from-violet-500 to-rose-500 hover:from-violet-400 hover:to-rose-400 text-white font-bold shadow-xl border-0">
                  <BookOpen size={15} />
                  {user ? 'Submit a Recommendation' : "Join Compicfy — it's free"}
                </Button>
              </Link>
              <Link href="/browse">
                <Button size="lg" className="gap-2 h-12 bg-white/8 text-white hover:bg-white/15 border border-white/15 font-semibold">
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