'use client'

import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home, BookOpen } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    console.error(error)
  }, [error])

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-32 -left-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />

      {/* Icon stack */}
      <div className="relative mb-8">
        <div className="w-24 h-24 rounded-3xl bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto shadow-xl shadow-destructive/10">
          <AlertTriangle size={40} className="text-destructive" />
        </div>
        {/* Floating comic panels behind icon — decorative */}
        <div className="absolute -top-3 -left-8 w-10 h-14 rounded-lg border border-border bg-card opacity-60 rotate-[-8deg]" />
        <div className="absolute -bottom-3 -right-8 w-10 h-14 rounded-lg border border-border bg-card opacity-60 rotate-[6deg]" />
      </div>

      {/* Heading */}
      <div className="space-y-3 mb-8 max-w-md">
        <h1 className="text-3xl font-black tracking-tight">
          Plot twist — something broke
        </h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          {error.message
            ? error.message.length > 120
              ? error.message.slice(0, 120) + '...'
              : error.message
            : 'An unexpected error occurred. Our team has been notified.'}
        </p>
        {error.digest && (
          <p className="text-[10px] font-mono text-muted-foreground/50 border border-border rounded-lg px-3 py-1.5 inline-block">
            Error ID: {error.digest}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap items-center justify-center gap-3">
        <Button
          onClick={reset}
          className="gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 shadow-md shadow-primary/20 hover:opacity-90"
        >
          <RotateCcw size={14} />
          Try Again
        </Button>
        <Link href="/browse">
          <Button variant="outline" className="gap-2 hover:border-primary/40 hover:text-primary">
            <BookOpen size={14} />
            Back to Browse
          </Button>
        </Link>
        <Link href="/">
          <Button variant="ghost" className="gap-2 text-muted-foreground hover:text-foreground">
            <Home size={14} />
            Home
          </Button>
        </Link>
      </div>

    </div>
  )
}