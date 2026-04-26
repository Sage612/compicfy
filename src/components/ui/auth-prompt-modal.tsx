'use client'

import { useEffect, useState } from 'react'
import { usePathname } from 'next/navigation'
import { LogIn, UserPlus, X } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export interface AuthPromptConfig {
  action: string        // e.g. "upvote", "save", "write a review"
  comicTitle?: string   // e.g. "Solo Leveling"
  icon?: React.ReactNode
}

interface Props {
  open: boolean
  onClose: () => void
  config: AuthPromptConfig
}

function PromptContent({ config, onClose, nextPath }: {
  config: AuthPromptConfig
  onClose: () => void
  nextPath: string
}) {
  const loginHref  = `/login?next=${encodeURIComponent(nextPath)}`
  const signupHref = `/signup?next=${encodeURIComponent(nextPath)}`

  return (
    <div className="flex flex-col items-center text-center gap-6 py-2">
      {/* Icon blob */}
      <div className="relative">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-violet-500/10 border border-primary/20 flex items-center justify-center">
          {config.icon ?? (
            <LogIn size={24} className="text-primary" />
          )}
        </div>
        <div className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-amber-400 border-2 border-background flex items-center justify-center">
          <span style={{ fontSize: 10 }}>✦</span>
        </div>
      </div>

      {/* Copy */}
      <div className="space-y-2 max-w-xs">
        <p className="text-lg font-black tracking-tight leading-snug">
          Sign in to {config.action}
        </p>
        {config.comicTitle && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Join the community to {config.action}{' '}
            <span className="font-semibold text-foreground">
              "{config.comicTitle}"
            </span>{' '}
            and thousands of other comics.
          </p>
        )}
        {!config.comicTitle && (
          <p className="text-sm text-muted-foreground leading-relaxed">
            Create a free account to {config.action} and join the community.
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="w-full space-y-2.5 max-w-xs">
        <Button
          asChild
          className="w-full gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20 h-11"
        >
          <a href={loginHref}>
            <LogIn size={15} />
            Sign In
          </a>
        </Button>
        <Button
          asChild
          variant="outline"
          className="w-full gap-2 h-11"
        >
          <a href={signupHref}>
            <UserPlus size={15} />
            Create Free Account
          </a>
        </Button>
      </div>

      <p className="text-[11px] text-muted-foreground/60 max-w-[220px] leading-relaxed">
        By signing up, you agree to our{' '}
        <a
          href="/terms"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          Terms of Service
        </a>
        {' '}and{' '}
        <a
          href="/privacy"
          target="_blank"
          rel="noopener noreferrer"
          className="underline hover:no-underline"
        >
          Privacy Policy
        </a>

      </p>
    </div>
  )
}

export function AuthPromptModal({ open, onClose, config }: Props) {
  const pathname = usePathname()
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const mq = window.matchMedia('(max-width: 639px)')
    setIsMobile(mq.matches)
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  if (isMobile) {
    return (
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent
          side="bottom"
          className="rounded-t-3xl px-6 pb-10 pt-6"
        >
          {/* Drag handle */}
          <div className="w-10 h-1 rounded-full bg-muted mx-auto mb-6" />
          <SheetHeader className="sr-only">
            <SheetTitle>Sign in required</SheetTitle>
            <SheetDescription>
              Sign in or create an account to {config.action}
            </SheetDescription>
          </SheetHeader>
          <PromptContent
            config={config}
            onClose={onClose}
            nextPath={pathname}
          />
        </SheetContent>
      </Sheet>
    )
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-sm rounded-3xl p-8">
        <DialogHeader className="sr-only">
          <DialogTitle>Sign in required</DialogTitle>
          <DialogDescription>
            Sign in or create an account to {config.action}
          </DialogDescription>
        </DialogHeader>
        <PromptContent
          config={config}
          onClose={onClose}
          nextPath={pathname}
        />
      </DialogContent>
    </Dialog>
  )
}