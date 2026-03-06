import Link from 'next/link'
import { createClient } from '@/lib/supabase/server'
import { Button } from '@/components/ui/button'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { NewsCard } from '@/components/news/NewsCard'
import { ArrowRight, BookOpen, Users, TrendingUp, Star, Sparkles, ChevronRight } from 'lucide-react'
import type { Recommendation } from '@/types/database.types'
import type { News } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Compicfy — Discover Your Next Favorite Comic',
}

export default async function HomePage() {
  const supabase = await createClient()

  const [
    { data: trending },
    { data: recentNews },
    { count: memberCount },
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
  ])

  const { data: { user } } = await supabase.auth.getUser()

  const topComics = (trending as Recommendation[]) ?? []
  const latestNews = (recentNews as News[]) ?? []

  return (
    <div className="flex flex-col">

      {/* Hero Section */}
      <section className="relative overflow-hidden flex flex-col">
        <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-background" />

        {/* Desktop decorative background */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <svg className="absolute inset-0 w-full h-full opacity-[0.04] dark:opacity-[0.06] hidden md:block" viewBox="0 0 800 600" preserveAspectRatio="xMidYMid slice">
            {Array.from({ length: 40 }).map((_, i) => {
              const angle = (i / 40) * 360
              const rad = (angle * Math.PI) / 180
              const x2 = 700 + Math.cos(rad) * 1200
              const y2 = 80 + Math.sin(rad) * 1200
              return (
                <line key={i} x1="700" y1="80" x2={x2} y2={y2}
                  stroke="currentColor" strokeWidth={i % 4 === 0 ? '3' : '1'} />
              )
            })}
          </svg>

          <svg className="absolute bottom-0 right-0 w-96 h-96 opacity-[0.05] dark:opacity-[0.08] hidden md:block" viewBox="0 0 200 200">
            {Array.from({ length: 10 }).map((_, row) =>
              Array.from({ length: 10 }).map((_, col) => (
                <circle key={`${row}-${col}`}
                  cx={col * 20 + 10} cy={row * 20 + 10}
                  r={3 + (row + col) * 0.3} fill="currentColor" />
              ))
            )}
          </svg>

          <div className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full border-[40px] border-primary/5 dark:border-primary/10 hidden md:block" />
          <div className="absolute -top-16 -right-16 w-[400px] h-[400px] rounded-full border-[20px] border-primary/5 dark:border-primary/10 hidden md:block" />
          <div className="absolute top-12 right-24 w-28 h-36 rounded-lg border-2 border-primary/10 dark:border-primary/20 rotate-6 hidden md:block" />
          <div className="absolute top-6 right-40 w-20 h-28 rounded-lg border-2 border-primary/10 dark:border-primary/15 -rotate-3 hidden md:block" />
          <div className="absolute top-24 right-16 w-16 h-20 rounded-lg border border-primary/10 dark:border-primary/15 rotate-12 hidden md:block" />
          <div className="absolute bottom-8 right-56 w-24 h-32 rounded-lg border-2 border-primary/8 dark:border-primary/12 -rotate-6 hidden md:block" />
          <div className="absolute top-16 left-[60%] text-primary/10 dark:text-primary/15 text-6xl font-black select-none rotate-12 hidden md:block">!!</div>
          <div className="absolute bottom-20 left-[50%] text-primary/8 dark:text-primary/12 text-4xl font-black select-none -rotate-6 hidden md:block">★</div>
          <div className="absolute top-1/2 right-12 text-primary/8 dark:text-primary/12 text-3xl font-black select-none rotate-45 hidden md:block">◆</div>
          <div className="absolute -top-10 right-64 w-2 h-[120%] bg-primary/5 dark:bg-primary/8 rotate-12 rounded-full hidden md:block" />
          <div className="absolute -top-10 right-72 w-1 h-[120%] bg-primary/4 dark:bg-primary/6 rotate-12 rounded-full hidden md:block" />
          <div className="absolute -top-10 right-56 w-1 h-[120%] bg-primary/3 dark:bg-primary/5 rotate-12 rounded-full hidden md:block" />
          <div className="absolute bottom-12 left-12 opacity-[0.04] dark:opacity-[0.06] text-[80px] font-black text-foreground leading-none select-none tracking-tighter hidden md:block">
            読む
          </div>
        </div>

        {/* Glows */}
        <div className="absolute top-0 right-0 w-48 h-48 md:w-96 md:h-96 bg-primary/8 dark:bg-primary/12 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 md:w-64 md:h-64 bg-primary/5 dark:bg-primary/8 rounded-full blur-3xl pointer-events-none" />

        {/* Text Content */}
        <div className="relative max-w-7xl mx-auto px-4 pt-16 pb-8 md:py-24 w-full">
          <div className="max-w-3xl space-y-6 text-center md:text-left mx-auto md:mx-0">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles size={14} />
              Community-Powered Discovery
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              Discover Your Next{' '}
              <span className="text-primary relative">
                Favorite Comic
                <svg className="absolute -bottom-2 left-0 w-full" viewBox="0 0 300 8" preserveAspectRatio="none">
                  <path d="M0,6 Q75,0 150,4 Q225,8 300,2" stroke="currentColor" strokeWidth="3" fill="none" strokeLinecap="round" className="text-primary opacity-60" />
                </svg>
              </span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed mx-auto md:mx-0">
              Join a community of manga, manhwa, manhua, and webtoon fans. Recommend what you love, discover hidden gems, and vote for the best.
            </p>

            <div className="flex flex-wrap gap-3 justify-center md:justify-start">
              <Link href="/browse">
                <Button size="lg" className="gap-2 h-12 px-6">
                  <BookOpen size={18} />
                  Browse Comics
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="gap-2 h-12 px-6 bg-background">
                  <Users size={18} />
                  Join Community
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-2 justify-center md:justify-start">
              {[
                { label: 'Members', value: (memberCount ?? 0) > 0 ? `${memberCount}+` : 'Growing', icon: Users },
                { label: 'Comics', value: `${topComics.length}+`, icon: BookOpen },
                { label: 'Community Picks', value: 'Daily', icon: TrendingUp },
              ].map(({ label, value, icon: Icon }) => (
                <div key={label} className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Icon size={15} className="text-primary" />
                  <span className="font-semibold text-foreground">{value}</span>
                  <span>{label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile illustration — behind content, centered */}
        <div className="relative md:hidden w-full px-4 pb-10 overflow-hidden">
          <div className="relative flex justify-center">
            <svg
              viewBox="0 0 360 120"
              className="w-full max-w-sm opacity-[0.07] dark:opacity-[0.09] pointer-events-none"
              preserveAspectRatio="xMidYMid meet"
            >
              {Array.from({ length: 18 }).map((_, i) => {
                const angle = 160 + (i / 18) * 100
                const rad = (angle * Math.PI) / 180
                const x2 = 340 + Math.cos(rad) * 400
                const y2 = 10 + Math.sin(rad) * 400
                return (
                  <line key={i} x1="340" y1="10" x2={x2} y2={y2}
                    stroke="currentColor" strokeWidth={i % 3 === 0 ? '1.5' : '0.5'} />
                )
              })}
              {Array.from({ length: 5 }).map((_, row) =>
                Array.from({ length: 6 }).map((_, col) => (
                  <circle key={`${row}-${col}`}
                    cx={col * 14 + 8} cy={row * 14 + 60}
                    r={1.5 + (row + col) * 0.2} fill="currentColor" />
                ))
              )}
              <rect x="248" y="8" width="36" height="48" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(5 266 32)" />
              <rect x="292" y="4" width="28" height="38" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-3 306 23)" />
              <rect x="260" y="62" width="32" height="44" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(8 276 84)" />
              <rect x="300" y="55" width="24" height="34" rx="4" fill="none" stroke="currentColor" strokeWidth="1.5" transform="rotate(-5 312 72)" />
              <text x="200" y="45" fontSize="22" fontWeight="900" fill="currentColor" transform="rotate(10 200 45)">!!</text>
              <text x="170" y="90" fontSize="16" fontWeight="900" fill="currentColor" transform="rotate(-5 170 90)">★</text>
              <text x="225" y="95" fontSize="12" fontWeight="900" fill="currentColor" transform="rotate(20 225 95)">◆</text>
              <line x1="130" y1="0" x2="160" y2="120" stroke="currentColor" strokeWidth="1.5" />
              <line x1="145" y1="0" x2="175" y2="120" stroke="currentColor" strokeWidth="1" />
              <text x="18" y="108" fontSize="28" fontWeight="900" fill="currentColor" fontFamily="serif">読</text>
            </svg>
          </div>
        </div>
      </section>

      {/* Trending Comics Section */}
      {topComics.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold flex items-center gap-2">
                🔥 Trending Now
              </h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Top community recommendations right now
              </p>
            </div>
            <Link href="/browse?sort=score">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                View all
                <ChevronRight size={14} />
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

      {/* How it works */}
      <section className="bg-muted/30 border-y border-border">
        <div className="max-w-7xl mx-auto px-4 py-12 space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl font-bold">How Compicfy Works</h2>
            <p className="text-muted-foreground">Simple, community-driven comic discovery</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                icon: BookOpen,
                title: 'Submit a Recommendation',
                desc: 'Share a manga, manhwa, or webtoon you love with the community. Add details, genres, and why others should read it.',
                color: 'bg-primary/10 text-primary',
              },
              {
                step: '02',
                icon: TrendingUp,
                title: 'Community Votes',
                desc: 'The community upvotes great recommendations. The best ones rise to the top and get featured on the browse page.',
                color: 'bg-secondary/10 text-secondary',
              },
              {
                step: '03',
                icon: Star,
                title: 'Discover & Review',
                desc: 'Find your next obsession through community picks. Leave reviews, save favorites, and build your reading list.',
                color: 'bg-yellow-500/10 text-yellow-500',
              },
            ].map(({ step, icon: Icon, title, desc, color }) => (
              <div key={step} className="relative p-6 rounded-2xl bg-card border border-border space-y-4">
                <div className="flex items-center justify-between">
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                    <Icon size={20} />
                  </div>
                  <span className="text-4xl font-bold text-muted-foreground/20">{step}</span>
                </div>
                <h3 className="font-semibold text-lg">{title}</h3>
                <p className="text-sm text-muted-foreground leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Latest News */}
      {latestNews.length > 0 && (
        <section className="max-w-7xl mx-auto px-4 py-12 space-y-6 w-full">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">📰 Latest News</h2>
              <p className="text-muted-foreground text-sm mt-0.5">
                Updates from the manga & comics world
              </p>
            </div>
            <Link href="/news">
              <Button variant="ghost" size="sm" className="gap-1.5 text-muted-foreground hover:text-foreground">
                All news
                <ChevronRight size={14} />
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

      {/* CTA Banner */}
      <section className="max-w-7xl mx-auto px-4 py-12 w-full">
        <div className="relative overflow-hidden rounded-2xl p-8 md:p-12 bg-gradient-to-br from-primary to-primary/85">
          <div className="absolute -top-16 -right-16 w-64 h-64 rounded-full bg-white/10 pointer-events-none" />
          <div className="absolute -bottom-20 -left-10 w-72 h-72 rounded-full bg-white/5 pointer-events-none" />
          <div className="absolute top-4 right-32 w-20 h-20 rounded-full bg-white/10 pointer-events-none" />

          <div className="relative max-w-2xl space-y-5">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/20 dark:bg-black/20 text-white dark:text-primary-foreground text-sm font-medium">
              <BookOpen size={14} />
              Share Your Favorites
            </div>

            <h2 className="text-2xl md:text-3xl font-bold text-white dark:text-primary-foreground drop-shadow-sm">
              Have a comic to recommend?
            </h2>

            <p className="text-white/90 dark:text-primary-foreground/90 leading-relaxed text-base font-medium drop-shadow-sm">
              Share your favorite manga, manhwa, or webtoon with thousands of readers. Help others discover their next obsession.
            </p>

            <div className="flex flex-wrap gap-3 pt-1">
              <Link href="/dashboard/recommendations/new">
                <Button
                  size="lg"
                  className="gap-2 h-11 bg-white dark:bg-primary-foreground text-primary hover:bg-white/95 dark:hover:bg-primary-foreground/90 font-semibold shadow-lg"
                >
                  <BookOpen size={16} />
                  Submit a Recommendation
                </Button>
              </Link>
              <Link href="/browse">
                <Button
                  size="lg"
                  className="gap-2 h-11 bg-white/20 dark:bg-black/20 text-white dark:text-primary-foreground hover:bg-white/30 dark:hover:bg-black/30 border border-white/40 dark:border-primary-foreground/40 font-semibold backdrop-blur-sm"
                >
                  Browse First
                  <ArrowRight size={16} />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

    </div>
  )
}