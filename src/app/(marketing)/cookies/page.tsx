import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Compicfy uses cookies and similar technologies.',
}

export default function CookiePolicyPage() {
  const lastUpdated = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })

  const cookies = [
    {
      category: 'Necessary',
      purpose: 'Authentication, security tokens, and your cookie consent choice.',
      required: true,
    },
    {
      category: 'Preferences',
      purpose: 'Theme (light/dark mode), age verification status, and UI preferences.',
      required: false,
    },
    {
      category: 'Referrals',
      purpose: 'Attribution for merchandise links to help support the platform. Third-party partners (e.g., Amazon) may set their own cookies upon clicking links.',
      required: false,
    },
    {
      category: 'Analytics',
      purpose: 'Anonymous usage data to understand how people use Compicfy. No personal data collected.',
      required: false,
    },
  ]

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      {/* Header */}
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20 shrink-0">
            <span className="text-lg">🍪</span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-black tracking-tight">Cookie Policy</h1>
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

        {/* Cookie table — desktop */}
        <section className="space-y-3">
          <h2 className="text-base font-black flex items-center gap-2">
            <span className="w-6 h-6 rounded-lg bg-amber-500/10 text-amber-600 text-xs font-black flex items-center justify-center shrink-0">2</span>
            What cookies does Compicfy use?
          </h2>

          {/* Desktop table — hidden on mobile */}
          <div className="pl-0 sm:pl-8 hidden sm:block">
            <div className="rounded-2xl border border-border overflow-hidden">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide w-1/4">Category</th>
                    <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide">Purpose</th>
                    <th className="text-left px-4 py-3 font-black text-xs uppercase tracking-wide w-28">Required?</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {cookies.map(({ category, purpose, required }) => (
                    <tr key={category}>
                      <td className="px-4 py-3 font-semibold text-sm align-top">{category}</td>
                      <td className="px-4 py-3 text-muted-foreground text-xs align-top leading-relaxed">{purpose}</td>
                      <td className="px-4 py-3 align-top">
                        {required ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 whitespace-nowrap">
                            Always on
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                            Optional
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Mobile cards — shown only on mobile */}
          <div className="sm:hidden space-y-3">
            {cookies.map(({ category, purpose, required }) => (
              <div key={category} className="rounded-2xl border border-border bg-card p-4 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-black text-sm">{category}</span>
                  {required ? (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20 whitespace-nowrap shrink-0">
                      Always on
                    </span>
                  ) : (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20 shrink-0">
                      Optional
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">{purpose}</p>
              </div>
            ))}
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
            <code className="text-xs bg-muted border border-border px-1.5 py-0.5 rounded font-mono break-all">
              compicfy_cookie_consent
            </code>{' '}
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
            <a href="mailto:support@compicfy.cloud" className="text-primary hover:underline font-medium break-all">
              support@compicfy.cloud
            </a>
          </p>
        </section>

      </div>
    </div>
  )
}