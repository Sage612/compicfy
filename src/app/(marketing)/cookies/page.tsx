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
       Last updated: March 5, 2026
      </p>

      <section className="prose prose-sm dark:prose-invert max-w-none space-y-8">

        <div>
          <h2 className="text-xl font-semibold mb-3">What are cookies?</h2>
          <p className="text-muted-foreground leading-relaxed">
            Cookies are small text files stored on your device when you visit a website.
            They help the site remember your preferences and understand how you use it.
          </p>
        </div>

       {/* Section: What cookies does Compicfy use? */}
        <div>
          <h2 className="text-xl font-semibold mb-3">What cookies does Compicfy use?</h2>

          <div className="rounded-lg border border-border overflow-hidden">
            <table className="w-full text-sm table-fixed">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left px-4 py-3 font-medium w-1/4">Category</th>
                  <th className="text-left px-4 py-3 font-medium w-1/2">Purpose</th>
                  <th className="text-left px-4 py-3 font-medium w-1/4">Required?</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                <tr>
                  <td className="px-4 py-3 font-medium align-middle">Necessary</td>
                  <td className="px-4 py-3 text-muted-foreground align-middle">Authentication (Supabase session), security tokens, your cookie consent choice.</td>
                  <td className="px-4 py-3 align-middle">
                    <span className="rounded-full bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      Always on
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium align-middle">Preferences</td>
                  <td className="px-4 py-3 text-muted-foreground align-middle">Theme (light/dark mode), age verification status, UI preferences.</td>
                  <td className="px-4 py-3 align-middle">
                    <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      Optional
                    </span>
                  </td>
                </tr>
                <tr>
                  <td className="px-4 py-3 font-medium align-middle">Analytics</td>
                  <td className="px-4 py-3 text-muted-foreground align-middle">Anonymous usage data to understand how people use Compicfy. No personal data collected.</td>
                  <td className="px-4 py-3 align-middle">
                    <span className="rounded-full bg-yellow-100 dark:bg-yellow-900/30 text-yellow-700 dark:text-yellow-400 px-2 py-0.5 text-xs font-medium whitespace-nowrap">
                      Optional
                    </span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div> {/* <--- This was the missing closing tag for line 26 */}

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
    You can reset your cookie preferences at any time by going to your browser&apos;s
    developer tools → Application → Local Storage → delete the{' '}
    <code className="text-xs bg-muted px-1 py-0.5 rounded">compicfy_cookie_consent</code>{' '}
    key, then refresh the page.
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