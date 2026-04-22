import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen, Home, Radar, ArrowRight } from 'lucide-react'

export default function NotFound() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-background">

      {/* Dynamic Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[5%] -right-[5%] w-[45%] h-[45%] rounded-full bg-primary/5 blur-[100px]" />
        <div className="absolute -bottom-[5%] -left-[5%] w-[45%] h-[45%] rounded-full bg-violet-500/5 blur-[100px]" />
      </div>

      {/* Stacked Comic Panels Illustration */}
      <div className="relative mb-10 w-40 h-40 mx-auto">
        {/* Decorative Back panels */}
        <div className="absolute top-0 left-0 w-24 h-32 rounded-2xl border-2 border-border bg-card/50 rotate-[-15deg] opacity-30 shadow-sm" />
        <div className="absolute top-2 left-6 w-24 h-32 rounded-2xl border-2 border-border bg-card rotate-[-8deg] opacity-60 shadow-md" />
        
        {/* Main "Hero" Panel */}
        <div className="absolute top-6 left-12 w-24 h-32 rounded-2xl border-2 border-primary/40 bg-card shadow-2xl flex flex-col items-center justify-center gap-1.5 animate-in fade-in zoom-in duration-500 rotate-[2deg]">
          <div className="relative">
             <BookOpen size={20} className="text-primary mb-1" />
             {/* Tiny shimmer effect */}
             <div className="absolute inset-0 bg-primary/20 blur-xl scale-150 animate-pulse" />
          </div>
          <span className="text-3xl font-black text-primary leading-none tracking-tighter">404</span>
          <span className="text-[9px] font-black text-muted-foreground/80 uppercase tracking-[0.2em]">Lost</span>
        </div>
      </div>

      {/* Content */}
      <div className="relative z-10 space-y-4 mb-10 max-w-sm mx-auto">
        <h1 className="text-4xl font-black tracking-tight italic uppercase">
          CHAPTER DELETED?
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed px-4">
          This page hasn't been serialized yet. It might have moved to a different volume or never existed at all.
        </p>
      </div>

      {/* Main Actions */}
      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-center gap-3 mb-12">
        <Link href="/browse" className="w-full sm:w-auto">
          <Button className="w-full gap-2 bg-gradient-to-r from-primary to-violet-600 border-0 shadow-lg shadow-primary/25 hover:scale-[1.03] transition-transform">
            <Radar size={16} />
            Browse Comics
          </Button>
        </Link>
        <Link href="/" className="w-full sm:w-auto">
          <Button variant="outline" className="w-full gap-2 border-border hover:bg-muted font-bold">
            <Home size={16} />
            Go Home
          </Button>
        </Link>
      </div>

      {/* Quick Navigation Footer */}
      <div className="relative z-10 flex flex-col items-center gap-4">
        <span className="text-[10px] font-black uppercase tracking-[0.3em] text-muted-foreground/60">
          Try a different route
        </span>
        <nav className="flex flex-wrap justify-center gap-2 max-w-xs">
          {[
            { href: '/news',    label: 'News'    },
            { href: '/feed',    label: 'Feed'    },
            { href: '/pricing', label: 'Pro' },
          ].map(({ href, label }) => (
            <Link
              key={href}
              href={href}
              className="group inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold border border-border bg-card/50 text-muted-foreground hover:text-primary hover:border-primary/40 transition-all shadow-sm"
            >
              {label}
              <ArrowRight size={12} className="opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all" />
            </Link>
          ))}
        </nav>
      </div>

    </div>
  )
}