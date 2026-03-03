export const metadata = { title: 'Community Guidelines' }

export default function GuidelinesPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <div className="text-center space-y-3">
        <h1 className="text-3xl font-bold">Community Guidelines</h1>
        <p className="text-muted-foreground max-w-xl mx-auto">
          Compicfy is built on trust, respect, and a shared love of great comics. These guidelines keep our community safe and enjoyable for everyone.
        </p>
      </div>

      {[
        {
          emoji: '📚',
          title: 'Submitting Recommendations',
          rules: [
            'Only recommend titles available on official, licensed platforms. No piracy links, ever.',
            'Accurately rate content (All Ages / Teen / Mature / Adult). Mislabelling mature content is grounds for removal.',
            'Write an honest, spoiler-free description of why the comic is worth reading.',
            'Do not submit duplicates. Search before submitting to check if a title already exists.',
            'Cover images must be official promotional art, not fan art or screenshots.',
            'Do not submit AI-generated fake titles or descriptions.',
            'One account per person. Coordinated vote manipulation will result in permanent bans.',
          ],
        },
        {
          emoji: '⭐',
          title: 'Writing Reviews',
          rules: [
            'Be honest and constructive. Critical reviews are welcome — cruel or personal attacks are not.',
            'Mark reviews that contain plot spoilers with the spoiler warning toggle.',
            'Reviews must be about the comic itself, not the author\'s personal life or other works.',
            'Minimum review length is 3 characters, but we encourage thoughtful, detailed reviews.',
            'Do not post the same review multiple times or copy others\' reviews.',
            'Reviewing your own recommendation is not permitted.',
            'Do not use reviews to advertise, spam, or share external links.',
          ],
        },
        {
          emoji: '👍',
          title: 'Voting',
          rules: [
            'Vote based on whether a recommendation is well-presented and worth reading, not personal preference for the genre.',
            'Do not create multiple accounts to manipulate vote counts.',
            'Do not coordinate with others to mass-upvote or mass-downvote specific recommendations.',
            'Vote brigading — organising others to vote a specific way — is a bannable offence.',
          ],
        },
        {
          emoji: '💬',
          title: 'General Behaviour',
          rules: [
            'Treat all community members with respect regardless of their taste in comics.',
            'Hate speech, discrimination, or harassment based on race, gender, sexuality, religion, nationality, or disability will result in an immediate ban.',
            'Do not share personal information about other users.',
            'English is the primary language of Compicfy, but we welcome all languages in reviews and comments.',
            'Do not impersonate moderators, admins, or other users.',
            'Keep discussions on-topic. This is a comic discovery platform, not a general chat.',
          ],
        },
        {
          emoji: '🔞',
          title: 'Mature & Adult Content',
          rules: [
            'Adult (18+) content must be accurately labelled. Submitting adult content as all-ages is a serious violation.',
            'All adult content must still be available on a licensed official platform.',
            'Content depicting minors in sexual situations is absolutely prohibited and will be reported to relevant authorities.',
            'Even within adult-rated recommendations, descriptions must not contain explicit sexual language.',
            'Recommendations for content that glorifies or romanticises abuse, assault, or non-consent must be clearly tagged.',
          ],
        },
        {
          emoji: '🚩',
          title: 'Reporting & Moderation',
          rules: [
            'Use the Report button to flag content that violates these guidelines. Do not abuse the report system.',
            'False or malicious reporting is itself a violation of these guidelines.',
            'Moderation decisions can be appealed from your dashboard. Be respectful in appeals.',
            'Repeated violations will result in escalating consequences: warning → content removal → temporary ban → permanent ban.',
            'Permanent bans are reserved for severe violations such as piracy linking, hate speech, or harassment campaigns.',
          ],
        },
        {
          emoji: '📋',
          title: 'Reading Lists',
          rules: [
            'Public reading lists must not contain titles with misleading descriptions.',
            'Do not create lists designed to mock or demean authors, creators, or other users.',
            'List names and descriptions must follow the same content standards as reviews.',
          ],
        },
      ].map(({ emoji, title, rules }) => (
        <section key={title} className="space-y-4">
          <h2 className="text-xl font-bold flex items-center gap-2">
            <span>{emoji}</span>
            {title}
          </h2>
          <ul className="space-y-2">
            {rules.map((rule, i) => (
              <li key={i} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                <span className="text-primary mt-0.5 shrink-0">→</span>
                {rule}
              </li>
            ))}
          </ul>
        </section>
      ))}

      <div className="p-6 rounded-2xl bg-destructive/5 border border-destructive/20 space-y-2">
        <p className="font-semibold text-sm">Zero Tolerance</p>
        <p className="text-sm text-muted-foreground">The following will result in an immediate permanent ban with no appeal: linking to pirated content, CSAM (child sexual abuse material), coordinated harassment campaigns, and doxxing (sharing private information about other users).</p>
      </div>

      <div className="text-center p-6 rounded-2xl bg-muted/30 border border-border space-y-3">
        <p className="text-sm font-semibold">Have questions about these guidelines?</p>
        <a href="https://discord.gg/7WPGMb696N" target="_blank" rel="noopener noreferrer"
          className="inline-block px-4 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-medium hover:opacity-90 transition-opacity">
          Ask on Discord
        </a>
      </div>
    </div>
  )
}