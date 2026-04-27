// Shared pattern used in all legal pages:
// - Gradient icon header
// - Section divider with h2 font-black
// - Prose text as text-muted-foreground leading-relaxed

// ── src/app/(marketing)/guidelines/page.tsx ──────────────────────────────────
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Community Guidelines' }

const SECTIONS = [
  {
    emoji: '📚', title: 'Submitting Recommendations', rules: [
      'Only recommend titles available on official, licensed platforms. No piracy links, ever.',
      'Accurately rate content (All Ages / Teen / Mature / Adult). Mislabelling mature content is grounds for removal.',
      'Write an honest, spoiler-free description of why the comic is worth reading.',
      'Do not submit duplicates. Search before submitting to check if a title already exists.',
      'Cover images must be official promotional art or images sourced from recognised community databases (e.g. MyAnimeList, AniList), not fan art, screenshots, or AI-generated images.',
      'Do not submit AI-generated fake titles or descriptions.',
      'One account per person. Coordinated vote manipulation will result in permanent bans.',
    ],
  },
  {
    emoji: '⭐', title: 'Writing Reviews', rules: [
      'Be honest and constructive. Critical reviews are welcome, cruel or personal attacks are not.',
      "Mark reviews that contain plot spoilers with the spoiler warning toggle.",
      "Reviews must be about the comic itself, not the author's personal life or other works.",
      'Do not post the same review multiple times or copy others\' reviews.',
      'Reviewing your own recommendation is not permitted.',
      'Do not use reviews to advertise, spam, or share external links.',
    ],
  },
  {
    emoji: '👍', title: 'Voting', rules: [
      'Vote based on whether a recommendation is well-presented and worth reading, not personal preference for the genre.',
      'Do not create multiple accounts to manipulate vote counts.',
      'Vote brigading, organising others to vote a specific way, is a bannable offence.',
    ],
  },
  {
    emoji: '💬', title: 'General Behaviour', rules: [
      'Treat all community members with respect regardless of their taste in comics.',
      'Hate speech, discrimination, or harassment based on race, gender, sexuality, religion, nationality, or disability will result in an immediate ban.',
      'Do not share personal information about other users.',
      'Do not impersonate moderators, admins, or other users.',
      'Keep discussions on-topic. This is a comic discovery platform, not a general chat.',
    ],
  },
  {
    emoji: '🔞', title: 'Mature & Adult Content', rules: [
      'Adult (18+) content must be accurately labelled. Submitting adult content as all-ages is a serious violation.',
      'All adult content must still be available on a licensed official platform.',
      'Content depicting minors in sexual situations is absolutely prohibited and will be reported to relevant authorities.',
      'Even within adult-rated recommendations, descriptions must not contain explicit sexual language.',
    ],
  },
  {
    emoji: '🚩', title: 'Reporting & Moderation', rules: [
      'Use the Report button to flag content that violates these guidelines. Do not abuse the report system.',
      'False or malicious reporting is itself a violation of these guidelines.',
      'Moderation decisions can be appealed from your dashboard. Be respectful in appeals.',
      'Repeated violations will result in escalating consequences: warning → content removal → temporary ban → permanent ban.',
    ],
  },
  {
    emoji: '📋', title: 'Reading Lists', rules: [
      'Public reading lists must not contain titles with misleading descriptions.',
      'Do not create lists designed to mock or demean authors, creators, or other users.',
      'List names and descriptions must follow the same content standards as reviews.',
    ],
  },
]

export default function GuidelinesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-12">

      <div className="text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <span className="text-2xl">📋</span>
        </div>
        <h1 className="text-4xl font-black tracking-tight">Community Guidelines</h1>
        <p className="text-muted-foreground max-w-xl mx-auto leading-relaxed">
          Compicfy is built on trust, respect, and a shared love of great comics. These guidelines keep our community safe and enjoyable for everyone.
        </p>
      </div>

      {SECTIONS.map(({ emoji, title, rules }) => (
        <section key={title} className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
              <span className="text-lg">{emoji}</span>
            </div>
            <h2 className="text-lg font-black">{title}</h2>
          </div>
          <ul className="space-y-2">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0 font-bold">→</span>
                {rule}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="p-5 rounded-2xl bg-red-500/5 border border-red-500/20 space-y-2">
        <p className="font-black text-sm text-red-600">Zero Tolerance</p>
        <p className="text-sm text-muted-foreground leading-relaxed">The following will result in an immediate permanent ban with no appeal: linking to pirated content, CSAM, coordinated harassment campaigns, and doxxing (sharing private information about other users).</p>
      </div>

      <div className="text-center p-6 rounded-2xl bg-muted/30 border border-border space-y-3">
        <p className="text-sm font-semibold">Have questions about these guidelines?</p>
        <a href="https://discord.gg/7WPGMb696N" target="_blank" rel="noopener noreferrer"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[#5865F2] text-white text-sm font-semibold hover:opacity-90 transition-opacity">
          Ask on Discord
        </a>
      </div>
    </div>
  )
}