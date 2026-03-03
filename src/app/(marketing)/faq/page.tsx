export const metadata = { title: 'FAQ' }

const FAQS = [
  {
    q: 'What is Compicfy?',
    a: 'Compicfy is a community-driven platform for discovering manga, manhwa, manhua, and webtoons. Users submit recommendations, vote on their favourites, and write reviews to help others find great comics.',
  },
  {
    q: 'Is Compicfy free to use?',
    a: 'Yes, Compicfy is completely free. Creating an account, submitting recommendations, voting, and writing reviews costs nothing.',
  },
  {
    q: 'Does Compicfy host any comics?',
    a: 'No. Compicfy is a recommendation and discovery platform only. We do not host, store, or provide access to any comic content. All recommendations link to official, licensed platforms.',
  },
  {
    q: 'How do I submit a recommendation?',
    a: 'Create a free account, then click "Add Comic" in the header or navigation. Fill in the details about the comic you want to recommend. Your submission will be reviewed by our moderation team before going live.',
  },
  {
    q: 'How long does moderation take?',
    a: 'Most submissions are reviewed within 24-48 hours. You\'ll receive a notification when your recommendation is approved or if it needs changes.',
  },
  {
    q: 'What content ratings does Compicfy support?',
    a: 'Compicfy supports All Ages, Teen (13+), Mature (17+), and Adult (18+) content. Mature and Adult content requires age verification. All content ratings must be accurately declared by the submitter.',
  },
  {
    q: 'How does age verification work?',
    a: 'When you visit Compicfy, you\'ll be asked to confirm your age. If you\'re 18 or older, you\'ll enter your date of birth to verify. Your verification is remembered for 30 days, after which you\'ll need to verify again. Under-18 users can still use Compicfy but won\'t see adult-rated content.',
  },
  {
    q: 'Can I edit my recommendation after submitting?',
    a: 'You can edit your recommendation from your dashboard. Edits may require re-approval by our moderation team.',
  },
  {
    q: 'My recommendation was rejected. What do I do?',
    a: 'You\'ll receive a notification with the reason for rejection. Common reasons include inaccurate content rating, missing information, or linking to unofficial platforms. You can submit an appeal from your dashboard if you believe the rejection was a mistake.',
  },
  {
    q: 'How does voting work?',
    a: 'Logged-in users can upvote or downvote any recommendation. Votes affect the recommendation\'s score and influence its ranking in trending and community favourites sections.',
  },
  {
    q: 'What are Reading Lists?',
    a: 'Reading Lists let you organise comics into custom collections like "Currently Reading", "Plan to Read", or any category you want. You can make lists public for others to see, or keep them private.',
  },
  {
    q: 'How do I add a comic to my Reading List?',
    a: 'On any comic\'s detail page, click the "Add to List" button. You\'ll see a dropdown of your lists. Select the list you want to add it to. You can manage your lists from the dashboard.',
  },
  {
    q: 'Can I report inappropriate content?',
    a: 'Yes. On any review, there\'s a "Report" button. Our moderation team reviews all reports and takes appropriate action, usually within 24 hours.',
  },
  {
    q: 'Is there a Compicfy app?',
    a: 'Not yet! Compicfy is fully mobile-optimised as a web app. A native app is on our roadmap.',
  },
  {
    q: 'How do I contact Compicfy?',
    a: 'Join our Discord community for quick answers, or email us at support@compicfy.com for account-related issues.',
  },
]

export default function FAQPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-8">
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-bold">Frequently Asked Questions</h1>
        <p className="text-muted-foreground">Everything you need to know about Compicfy</p>
      </div>

      <div className="space-y-3">
        {FAQS.map(({ q, a }) => (
          <details
            key={q}
            className="group p-4 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/50 transition-colors"
          >
            <summary className="flex items-center justify-between font-semibold text-sm list-none">
              {q}
              <span className="text-muted-foreground group-open:rotate-180 transition-transform text-lg leading-none ml-4 shrink-0">
                ↓
              </span>
            </summary>
            <p className="text-sm text-muted-foreground leading-relaxed mt-3 pt-3 border-t border-border">
              {a}
            </p>
          </details>
        ))}
      </div>

      <div className="text-center p-6 rounded-2xl bg-muted/30 border border-border">
        <p className="text-sm text-muted-foreground mb-3">Still have questions?</p>
        <div className="flex justify-center gap-3">
          <a href="https://discord.gg/7WPGMb696N" target="_blank" rel="noopener noreferrer"
            className="px-4 py-2 rounded-lg bg-[#5865F2] text-white text-sm font-medium hover:opacity-90 transition-opacity">
            Join Discord
          </a>
          <a href="mailto:support@compicfy.com"
            className="px-4 py-2 rounded-lg border border-border text-sm font-medium hover:border-primary transition-colors">
            Email Us
          </a>
        </div>
      </div>
    </div>
  )
}