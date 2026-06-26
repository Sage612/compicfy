'use client'

import { useState, useRef, useEffect } from 'react'
import { Share2, Copy, Check } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

interface Props {
  title: string
  url: string
  compact?: boolean
}

export function ShareButton({ title, url, compact = false }: Props) {
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
  const encodedTitle = encodeURIComponent(`Check out "${title}" on Compicfy!`)

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
          <path d="M12.004 0C5.374 0 0 5.373 0 12c0 2.112.546 4.16 1.588 5.964L.057 24l6.306-1.654A11.946 11.946 0 0012.004 24c6.629 0 12.004-5.373 12.004-12s-5.375-12-12.004-12zm7.01 17.382c-.297.834-1.488 1.534-2.062 1.637-.514.093-1.183.13-1.896-.1-.433-.141-2.28-.887-4.887-3.14-2.67-2.31-3.32-3.52-3.642-3.953-.323-.433-.564-.937-.564-1.488 0-.551.282-.823.386-.948.104-.125.23-.26.345-.396.115-.135.156-.23.23-.385.073-.156.031-.292-.01-.396-.042-.104-.386-.927-.532-1.27-.14-.34-.284-.294-.386-.3-.1-.004-.213-.005-.323-.005-.11 0-.292.042-.444.208-.152.167-.584.573-.584 1.396 0 .823.6 1.614.683 1.73.084.114 1.182 1.805 2.866 2.531.4.172.713.275.957.353.403.128.77.11 1.06.067.324-.048 1.002-.41 1.141-.806.14-.396.14-.735.099-.806-.041-.072-.152-.114-.323-.198z"/>
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
    <div className="relative inline-block text-left" ref={ref}>
      <button
        onClick={handleToggle}
        className={cn(
          'flex items-center gap-1.5 transition-all active:scale-95',
          compact
            ? 'w-8 h-8 rounded-xl bg-black/70 backdrop-blur-md border border-white/10 justify-center text-white hover:bg-black/90'
            : 'px-3.5 py-2 rounded-xl border border-border bg-card text-xs font-semibold text-muted-foreground hover:text-foreground hover:border-primary/30 shadow-sm'
        )}
        aria-label="Share options"
      >
        <Share2 size={14} />
        {!compact && <span>Share</span>}
      </button>

      {open && (
        <div className={cn(
          'absolute z-[100] w-64 rounded-2xl border border-border bg-popover p-3 shadow-xl space-y-3 animate-in fade-in slide-in-from-top-2 duration-150',
          compact ? 'top-full mt-2 right-0' : 'right-0 mt-2'
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
              className="bg-transparent text-[11px] text-muted-foreground px-2 flex-1 outline-none truncate select-all"
            />
            <button
              onClick={handleCopy}
              className={cn(
                'p-1.5 rounded-lg transition-all active:scale-95',
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
