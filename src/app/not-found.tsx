import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Home, Radar, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-primary/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-violet-500/5 blur-3xl pointer-events-none" />

      {/* Stacked comic panels illustration */}
      <div className="relative mb-8 w-36 h-36 mx-auto">
        {/* Back panels */}
        <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
        <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
        {/* Front panel — the 404 */}
        <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-primary/30 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
          <BookOpen size={18} className="text-primary opacity-60" />
          <span className="text-2xl font-black text-primary leading-none">404</span>
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest">Not Found</span>
        </div>
      </div>

      {/* Heading */}
      <div className="space-y-3 mb-8 max-w-sm">
        <h1 className="text-3xl font-black tracking-tight">
          This chapter doesn't exist
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          The page you're looking for may have been moved, deleted, or never existed.
          Let's get you back on track.
        </p>
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3 mb-10">
        <Link href="/browse">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 shadow-md shadow-primary/20 hover:opacity-90">
            <Radar size={14} />
            Browse Comics
          </Button>
        </Link>
        <Link href="/">
          <Button variant="outline" className="gap-2 hover:border-primary/40 hover:text-primary">
            <Home size={14} />
            Go Home
          </Button>
        </Link>
      </div>

      {/* Quick links */}
      <div className="flex flex-col items-center gap-2">
        <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
          Or try one of these
        </p>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { href: '/news',    label: 'News'    },
            { href: '/feed',  label: 'Feed'  },
            { href: '/pricing', label: 'Pricing' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="inline-flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border border-border bg-card text-muted-foreground hover:text-foreground hover:border-primary/30 transition-colors"
            >
              {label}
              <ArrowRight size={10} />
            </Link>
          ))}
        </div>
      </div>

    </div>
  )
}