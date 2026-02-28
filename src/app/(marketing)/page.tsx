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

  const topComics = (trending as Recommendation[]) ?? []
  const latestNews = (recentNews as News[]) ?? []
  const totalMembers = memberCount ?? 0

  return (
    <div className="flex flex-col">

      {/* Hero Section */}
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10 pointer-events-none" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-primary/5 via-transparent to-transparent pointer-events-none" />

        <div className="relative max-w-7xl mx-auto px-4 py-16 md:py-24">
          <div className="max-w-3xl space-y-6">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-sm font-medium">
              <Sparkles size={14} />
              Community-Powered Discovery
            </div>

            <h1 className="text-4xl md:text-6xl font-bold leading-tight tracking-tight">
              Discover Your Next{' '}
              <span className="text-primary">Favorite Comic</span>
            </h1>

            <p className="text-lg text-muted-foreground max-w-xl leading-relaxed">
              Join a community of manga, manhwa, manhua, and webtoon fans. Recommend what you love, discover hidden gems, and vote for the best.
            </p>

            <div className="flex flex-wrap gap-3">
              <Link href="/browse">
                <Button size="lg" className="gap-2 h-12 px-6">
                  <BookOpen size={18} />
                  Browse Comics
                  <ArrowRight size={16} />
                </Button>
              </Link>
              <Link href="/signup">
                <Button size="lg" variant="outline" className="gap-2 h-12 px-6">
                  <Users size={18} />
                  Join Community
                </Button>
              </Link>
            </div>

            <div className="flex flex-wrap gap-6 pt-2">
              {[
                { label: 'Members', value: totalMembers > 0 ? `${totalMembers}+` : 'Growing', icon: Users },
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
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-primary to-primary/80 p-8 md:p-12 text-primary-foreground">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_bottom_right,_var(--tw-gradient-stops))] from-white/10 via-transparent to-transparent pointer-events-none" />
          <div className="relative max-w-2xl space-y-4">
            <h2 className="text-2xl md:text-3xl font-bold">
              Have a comic to recommend?
            </h2>
            <p className="text-primary-foreground/80 leading-relaxed">
              Share your favorite manga, manhwa, or webtoon with thousands of readers. Help others discover their next obsession.
            </p>
            <div className="flex flex-wrap gap-3">
              <Link href="/dashboard/recommendations/new">
                <Button
                  size="lg"
                  variant="secondary"
                  className="gap-2 h-11 bg-white text-primary hover:bg-white/90"
                >
                  <BookOpen size={16} />
                  Submit a Recommendation
                </Button>
              </Link>
              <Link href="/browse">
                <Button
                  size="lg"
                  variant="outline"
                  className="gap-2 h-11 border-white/30 text-white hover:bg-white/10"
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