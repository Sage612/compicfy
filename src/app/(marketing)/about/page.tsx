export const metadata = { title: 'About Compicfy' }

export default function AboutPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">
      {/* Hero */}
      <div className="text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
          <span className="text-3xl">📚</span>
        </div>
        <h1 className="text-3xl font-bold">About Compicfy</h1>
        <p className="text-muted-foreground leading-relaxed max-w-xl mx-auto">
          A community built by readers, for readers. Discover manga, manhwa, manhua, and webtoons recommended by people who actually love them.
        </p>
      </div>

      {/* Story */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Our Story</h2>
        <p className="text-muted-foreground leading-relaxed">Compicfy was born from a simple frustration — finding great comics online meant wading through generic algorithm-driven lists that felt disconnected from what real readers actually loved. We wanted a space where genuine fans could surface hidden gems, debate the classics, and help each other find their next obsession.</p>
        <p className="text-muted-foreground leading-relaxed">What started as a small project grew into a thriving community of manga, manhwa, manhua, and webtoon enthusiasts from around the world. Every recommendation on Compicfy comes from a real reader who loved it enough to share it.</p>
      </section>

      {/* Mission */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Our Mission</h2>
        <p className="text-muted-foreground leading-relaxed">To make comic discovery joyful, community-driven, and anti-piracy. We believe the best way to support the creators who make these incredible stories is to direct readers to official platforms where creators get paid.</p>
      </section>

      {/* Values */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">What We Stand For</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {[
            { emoji: '🤝', title: 'Community First', desc: 'Every feature we build is designed around making the community experience better.' },
            { emoji: '🚫', title: 'Anti-Piracy', desc: 'We only link to official platforms. Full stop. Creators deserve to be paid for their work.' },
            { emoji: '🌍', title: 'Inclusive', desc: 'Comics from all cultures and genres deserve recognition. Manga, manhwa, manhua, webtoons — all welcome.' },
            { emoji: '✅', title: 'Moderated', desc: 'Our team actively moderates content to keep Compicfy safe, accurate, and welcoming for all ages.' },
          ].map(({ emoji, title, desc }) => (
            <div key={title} className="p-4 rounded-xl border border-border bg-card space-y-2">
              <span className="text-2xl">{emoji}</span>
              <h3 className="font-semibold text-sm">{title}</h3>
              <p className="text-xs text-muted-foreground leading-relaxed">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Team */}
      <section className="space-y-4">
        <h2 className="text-xl font-bold">Built With Love</h2>
        <p className="text-muted-foreground leading-relaxed">Compicfy is built and maintained by a small, passionate team of comic fans. We're constantly improving the platform based on community feedback. Have a suggestion? Drop it in our Discord!</p>
      </section>

      {/* CTA */}
      <div className="text-center p-8 rounded-2xl bg-primary/5 border border-primary/20 space-y-4">
        <p className="font-semibold">Ready to find your next favorite comic?</p>
        <div className="flex justify-center gap-3">
          <a href="/browse" className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity">
            Browse Comics
          </a>
          <a href="/signup" className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:border-primary transition-colors">
            Join the Community
          </a>
        </div>
      </div>
    </div>
  )
}