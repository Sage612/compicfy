'use client'
import { useRouter } from 'next/navigation'
import { Search } from 'lucide-react'

export function GlobalSearch() {
  const router = useRouter()
  return (
    <button
      onClick={() => router.push('/search')}
      aria-label="Search comics"
      className="flex items-center gap-2 h-8 px-3 rounded-xl border border-border bg-muted/40 text-muted-foreground hover:text-foreground hover:border-primary/40 hover:bg-muted/60 transition-all text-sm"
    >
      <Search size={13} className="shrink-0" />
      <span className="text-xs sm:hidden">Search...</span>
      <span className="hidden sm:inline text-xs">Search...</span>
      <kbd className="hidden md:inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-md border border-border text-[10px] font-mono text-muted-foreground/60 ml-1">
        ⌘K
      </kbd>
    </button>
  )
}