import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Cookie Policy',
  description: 'How Compicfy uses cookies and similar technologies.',
}

export default function CookiePolicyPage() {
  return (
    <main className="mx-auto max-w-3xl px-4 py-16 md:py-24">
      <h1 className="text-3xl font-bold tracking-tight mb-2">Cookie Policy</h1>
      <p className="text-sm text-muted-foreground mb-10">
        Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
      </p>

      <section className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <div>
          <h2 className="text-xl font-semibold mb-3">What are cookies?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files stored on your device when you visit a website.
            They help the site remember your preferences and understand how you use it.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">What cookies does Compicfy use?</h2>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium">Category</th>
                  <th className="text-left px-4 py-3 font-medium">Purpose</th>
                  <th className="text-left px-4 py-3 font-medium">Required?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-medium">Necessary</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Authentication (Supabase session), security tokens, your cookie consent choice.
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-medium">
                      Always on
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Preferences</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Theme (light/dark mode), age verification status, UI preferences.
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 text-xs font-medium">
                      Optional
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium">Analytics</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    Anonymous usage data to understand how people use Compicfy. No personal data is collected.
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 text-xs font-medium">
                      Optional
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">We do NOT do any of the following</h2>
          <ul className="space-y-1 text-muted-foreground list-disc list-inside">
            <li>Sell your data to third parties</li>
            <li>Use advertising or tracking cookies</li>
            <li>Share your data with advertisers</li>
            <li>Use fingerprinting or cross-site tracking</li>
          </ul>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">How to change your preferences</h2>
          <p className="text-muted-foreground leading-relaxed">
            You can reset your cookie preferences at any time by clearing your browser&apos;s
            local storage for compicfy.site, or by clicking{' '}
            <button
              onClick={() => {
                if (typeof window !== 'undefined') {
                  localStorage.removeItem('compicfy_cookie_consent')
                  localStorage.removeItem('compicfy_cookie_consent_date')
                  window.location.reload()
                }
              }}
              className="underline underline-offset-2 hover:text-foreground transition-colors cursor-pointer"
            >
              Reset my cookie preferences
            </button>
            {' '}to see the banner again.
          </p>
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-3">Contact</h2>
          <p className="text-muted-foreground leading-relaxed">
            Questions about cookies or privacy? Email us at{' '}
            <a href="mailto:privacy@compicfy.site" className="underline underline-offset-2 hover:text-foreground transition-colors">
              privacy@compicfy.site
            </a>
          </p>
        </div>

      </section>
    </main>
  )
}