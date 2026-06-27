import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Terms of Service' }

// ── Update this date whenever you make material changes ──────────
const LAST_UPDATED = 'June 26, 2026'

const SECTIONS = [
  {
    n: '1', title: 'Acceptance of Terms',
    body: 'By accessing or using Compicfy, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the platform. We reserve the right to update these terms at any time with notice provided via the platform.',
  },
  {
    n: '2', title: 'Eligibility',
    body: 'You must be at least 13 years of age to create an account on Compicfy. Access to mature (17+) and adult (18+) content requires age verification. By using Compicfy, you represent that you meet the minimum age requirements applicable to your use of the platform.',
  },
  {
    n: '3', title: 'User Accounts',
    body: 'You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must not share your account with others or create accounts for deceptive purposes. Notify us immediately of any unauthorised use of your account.',
  },
  {
    n: '4', title: 'User-Generated Content & Recommendation Ownership',
    body: 'By submitting recommendations, reviews, or other content to Compicfy, you grant us a non-exclusive, royalty-free, worldwide licence to display, distribute, and promote that content on the platform and in our marketing materials. You retain ownership of your content. Recommendations you submit are uniquely yours: only you may edit a recommendation you submitted, and Compicfy does not allow other users to overwrite or take ownership of your submission. You represent that any content you submit does not infringe any third-party rights, and you are solely responsible for content you submit.',
  },
  {
    n: '5', title: 'Submission Limits',
    body: 'To maintain content quality and protect platform performance, Compicfy applies submission limits to recommendations. Free accounts are limited to a set number of recommendations per month, with additional daily limits that may apply during periods of high platform activity. Pro accounts receive higher or unlimited monthly limits, subject to fair-use daily caps designed to prevent automated or bulk submission. We may, at our discretion, temporarily hold submissions for manual review during high-traffic periods rather than rejecting them outright. Current limits are displayed in your dashboard and may be adjusted as the platform grows.',
  },
  {
    n: '6', title: 'Prohibited Conduct',
    body: 'You agree not to: submit or link to pirated content; harass, abuse, or threaten other users; submit false or misleading information; create fake accounts or manipulate votes; attempt to hack or disrupt the platform; submit spam or unsolicited commercial messages; impersonate any person or entity; or violate any applicable laws or regulations.',
  },
  {
    n: '7', title: 'Content Standards',
    body: 'All content submitted to Compicfy must comply with our Community Guidelines. Content that promotes hate speech, discrimination, violence, or illegal activity is strictly prohibited. Adult content submissions must be accurately rated and will only be shown to verified adult users.',
  },
  {
    n: '8', title: 'Intellectual Property',
    body: 'Compicfy and its original content, features, and functionality are the property of Compicfy and its operators. All manga, manhwa, and comic titles referenced on the platform are the property of their respective rights holders. We operate under internationally recognised principles of commentary, criticism, and recommendation, directing users exclusively to official licensed platforms.',
  },
  {
    n: '9', title: 'Third-Party Cover Images',
    body: 'Where official publisher cover images are unavailable, Compicfy may display promotional artwork sourced from community databases such as MyAnimeList or AniList. These images are used solely for identification and recommendation purposes, and we link directly to their source without re-hosting. Rights holders who wish to have specific images removed should contact support@compicfy.com.',
  },
  {
    n: '10', title: 'DMCA Policy',
    body: null,
    email: 'support@compicfy.com',
    emailText: 'We respect intellectual property rights. If you believe content on Compicfy infringes your copyright, please send a DMCA notice to {email} or use our DMCA form at compicfy.com/dmca with details of the allegedly infringing content. We will respond within 72 hours to valid requests.',
  },
  {
    n: '11', title: 'Pro Subscription & Payment',
    body: 'Compicfy Pro is a paid subscription available on monthly or yearly billing cycles. Payments are processed exclusively through Flutterwave. We do not store your card details on our servers; all payment data is handled directly by Flutterwave under their own security and compliance standards. Yearly plans renew annually and monthly plans renew each billing cycle until cancelled. You may cancel your subscription at any time before the next billing date from your dashboard. We do not offer refunds on completed payments unless required by applicable law. Contact support@compicfy.com for billing enquiries.',
  },
  {
    n: '12', title: 'Pro Waitlist',
    body: 'If you join the Compicfy Pro waitlist by submitting your email address, you consent to receive a one-time notification email when Pro becomes available for purchase. We do not use waitlist emails for any other marketing purpose. You may request removal from the waitlist at any time by contacting support@compicfy.com.',
  },
  {
    n: '13', title: 'Creator Links & External Platforms',
    body: 'Creators may add external links to their profile, including but not limited to Patreon, Kickstarter, and personal comic platforms. These links are provided by the creator and are not verified, monitored, or endorsed by Compicfy beyond basic moderation review. Compicfy is not a party to any transaction, subscription, or pledge made through a creator\'s external links, and is not responsible for the content, delivery, or fulfilment of any product or service offered on those external platforms. Use of creator links is entirely at your own discretion.',
  },
  {
    n: '14', title: 'Termination',
    body: 'We reserve the right to suspend or terminate your account at our discretion if you violate these terms or our Community Guidelines. You may also delete your account at any time from your dashboard settings. Termination does not affect any rights or obligations that arose prior to termination.',
  },
  {
    n: '15', title: 'Disclaimers',
    body: 'Compicfy is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service availability. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.',
  },
  {
    n: '16', title: 'Governing Law',
    body: 'These terms are governed by applicable international laws. Any disputes arising from these terms will be resolved through good-faith negotiation, and if necessary, binding arbitration in a mutually agreed jurisdiction.',
  },
  {
    n: '17', title: 'Affiliate & External Links',
    body: 'Compicfy contains links to third-party websites (e.g., Amazon). We are not responsible for the content, privacy policies, or practices of any third-party sites. Any purchases made on these sites are between you and the retailer; we do not handle payments, shipping, or returns.',
  },
  {
    n: '18', title: 'Contact',
    body: null,
    email: 'support@compicfy.com',
    emailText: 'For questions about these Terms, contact {email}.',
  },
]

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-lg">📜</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Terms of Service</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">
        {SECTIONS.map(({ n, title, body, email, emailText }) => (
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
            {emailText && email && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {emailText.split('{email}').map((part, i, arr) =>
                  i < arr.length - 1
                    ? <span key={i}>{part}<a href={`mailto:${email}`} className="text-primary hover:underline font-medium">{email}</a></span>
                    : <span key={i}>{part}</span>
                )}
              </p>
            )}
          </section>
        ))}
      </div>
    </div>
  )
}