import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Disclaimer' }

// ── Update this date whenever you make material changes ──────────
const LAST_UPDATED = 'June 26, 2026'

const SECTIONS = [
  {
    n: '1', title: 'Content Ownership',
    body: 'Compicfy is a community-driven recommendation and discovery platform. We do not host, store, distribute, or provide access to any manga, manhwa, manhua, webtoon, or comic content. All titles, artwork, characters, and intellectual property referenced on this platform remain the exclusive property of their respective authors, publishers, and rights holders.',
  },
  {
    n: '2', title: 'No Piracy Policy',
    body: 'Compicfy is strictly opposed to piracy. We do not link to, promote, or facilitate access to unauthorised copies of any content. All recommendations on this platform direct users exclusively to official, licensed platforms such as Webtoon, Tapas, Lezhin Comics, MangaPlus, Crunchyroll, VIZ Media, and other legitimate services. Any user found submitting links to pirated content will have their account permanently suspended.',
  },
  {
    n: '3', title: 'User-Generated Content',
    body: 'The recommendations, reviews, ratings, and opinions expressed on Compicfy are submitted by community members and do not represent the views of Compicfy or its operators. We are not responsible for the accuracy, completeness, or appropriateness of user-submitted content, though we actively moderate to maintain community standards.',
  },
  {
    n: '4', title: 'Recommendation Ownership',
    body: 'Each recommendation submitted to Compicfy belongs to the user who created it. Only that user may edit or remove the recommendation. Compicfy does not permit other users to take over, overwrite, or claim authorship of a recommendation submitted by someone else.',
  },
  {
    n: '5', title: 'Third-Party Cover Images',
    body: 'Where an official publisher or platform cover image is unavailable, Compicfy may display cover artwork sourced from community-maintained databases such as MyAnimeList (MAL), AniList, MangaUpdates, or similar services. These images are linked directly from their source and are not stored or served by Compicfy. They are used solely for identification and recommendation purposes. If you are a rights holder and believe an image has been used without permission, please contact us at support@compicfy.com and we will remove it promptly.',
  },
  {
    n: '6', title: 'Mature Content',
    body: 'Compicfy hosts recommendations across multiple content ratings including All Ages, Teen (13+), Mature (17+), and Adult (18+). Age verification is required to access mature and adult-rated content. By confirming your age, you take responsibility for ensuring you meet the minimum age requirements in your jurisdiction.',
  },
  {
    n: '7', title: 'Creator Links & External Monetization',
    body: 'Creator profiles on Compicfy may include external links such as Patreon, Kickstarter, or personal comic platforms, provided by the creator themselves. Compicfy does not verify, endorse, process, or take responsibility for any financial transaction, subscription, or pledge made through these external links. Any support, purchase, or contribution made via a creator\'s external link is a transaction solely between you and that external platform or creator, entirely outside of Compicfy\'s involvement.',
  },
  {
    n: '8', title: 'Affiliate Links',
    body: 'Some news articles and recommendations on Compicfy may contain affiliate links. When you click these links and make a purchase, Compicfy may earn a small commission at no additional cost to you. All affiliate content is clearly labelled with an "Affiliate" badge. We only include affiliate links for legitimate, licensed content platforms.',
  },
  {
    n: '9', title: 'Accuracy of Information',
    body: 'While we strive to ensure all information on Compicfy is accurate and up to date, we cannot guarantee the accuracy of community-submitted details such as chapter counts, release dates, or platform availability. Always verify information on official publisher or platform websites.',
  },
  {
    n: '10', title: 'External Links',
    body: 'Compicfy may contain links to third-party websites and services. We are not responsible for the content, privacy practices, or terms of service of any external sites. Accessing external links is at your own discretion and risk.',
  },
  {
    n: '11', title: 'AI-Generated & System-Submitted Content',
    body: 'Some news summaries and comic recommendations on Compicfy are generated or submitted automatically by our system (labelled "auto-submitter"). All system-submitted recommendations are clearly marked and require manual review and approval by our moderation team before appearing publicly. AI-generated news summaries are based on publicly available source material and are not a substitute for the original reporting.',
  },
  {
    n: '12', title: 'Changes to This Disclaimer',
    body: 'We reserve the right to update this disclaimer at any time. Continued use of Compicfy following any changes constitutes your acceptance of the updated disclaimer.',
  },
  {
    n: '13', title: 'Contact',
    body: null,
    contact: 'support@compicfy.com',
  },
]

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-zinc-600 to-zinc-800 dark:from-zinc-500 dark:to-zinc-700 flex items-center justify-center shadow-lg">
            <span className="text-lg">⚖️</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Disclaimer</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map(({ n, title, body, contact }) => (
          <section key={n} className="space-y-2">
            <h2 className="text-base font-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                {n}
              </span>
              {title}
            </h2>
            {body && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">{body}</p>
            )}
            {contact && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                If you have questions about this disclaimer or wish to report a DMCA concern, please contact us at{' '}
                <a href={`mailto:${contact}`} className="text-primary hover:underline font-medium">
                  {contact}
                </a>.
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}