import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About Compicfy' }

const VALUES = [
  { emoji: '🤝', title: 'Community First',  desc: 'Every feature we build is designed around making the community experience better.' },
  { emoji: '🚫', title: 'Anti-Piracy',      desc: 'We only link to official platforms. Full stop. Creators deserve to be paid for their work.' },
  { emoji: '🌍', title: 'Inclusive',         desc: 'Comics from all cultures and genres deserve recognition. Manga, manhwa, manhua, webtoons — all welcome.' },
  { emoji: '✅', title: 'Moderated',         desc: 'Our team actively moderates content to keep Compicfy safe, accurate, and welcoming for all ages.' },
]

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

      {/* Hero */}
      <div className="text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <span className="text-3xl">📚</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">About Compicfy</h1>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            A community built by readers, for readers. Discover manga, manhwa, manhua, and webtoons recommended by people who actually love them.
          </p>
        </div>
      </div>

      {/* Story */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black">Our Story</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="space-y-3 text-muted-foreground leading-relaxed">
          <p>Compicfy was born from a simple frustration — finding great comics online meant wading through generic algorithm-driven lists that felt disconnected from what real readers actually loved. We wanted a space where genuine fans could surface hidden gems, debate the classics, and help each other find their next obsession.</p>
          <p>What started as a small project grew into a thriving community of manga, manhwa, manhua, and webtoon enthusiasts from around the world. Every recommendation on Compicfy comes from a real reader who loved it enough to share it.</p>
        </div>
      </section>

      {/* Mission */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black">Our Mission</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <p className="text-muted-foreground leading-relaxed">
          To make comic discovery joyful, community-driven, and anti-piracy. We believe the best way to support the creators who make these incredible stories is to direct readers to official platforms where creators get paid.
        </p>
      </section>

      {/* Values grid */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black">What We Stand For</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {VALUES.map(({ emoji, title, desc }) => (
            <div key={title} className="group p-5 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 space-y-2">
              <span className="text-2xl">{emoji}</span>
              <h3 className="font-black text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Built with love */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black">Built With Love</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <p className="text-muted-foreground leading-relaxed">
          Compicfy is built and maintained by a small, passionate team of comic fans. We're constantly improving the platform based on community feedback. Have a suggestion? Drop it in our Discord!
        </p>
      </section>

      {/* CTA */}
      <div className="relative overflow-hidden text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-violet-500/10 border border-primary/20 space-y-4">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <p className="font-black text-lg">Ready to find your next favourite comic?</p>
        <div className="flex justify-center gap-3">
          <Link href="/browse" className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-primary-foreground text-sm font-semibold hover:opacity-90 transition-opacity shadow-lg shadow-primary/20">
            Browse Comics
          </Link>
          <Link href="/signup" className="px-5 py-2.5 rounded-xl border border-border text-sm font-semibold hover:border-primary transition-colors">
            Join the Community
          </Link>
        </div>
      </div>
    </div>
  )
}