import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Compicfy uses cookies and similar technologies.',
}

export default function CookiePolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
            <span className="text-lg">🍪</span>
          </div>
          <h1 className="text-3xl font-black tracking-tight">Cookie Policy</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">Last updated: {lastUpdated}</p>
      </div>

      <div className="space-y-8">

        {/* What are cookies */}
        <section className="space-y-2">
          <h2 className="text-base font-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black flex items-center justify-center shrink-0">1</span>
            What are cookies?
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed pl-8">
            Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and understand how you use it.
          </p>
        </section>

        {/* Cookie table */}
        <section className="space-y-3">
          <h2 className="text-base font-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black flex items-center justify-center shrink-0">2</span>
            What cookies does Compicfy use?
          </h2>
          <div className="pl-8">
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm table-fixed">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide w-1/4">Category</th>
                    <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide w-1/2">Purpose</th>
                    <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide w-1/4">Required?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm align-middle">Necessary</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs align-middle leading-relaxed">Authentication (Supabase session), security tokens, and your cookie consent choice.</td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 whitespace-nowrap">Always on</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm align-middle">Preferences</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs align-middle leading-relaxed">Theme (light/dark mode), age verification status, and UI preferences.</td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">Optional</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm align-middle">Referrals</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs align-middle leading-relaxed">Attribution for merchandise links to help support the platform. Third-party partners (e.g., Amazon) may set their own cookies upon clicking links.</td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">Optional</span>
                    </td>
                  </tr>
                  <tr>
                    <td className="px-4 py-3 font-semibold text-sm align-middle">Analytics</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs align-middle leading-relaxed">Anonymous usage data to understand how people use Compicfy. No personal data collected.</td>
                    <td className="px-4 py-3 align-middle">
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">Optional</span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* What we don't do */}
        <section className="space-y-2">
          <h2 className="text-base font-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black flex items-center justify-center shrink-0">3</span>
            We do NOT do any of the following
          </h2>
          <ul className="pl-8 space-y-1.5">
            {[
              'Sell your data to third parties',
              'Use third-party advertising cookies',
              'Share your data with advertisers',
              'Use fingerprinting or cross-site tracking',
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-muted-foreground">
                <span className="text-red-500 font-bold shrink-0 mt-0.5">✕</span>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* How to change preferences */}
        <section className="space-y-2">
          <h2 className="text-base font-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black flex items-center justify-center shrink-0">4</span>
            How to change your preferences
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed pl-8">
            You can reset your cookie preferences at any time by going to your browser&apos;s developer tools → Application → Local Storage → delete the{' '}
            <code className="text-xs bg-muted border border-border px-1.5 py-0.5 rounded font-mono">compicfy_cookie_consent</code>{' '}
            key, then refresh the page.
          </p>
        </section>

        {/* Contact */}
        <section className="space-y-2">
          <h2 className="text-base font-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black flex items-center justify-center shrink-0">5</span>
            Contact
          </h2>
          <p className="text-sm text-muted-foreground leading-relaxed pl-8">
            Questions about cookies or privacy? Email us at{' '}
            <a href="mailto:privacy@compicfy.cloud" className="text-primary hover:underline font-medium">
              privacy@compicfy.cloud
            </a>
          </p>
        </section>

      </div>
    </div>
  )
}