export const metadata = { title: 'Terms of Service' }

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold mb-2">Terms of Service</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <div className="space-y-8 text-sm leading-relaxed">
        <section className="space-y-3">
          <h2 className="text-xl font-bold">1. Acceptance of Terms</h2>
          <p className="text-muted-foreground">By accessing or using Compicfy, you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree to these terms, please do not use the platform. We reserve the right to update these terms at any time with notice provided via the platform.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">2. Eligibility</h2>
          <p className="text-muted-foreground">You must be at least 13 years of age to create an account on Compicfy. Access to mature (17+) and adult (18+) content requires age verification. By using Compicfy, you represent that you meet the minimum age requirements applicable to your use of the platform.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">3. User Accounts</h2>
          <p className="text-muted-foreground">You are responsible for maintaining the confidentiality of your account credentials and for all activity that occurs under your account. You must not share your account with others or create accounts for deceptive purposes. Notify us immediately of any unauthorised use of your account.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">4. User-Generated Content</h2>
          <p className="text-muted-foreground">By submitting recommendations, reviews, or other content to Compicfy, you grant us a non-exclusive, royalty-free, worldwide licence to display and distribute that content on the platform. You retain ownership of your content and represent that it does not infringe any third-party rights. You are solely responsible for content you submit.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">5. Prohibited Conduct</h2>
          <p className="text-muted-foreground">You agree not to: submit or link to pirated content; harass, abuse, or threaten other users; submit false or misleading information; create fake accounts or manipulate votes; attempt to hack or disrupt the platform; submit spam or unsolicited commercial messages; impersonate any person or entity; or violate any applicable laws or regulations.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">6. Content Standards</h2>
          <p className="text-muted-foreground">All content submitted to Compicfy must comply with our Community Guidelines. Content that promotes hate speech, discrimination, violence, or illegal activity is strictly prohibited. Adult content submissions must be accurately rated and will only be shown to verified adult users.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">7. Intellectual Property</h2>
          <p className="text-muted-foreground">Compicfy and its original content, features, and functionality are the property of Compicfy and its operators. All manga, manhwa, and comic titles referenced on the platform are the property of their respective rights holders. We operate under fair use principles for review and recommendation purposes.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">8. DMCA Policy</h2>
          <p className="text-muted-foreground">We respect intellectual property rights. If you believe content on Compicfy infringes your copyright, please send a DMCA notice to <a href="mailto:legal@compicfy.com" className="text-primary hover:underline">legal@compicfy.com</a> with details of the allegedly infringing content. We will respond promptly to valid DMCA requests.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">9. Termination</h2>
          <p className="text-muted-foreground">We reserve the right to suspend or terminate your account at our discretion if you violate these terms or our Community Guidelines. You may also delete your account at any time from your dashboard settings. Termination does not affect any rights or obligations that arose prior to termination.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">10. Disclaimers</h2>
          <p className="text-muted-foreground">Compicfy is provided "as is" without warranties of any kind. We do not guarantee uninterrupted service availability. We are not liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">11. Governing Law</h2>
          <p className="text-muted-foreground">These terms are governed by applicable international laws. Any disputes arising from these terms will be resolved through good-faith negotiation, and if necessary, binding arbitration.</p>
        </section>

        <section className="space-y-3">
          <h2 className="text-xl font-bold">12. Contact</h2>
          <p className="text-muted-foreground">For questions about these Terms, contact <a href="mailto:legal@compicfy.com" className="text-primary hover:underline">legal@compicfy.com</a>.</p>
        </section>
      </div>
    </div>
  )
}