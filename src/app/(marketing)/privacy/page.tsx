// ── Privacy Policy ────────────────────────────────────────────────────────────
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Privacy Policy' }

const PRIVACY_SECTIONS = [
  { n:'1', title:'Information We Collect',         body:"We collect information you provide directly when you create an account, submit recommendations, write reviews, or contact us. This includes your email address, username, display name, profile bio, avatar, and date of birth (for age verification only). We also automatically collect certain information when you use Compicfy, including your IP address, browser type, device information, pages visited, and interactions with content (including clicks on affiliate and merchandise links)." },
  { n:'2', title:'How We Use Your Information',    body:"We use the information we collect to operate and improve Compicfy, personalise your experience (including content recommendations based on your genre preferences), send notifications about your account activity, enforce our community guidelines and terms of service, and communicate with you about platform updates." },
  { n:'3', title:'Age Verification Data',           body:"Your date of birth is used solely to determine eligibility for age-restricted content. We store only the result of your age verification (e.g. whether you are 18+) and not your exact birth date on our servers. Age verification status is stored locally in your browser for 30 days, after which you will be asked to verify again." },
  { n:'4', title:'Sharing of Information',         body:"We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers who assist in operating our platform (such as Supabase for database and authentication, and Vercel for hosting), subject to confidentiality agreements. We may also disclose information when required by law." },
  { n:'5', title:'Public Content',                 body:"Your username, profile information, recommendations, reviews, and reading lists marked as public are visible to all users of Compicfy. Do not include sensitive personal information in public-facing content." },
  { n:'6', title:'Cookies & Local Storage',         body:"We use cookies and browser local storage to maintain your session, remember your theme preference, store your age verification status, and track clicks on merchandise links to improve recommendations. Clicking third-party affiliate links may allow our partners (such as Amazon or Entertainment Earth) to place their own tracking cookies in your browser." },
  { n:'7', title:'Third-Party Cover Images',       body:"Cover images may be sourced from community databases such as MyAnimeList and AniList when official publisher assets are unavailable. These are used solely for identification purposes. We do not store or serve these images from our own servers — they are linked directly from their source. Rights holders who wish to have images removed may contact us at legal@compicfy.site." },
  { n:'8', title:'Data Retention',                 body:null, contact:'privacy@compicfy.site', contactText:"We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at {email}. Note that some content such as reviews and recommendations may be retained in anonymised form after account deletion." },
  { n:'9', title:'Security',                       body:"We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security on our database. However, no method of transmission over the internet is 100% secure." },
  { n:'10', title:"Children's Privacy",             body:"Compicfy is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information promptly." },
  { n:'11', title:'Your Rights',                   body:null, contact:'privacy@compicfy.site', contactText:"Depending on your location, you may have rights regarding your personal data including the right to access, correct, or delete your data, the right to data portability, and the right to object to processing. To exercise these rights, contact us at {email}." },
  { n:'12', title:'Contact Us',                    body:null, contact:'privacy@compicfy.site', contactText:"For privacy-related concerns, contact us at {email}." },
  { n:'13', title:'Affiliate Disclosure',          body:"Compicfy participates in various affiliate marketing programs, which means we may get paid commissions on products purchased through our links to retailer sites. This comes at no additional cost to you and helps support the platform's maintenance." },
]

export default function PrivacyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <span className="text-lg">🔒</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Privacy Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Last updated: {lastUpdated}</p>
      </div>
      <div className="space-y-8">
        {PRIVACY_SECTIONS.map(({ n, title, body, contact, contactText }) => (
          <section key={n} className="space-y-2">
            <h2 className="text-base font-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-blue-500/10 text-blue-600 text-xs font-black flex items-center justify-center shrink-0">{n}</span>
              {title}
            </h2>
            {body && <p className="text-sm text-muted-foreground leading-relaxed pl-8">{body}</p>}
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