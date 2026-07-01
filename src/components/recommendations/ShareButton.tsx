'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  url: string
  compact?: boolean
  fullWidth?: boolean
}

export function ShareButton({ title, url, compact = false, fullWidth = false }: Props) {
  const [open, setOpen]     = useState(false)
  const [copied, setCopied] = useState(false)
  const ref                 = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const encodedUrl   = encodeURIComponent(url)
  const encodedTitle = encodeURIComponent(`Check out "${title}" on ComPicfy!`)

  const handleCopy = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    await navigator.clipboard.writeText(url)
    setCopied(true)
    toast.success('Link copied to clipboard!')
    setTimeout(() => setCopied(false), 2000)
  }

  const shareOptions = [
    {
      label: 'X',
      icon: () => (
        <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
        </svg>
      ),
      bg: 'hover:bg-neutral-900 dark:hover:bg-neutral-800 border-neutral-200 dark:border-neutral-800',
      onClick: () => window.open(`https://twitter.com/intent/tweet?text=${encodedTitle}&url=${encodedUrl}`, '_blank'),
    },
    {
      label: 'Reddit',
      icon: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.29-1.72l1.3-4.14 4.23.9c.04.97.84 1.74 1.82 1.74 1.02 0 1.84-.83 1.84-1.84s-.83-1.84-1.84-1.84c-.84 0-1.54.55-1.77 1.3l-4.75-1c-.18-.04-.37.07-.43.25l-1.48 4.72c-2.52.04-4.79.68-6.47 1.7-.56-.76-1.46-1.24-2.42-1.24-1.65 0-3 1.35-3 3 0 1.15.65 2.14 1.59 2.64-.06.31-.09.63-.09.95 0 3.78 4.29 6.86 9.56 6.86s9.56-3.08 9.56-6.86c0-.32-.03-.64-.09-.95.94-.5 1.59-1.49 1.59-2.64zM5.46 13.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5c0 .83-.67 1.5-1.5 1.5s-1.5-.67-1.5-1.5zm10.08 3.53c-.9.9-2.6.98-3.54.98-.94 0-2.64-.08-3.54-.98-.12-.12-.12-.31 0-.43.12-.12.31-.12.43 0 .74.74 2.15.8 3.11.8 1 0 2.37-.06 3.11-.8.12-.12.31-.12.43 0 .12.12.12.31 0 .43zm-2.04-2.03c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/>
        </svg>
      ),
      bg: 'hover:bg-orange-500/10 hover:text-orange-500 border-neutral-200 dark:border-neutral-800',
      onClick: () => window.open(`https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`, '_blank'),
    },
    {
      label: 'WhatsApp',
      icon: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397 0 11.948 0c3.179.001 6.164 1.24 8.402 3.482 2.238 2.238 3.477 5.223 3.475 8.403-.004 6.557-5.341 11.905-11.893 11.905-.194 0-3.882-.023-5.684-1.448L0 24zm6.59-3.835c1.693.3 5.485 1.408 5.49 1.408 5.443 0 9.873-4.426 9.875-9.87a9.815 9.815 0 00-2.887-6.982A9.82 9.82 0 0011.948 2.02c-5.44 0-9.87 4.43-9.873 9.872 0 2.008.523 3.96 1.517 5.68l-.235-.375L2.36 21.61l4.287-1.445zM17.472 14.4c-.3-.15-1.75-.87-2.02-.97-.27-.1-.47-.15-.67.15-.2.3-.77.97-.94 1.16-.17.2-.35.22-.64.07-1.14-.51-2.1-1.12-2.39-1.48-.88-.79-1.48-1.76-1.65-2.06-.17-.3 0-.46.15-.61.13-.13.3-.35.44-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51-.17-.01-.37-.01-.57-.01-.2 0-.52.07-.79.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.06 2.88 1.21 3.07.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.63.71.22 1.36.19 1.87.11.57-.08 1.76-.72 2.01-1.41.25-.69.25-1.29.17-1.41-.07-.13-.27-.2-.57-.35z"/>
        </svg>
      ),
      bg: 'hover:bg-emerald-500/10 hover:text-emerald-500 border-neutral-200 dark:border-neutral-800',
      onClick: () => window.open(`https://wa.me/?text=${encodedTitle}%20${encodedUrl}`, '_blank'),
    },
    {
      label: 'Facebook',
      icon: () => (
        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
          <path d="M22 12c0-5.523-4.477-10-10-10S2 6.477 2 12c0 4.991 3.657 9.128 8.438 9.878v-6.987h-2.54V12h2.54V9.797c0-2.506 1.492-3.89 3.777-3.89 1.094 0 2.238.195 2.238.195v2.46h-1.26c-1.243 0-1.63.771-1.63 1.562V12h2.773l-.443 2.89h-2.33v6.988C18.343 21.128 22 16.991 22 12z"/>
        </svg>
      ),
      bg: 'hover:bg-blue-600/10 hover:text-blue-500 border-neutral-200 dark:border-neutral-800',
      onClick: () => window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodedUrl}`, '_blank'),
    },
  ]

  const handleToggle = (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setOpen(prev => !prev)
  }

  return (
    <div className={cn('relative text-left', fullWidth ? 'block w-full' : 'inline-block')} ref={ref}>
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1.5 transition-all active:scale-95',
          compact
            ? 'w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 justify-center text-white hover:bg-black/90'
            : fullWidth
            ? 'w-full justify-center px-3.5 py-2 h-9 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 shadow-sm'
            : 'px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 shadow-sm'
        )}
        aria-label="Share options"
      >
        <Share2 size={14} />
        {!compact && <span>Share</span>}
      </button>

      {open && (
        /*
          FIX: this panel was `absolute right-0 w-64` unconditionally.
          When the trigger sits inside a narrow flex-1 cell near the left
          edge of a small screen, `right-0` anchors the panel's right edge
          to that *cell's* right edge, not the viewport's — so a fixed
          264px-wide panel can extend past the left edge of the screen
          with no way to scroll back to it, which is the "off screen"
          bug on mobile.

          Fix: cap the width to whatever actually fits the viewport
          (`max-w-[calc(100vw-2rem)]`) and switch the anchor to `left-0`
          on small screens specifically (where overflow is most likely),
          falling back to the original `right-0` behavior at `sm:` and
          up where there's enough room either way.
        */
        <div className={cn(
          'absolute z-[100] w-64 max-w-[calc(100vw-2rem)] rounded-2xl border border-border bg-popover p-3 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150',
          'left-0 sm:left-auto sm:right-0',
          'top-full mt-2'
        )}>
          <div>
            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/80 px-0.5">
              Share Comic
            </p>
          </div>

          {/* Quick Copy Field */}
          <div className="flex items-center gap-1.5 bg-muted/60 border border-border/60 rounded-xl p-1">
            <input
              type="text"
              readOnly
              value={url}
              className="bg-transparent text-[11px] text-muted-foreground px-2 flex-1 outline-none truncate select-all min-w-0"
            />
            <button
              onClick={handleCopy}
              className={cn(
                'p-1.5 rounded-lg transition-all active:scale-95 shrink-0',
                copied 
                  ? 'bg-emerald-500/10 text-emerald-500' 
                  : 'bg-background hover:bg-muted text-muted-foreground border border-border/40'
              )}
              title="Copy link"
            >
              {copied ? <Check size={12} /> : <Copy size={12} />}
            </button>
          </div>

          {/* Clean 2-Column Grid Layout for Networks */}
          <div className="grid grid-cols-2 gap-1.5">
            {shareOptions.map(({ label, icon: Icon, bg, onClick }) => (
              <button
                key={label}
                onClick={(e) => { 
                  e.preventDefault()
                  e.stopPropagation()
                  onClick()
                  setOpen(false)
                }}
                className={cn(
                  'flex items-center gap-2 px-2.5 py-2 rounded-xl text-xs font-medium text-foreground border border-transparent transition-all active:scale-95 bg-muted/30 dark:bg-muted/10',
                  bg
                )}
              >
                <span className="flex items-center justify-center shrink-0 w-4 h-4">
                  <Icon />
                </span>
                <span>{label}</span>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}