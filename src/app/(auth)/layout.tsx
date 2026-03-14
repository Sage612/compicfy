import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Auth — Compicfy',
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" fill="none" xmlns="http://www.w3.org/2000/svg" className={className} aria-hidden="true">
      <rect x="3"   y="18"    width="22"  height="5.5" rx="1.5" className="fill-primary-foreground/25" />
      <rect x="3"   y="18"    width="10"  height="5.5" rx="1.5" className="fill-primary-foreground/55" />
      <rect x="4.5" y="11.5"  width="19"  height="5.5" rx="1.5" className="fill-primary-foreground/45" />
      <rect x="4.5" y="11.5"  width="9"   height="5.5" rx="1.5" className="fill-primary-foreground/75" />
      <rect x="6"   y="5"     width="16"  height="5.5" rx="1.5" className="fill-primary-foreground"    />
      <rect x="6"   y="5"     width="7.5" height="5.5" rx="1.5" className="fill-primary-foreground/65" />
    </svg>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-violet-500/8 dark:bg-violet-500/12 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-rose-500/6 dark:bg-rose-500/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-primary/3 blur-[120px]" />
      </div>

      {/* Manga panel decorations */}
      <div className="absolute inset-0 pointer-events-none hidden md:block overflow-hidden">
        <div className="absolute top-8 right-16 w-24 h-32 rounded-2xl border border-primary/8 rotate-6" />
        <div className="absolute top-20 right-32 w-16 h-22 rounded-xl border border-violet-500/8 -rotate-3" />
        <div className="absolute bottom-20 left-16 w-20 h-28 rounded-2xl border border-rose-500/6 -rotate-6" />
        <div className="absolute bottom-8 left-32 w-14 h-18 rounded-xl border border-primary/6 rotate-3" />
      </div>

      {/* Top bar */}
      <header className="relative z-10 p-5">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 group-hover:shadow-primary/30 transition-all duration-200">
            <LogoMark className="w-[18px] h-[18px]" />
          </div>
          <span className="font-black text-[15px] tracking-tight text-foreground group-hover:text-primary transition-colors">
            Compic<span className="text-primary">fy</span>
          </span>
        </Link>
      </header>

      {/* Auth content */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4 py-8">
        {children}
      </main>

      {/* Footer */}
      <footer className="relative z-10 p-4 text-center text-xs text-muted-foreground">
        By continuing, you agree to our{' '}
        <Link href="/terms" className="underline hover:text-foreground transition-colors">Terms</Link>
        {' '}and{' '}
        <Link href="/privacy" className="underline hover:text-foreground transition-colors">Privacy Policy</Link>
      </footer>
    </div>
  )
}