'use client'

import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Crown } from 'lucide-react'

export default function ProError({
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
    <div className="flex flex-col items-center justify-center min-h-[60vh] p-8 text-center">
      <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-6 shadow-lg shadow-amber-500/10">
        <AlertTriangle size={28} className="text-amber-500" />
      </div>
      <h1 className="text-2xl font-black mb-2">Pro dashboard error</h1>
      <p className="text-muted-foreground text-sm max-w-sm mb-6 leading-relaxed">
        {error.message ?? 'Something went wrong loading this page.'}
      </p>
      <div className="flex gap-3">
        <Button
          onClick={reset}
          className="gap-2 bg-gradient-to-r from-amber-400 to-orange-500 border-0 shadow-md shadow-amber-500/20 hover:opacity-90 text-white"
        >
          <RotateCcw size={14} />
          Try Again
        </Button>
        <Link href="/pro/dashboard">
          <Button variant="outline" className="gap-2 border-amber-500/30 hover:border-amber-500/60">
            <Crown size={14} className="text-amber-500" />
            Pro Dashboard
          </Button>
        </Link>
      </div>
    </div>
  )
}