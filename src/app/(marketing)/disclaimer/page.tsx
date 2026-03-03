export const metadata = { title: 'Disclaimer' }

export default function DisclaimerPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 prose prose-sm dark:prose-invert">
      <h1 className="text-3xl font-bold mb-2">Disclaimer</h1>
      <p className="text-muted-foreground text-sm mb-8">Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</p>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">1. Content Ownership</h2>
        <p className="text-muted-foreground leading-relaxed">Compicfy is a community-driven recommendation and discovery platform. We do not host, store, distribute, or provide access to any manga, manhwa, manhua, webtoon, or comic content. All titles, artwork, characters, and intellectual property referenced on this platform remain the exclusive property of their respective authors, publishers, and rights holders.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">2. No Piracy Policy</h2>
        <p className="text-muted-foreground leading-relaxed">Compicfy is strictly opposed to piracy. We do not link to, promote, or facilitate access to unauthorized copies of any content. All recommendations on this platform direct users exclusively to official, licensed platforms such as Webtoon, Tapas, Lezhin Comics, MangaPlus, Crunchyroll, VIZ Media, and other legitimate services. Any user found submitting links to pirated content will have their account permanently suspended.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">3. User-Generated Content</h2>
        <p className="text-muted-foreground leading-relaxed">The recommendations, reviews, ratings, and opinions expressed on Compicfy are submitted by community members and do not represent the views of Compicfy or its operators. We are not responsible for the accuracy, completeness, or appropriateness of user-submitted content, though we actively moderate to maintain community standards.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">4. Mature Content</h2>
        <p className="text-muted-foreground leading-relaxed">Compicfy hosts recommendations across multiple content ratings including All Ages, Teen (13+), Mature (17+), and Adult (18+). Age verification is required to access mature and adult-rated content. By confirming your age, you take responsibility for ensuring you meet the minimum age requirements in your jurisdiction. Compicfy implements reasonable age-gating measures but cannot guarantee absolute restriction.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">5. Affiliate Links</h2>
        <p className="text-muted-foreground leading-relaxed">Some news articles and recommendations on Compicfy may contain affiliate links. When you click these links and make a purchase, Compicfy may earn a small commission at no additional cost to you. All affiliate content is clearly labelled with an "Affiliate" badge. We only include affiliate links for legitimate, licensed content platforms.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">6. Accuracy of Information</h2>
        <p className="text-muted-foreground leading-relaxed">While we strive to ensure all information on Compicfy is accurate and up to date, we cannot guarantee the accuracy of community-submitted details such as chapter counts, release dates, or platform availability. Always verify information on official publisher or platform websites.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">7. External Links</h2>
        <p className="text-muted-foreground leading-relaxed">Compicfy may contain links to third-party websites and services. We are not responsible for the content, privacy practices, or terms of service of any external sites. Accessing external links is at your own discretion and risk.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">8. AI-Generated Content</h2>
        <p className="text-muted-foreground leading-relaxed">Some news summaries on Compicfy are generated with the assistance of AI. All AI-generated content is clearly labelled and reviewed by our moderation team before publication. AI-generated summaries are based on publicly available source material and are not a substitute for the original reporting.</p>
      </section>

      <section className="space-y-4 mb-8">
        <h2 className="text-xl font-bold">9. Changes to This Disclaimer</h2>
        <p className="text-muted-foreground leading-relaxed">We reserve the right to update this disclaimer at any time. Continued use of Compicfy following any changes constitutes your acceptance of the updated disclaimer.</p>
      </section>

      <section className="space-y-4">
        <h2 className="text-xl font-bold">10. Contact</h2>
        <p className="text-muted-foreground leading-relaxed">If you have questions about this disclaimer or wish to report a DMCA concern, please contact us at <a href="mailto:legal@compicfy.com" className="text-primary hover:underline">legal@compicfy.com</a>.</p>
      </section>
    </div>
  )
}