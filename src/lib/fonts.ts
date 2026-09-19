import { Fraunces } from 'next/font/google'

// Dashboard's editorial serif — separate from the comic-detail page's
// "dossier" theme (--font-dossier-display) on purpose. Dossier is scoped to
// that one page for now; this is the dashboard's own headline font. If the
// two ever get unified into one app-wide look later, that's a deliberate
// follow-up, not something to conflate here.
export const dashboardSerif = Fraunces({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-dashboard-serif-raw',
})