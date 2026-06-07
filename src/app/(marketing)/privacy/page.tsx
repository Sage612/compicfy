import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

// ── Update this date whenever you make material changes ──────────
const LAST_UPDATED = 'May 14, 2025'

const PRIVACY_SECTIONS = [
  {
    n: '1', title: 'Information We Collect',
    body: 'We collect information you provide directly when you create an account, submit recommendations, write reviews, or contact us. This includes your email address, username, display name, profile bio, and avatar. We also automatically collect certain information when you use Compicfy, including your IP address, browser type, device information, pages visited, and interactions with content (including clicks on affiliate and merchandise links).',
  },
  {
    n: '2', title: 'How We Use Your Information',
    body: 'We use the information we collect to operate and improve Compicfy, personalise your experience (including content recommendations based on your genre preferences), send notifications about your account activity, enforce our community guidelines and terms of service, and communicate with you about platform updates.',
  },
  {
    n: '3', title: 'Age Verification & Adult Content',
    // Fixed: accurately describes what we actually store
    body: 'When you enable adult content in your account settings, we store your consent status (adult_content_enabled) and the timestamp of that consent in your profile on our servers. This is used to persist your preference across sessions and devices. We do not collect or store your date of birth on our servers. The age gate shown to first-time visitors stores your age category (teen, mature, or adult) in your browser\'s local storage only, and expires after 30 days, after which you will be asked to verify again.',
  },
  {
    n: '4', title: 'Sharing of Information',
    body: 'We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers who assist in operating our platform (including Supabase for database and authentication, and Flutterwave for payment processing), subject to confidentiality agreements. We may also disclose information when required by law.',
  },
  {
    n: '5', title: 'Public Content',
    body: 'Your username, profile information, recommendations, reviews, and reading lists marked as public are visible to all users of Compicfy. Do not include sensitive personal information in public-facing content.',
  },
  {
    n: '6', title: 'Cookies & Local Storage',
    body: 'We use cookies and browser local storage to maintain your session, remember your theme preference, store your age verification status, and track clicks on merchandise links to improve recommendations. Clicking third-party affiliate links may allow our partners (such as Amazon) to place their own tracking cookies in your browser.',
  },
  {
    n: '7', title: 'Third-Party Cover Images',
    body: 'Cover images may be sourced from community databases such as MyAnimeList and AniList when official publisher assets are unavailable. These are linked directly from their source, we do not store or serve these images from our own servers. Rights holders who wish to have images removed may contact us at support@compicfy.com.',
  },
  {
    n: '8', title: 'Data Retention',
    body: null,
    contact: 'support@compicfy.com',
    contactText: 'We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time through your dashboard settings or by contacting us at {email}. Some content such as reviews and recommendations may be retained in anonymised form after account deletion.',
  },
  {
    n: '9', title: 'Security',
    body: 'We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security on our database. However, no method of transmission over the internet is 100% secure.',
  },
  {
    n: '10', title: 'Data Breach Notification',
    body: 'In the event of a data breach that affects your personal information, we will notify affected users via email within 72 hours of becoming aware of the breach, where technically feasible. The notification will describe the nature of the breach, the data affected, and steps we are taking to address it.',
  },
  {
    n: '11', title: "Children's Privacy",
    body: 'Compicfy is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information promptly.',
  },
  {
    n: '12', title: 'Your Rights (GDPR / CCPA)',
    // Added: required for EU and California users
    body: 'Depending on your location, you may have rights regarding your personal data. EU residents (under GDPR) and California residents (under CCPA) have the right to: access the personal data we hold about you; request correction of inaccurate data; request deletion of your data; object to or restrict processing of your data; and data portability. To exercise any of these rights, contact us at support@compicfy.com. We will respond within 30 days. We do not discriminate against users who exercise their privacy rights.',
  },
  {
    n: '13', title: 'International Data Transfers',
    body: 'Compicfy is operated from Some where around the World and uses infrastructure providers that may process data in the United States or European Union. By using Compicfy, you consent to the transfer of your information to these countries, which may have different data protection laws than your jurisdiction.',
  },
  {
    n: '14', title: 'Affiliate Disclosure',
    body: 'Compicfy participates in various affiliate marketing programs, which means we may earn commissions on products purchased through our links to retailer sites. This comes at no additional cost to you and helps support the platform.',
  },
  {
    n: '15', title: 'Contact Us',
    body: null,
    contact: 'support@compicfy.com',
    contactText: 'For privacy-related concerns or to exercise your data rights, contact us at {email}.',
  },
]

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      {/* Header — using brand primary instead of blue/indigo */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-lg shadow-primary/20">
            <span className="text-lg">🔒</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Last updated: {LAST_UPDATED}</p>
      </div>

      <div className="space-y-8">
        {PRIVACY_SECTIONS.map(({ n, title, body, contact, contactText }) => (
          <section key={n} className="space-y-2">
            <h2 className="text-base font-black flex items-center gap-2">
              {/* Fixed: was blue-500/10 text-blue-600 */}
              <span className="w-6 h-6 rounded-lg bg-primary/10 text-primary text-xs font-black flex items-center justify-center shrink-0">
                {n}
              </span>
              {title}
            </h2>
            {body && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">{body}</p>
            )}
            {contactText && contact && (
              <p className="text-sm text-muted-foreground leading-relaxed pl-8">
                {contactText.split('{email}').map((part, i, arr) =>
                  i < arr.length - 1
                    ? <span key={i}>{part}<a href={`mailto:${contact}`} className="text-primary hover:underline font-medium">{contact}</a></span>
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