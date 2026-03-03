export const metadata = { title: 'Privacy Policy' }

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Privacy Policy</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Information We Collect</h2>
          <p className="text-muted-foreground">We collect information you provide directly to us when you create an account, submit recommendations, write reviews, or contact us. This includes your email address, username, display name, profile bio, avatar, and date of birth (for age verification purposes only).</p>
          <p className="text-muted-foreground">We also automatically collect certain information when you use Compicfy, including your IP address, browser type, device information, pages visited, and interactions with content.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. How We Use Your Information</h2>
          <p className="text-muted-foreground">We use the information we collect to operate and improve Compicfy, personalise your experience (including content recommendations based on your genre preferences), send notifications about your account activity, enforce our community guidelines and terms of service, and communicate with you about platform updates.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. Age Verification Data</h2>
          <p className="text-muted-foreground">Your date of birth is used solely to determine eligibility for age-restricted content. We store only the result of your age verification (e.g. whether you are 18+) and not your exact birth date in our servers. Age verification status is stored locally in your browser for 30 days, after which you will be asked to verify again.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. Sharing of Information</h2>
          <p className="text-muted-foreground">We do not sell, trade, or rent your personal information to third parties. We may share information with trusted service providers who assist in operating our platform (such as Supabase for database and authentication, and Vercel for hosting), subject to confidentiality agreements. We may also disclose information when required by law.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Public Content</h2>
          <p className="text-muted-foreground">Your username, profile information, recommendations, reviews, and reading lists marked as public are visible to all users of Compicfy. Do not include sensitive personal information in public-facing content.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Cookies & Local Storage</h2>
          <p className="text-muted-foreground">We use cookies and browser local storage to maintain your session, remember your theme preference (light/dark), and store your age verification status. We do not use advertising cookies or track you across other websites.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Data Retention</h2>
          <p className="text-muted-foreground">We retain your account data for as long as your account is active. You may request deletion of your account and associated data at any time by contacting us at <a href="mailto:privacy@compicfy.com" className="text-primary hover:underline">privacy@compicfy.com</a>. Note that some content such as reviews and recommendations may be retained in anonymised form after account deletion.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. Security</h2>
          <p className="text-muted-foreground">We implement industry-standard security measures including encrypted connections (HTTPS), hashed passwords, and row-level security on our database. However, no method of transmission over the internet is 100% secure, and we cannot guarantee absolute security.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Children's Privacy</h2>
          <p className="text-muted-foreground">Compicfy is not directed to children under 13. We do not knowingly collect personal information from children under 13. If we become aware that a child under 13 has provided us with personal information, we will take steps to delete such information promptly.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Your Rights</h2>
          <p className="text-muted-foreground">Depending on your location, you may have rights regarding your personal data including the right to access, correct, or delete your data, the right to data portability, and the right to object to processing. To exercise these rights, contact us at <a href="mailto:privacy@compicfy.com" className="text-primary hover:underline">privacy@compicfy.com</a>.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Contact Us</h2>
          <p className="text-muted-foreground">For privacy-related concerns, contact us at <a href="mailto:privacy@compicfy.com" className="text-primary hover:underline">privacy@compicfy.com</a>.</p>
        </section>
      </div>
    </div>
  )
}