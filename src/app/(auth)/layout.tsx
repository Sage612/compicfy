import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Auth-Compicfy',
}

function LogoMark({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 44 44" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      aria-hidden="true"
    >
      {/* Speech bubble body */}
      <rect x="2" y="2" width="36" height="30" rx="8" className="fill-[#0ea5b0]" />
      {/* Bubble tail */}
      <path d="M9 32 L5 43 L20 33.5" className="fill-[#0ea5b0]" />
      {/* C letterform - Always dark per brand guidelines */}
      <path 
        d="M28 11.5 C25 9 19.5 9 16.5 12 C13.5 15 13.5 20.5 16.5 23.5 C19.5 26.5 25 26.5 28 24"
        stroke="#111111" strokeWidth="3.5" strokeLinecap="round" fill="none"
      />
      {/* Period after C - Always dark per brand guidelines */}
      <circle cx="30" cy="24.5" r="2.2" fill="#111111" />
    </svg>
  )
}

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background flex flex-col relative overflow-hidden">

      {/* Background glow blobs */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-[#0ea5b0]/8 dark:bg-[#0ea5b0]/12 blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-[#0ea5b0]/6 dark:bg-[#0ea5b0]/10 blur-3xl" />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] rounded-full bg-[#0ea5b0]/3 blur-[120px]" />
      </div>

      {/* Manga panel decorations */}
      <div className="absolute inset-0 pointer-events-none hidden md:block overflow-hidden">
        <div className="absolute top-8 right-16 w-24 h-32 rounded-2xl border border-[#0ea5b0]/8 rotate-6" />
        <div className="absolute top-20 right-32 w-16 h-22 rounded-xl border border-[#0ea5b0]/8 -rotate-3" />
        <div className="absolute bottom-20 left-16 w-20 h-28 rounded-2xl border border-[#0ea5b0]/6 -rotate-6" />
        <div className="absolute bottom-8 left-32 w-14 h-18 rounded-xl border border-[#0ea5b0]/6 rotate-3" />
      </div>

      {/* Top bar - No background box, tail is visible */}
      <header className="relative z-10 p-5">
        <Link href="/" className="inline-flex items-center gap-2.5 group">
          <LogoMark className="w-8 h-8" />
          <span className="font-black text-[15px] tracking-tight text-foreground group-hover:text-[#0ea5b0] transition-colors">
            ComPic<span className="text-[#0ea5b0]">fy</span>
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