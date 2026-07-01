import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = { title: 'About ComPicfy' }

const VALUES = [
  { emoji: '🎯', title: 'Taste Over Algorithms', desc: 'Every recommendation comes from a real reader who loved it enough to share it, not a feed engineered to keep you scrolling.' },
  { emoji: '🚫', title: 'Anti-Piracy',            desc: 'We only link to official platforms. Full stop. Creators deserve to be paid for their work.' },
  { emoji: '🌍', title: 'Inclusive',               desc: 'Manga, manhwa, manhua, and webtoons, every style and culture of storytelling gets equal space here.' },
  { emoji: '✅', title: 'Moderated',               desc: 'Every submission is reviewed before it goes live, keeping the platform accurate, safe, and worth trusting.' },
  { emoji: '🔒', title: 'You Own Your Recs',       desc: "When you submit a recommendation, it's yours. Only you can edit it. No wiki-style overwrites, no losing credit for your work." },
  { emoji: '🎨', title: 'Built for Creators Too',  desc: "ComPicfy isn't just for readers. Creators get a home to share their work and connect directly with the people who read it." },
]

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-14">

      {/* Hero */}
      <div className="text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center mx-auto shadow-lg shadow-primary/20">
          <span className="text-3xl">📚</span>
        </div>
        <div className="space-y-3">
          <h1 className="text-4xl font-black tracking-tight">About ComPicfy</h1>
          <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
            The community where manga, manhwa, manhua, and webtoon readers discover, recommend, and vote for the best reads — together.
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
          <p>
            ComPicfy started with a simple frustration: finding a great comic online usually meant scrolling through generic, algorithm-driven lists that had nothing to do with what real readers actually loved. Asking for a recommendation online got you fifty replies, half of which you'd already read, with no way to tell if the person recommending shared your taste at all.
          </p>
          <p>
            ComPicfy exists to fix that. It's a place where readers submit what they genuinely love, the community votes and reviews honestly, and discovery happens through real people instead of a black-box feed. Every recommendation on the platform is owned by the person who shared it, your taste, credited to you.
          </p>
          <p>
            We're manhwa-first by design, but every format is welcome: manga, manhwa, manhua, and webtoons all share the same space, the same voting system, and the same respect.
          </p>
        </div>
      </section>

      {/* Mission */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black">Our Mission</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <p className="text-muted-foreground leading-relaxed">
          To make comic discovery feel human again, community-driven, ownership-respecting, and entirely anti-piracy. We believe the best way to support the people who make these stories is to point readers toward official platforms where creators actually get paid, and to give creators themselves a direct line to the readers who care.
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

      {/* How it's built */}
      <section className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-black">How ComPicfy Is Built</h2>
          <div className="h-0.5 flex-1 bg-gradient-to-r from-primary/40 to-transparent" />
        </div>
        <p className="text-muted-foreground leading-relaxed">
          ComPicfy is built independently, shaped almost entirely by what the community asks for. There's no investor roadmap and no growth-at-all-costs agenda just a platform that improves because the people using it tell us what's missing. Every feature on here exists because someone in the community needed it.
        </p>
        <p className="text-muted-foreground leading-relaxed">
          Have a suggestion or found something broken? Drop it in our Discord. We read everything, and a meaningful share of what's live today started as a community suggestion.
        </p>
      </section>

      {/* CTA */}
      <div className="relative overflow-hidden text-center p-8 rounded-2xl bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20 space-y-4">
        <div className="absolute -top-8 -right-8 w-32 h-32 rounded-full bg-primary/10 blur-2xl pointer-events-none" />
        <p className="font-black text-lg">Ready to find your next Obsession?</p>
        <div className="flex justify-center gap-3">
          <Link href="/browse" className="px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-semibold hover:bg-primary/90 transition-colors shadow-lg shadow-primary/20">
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