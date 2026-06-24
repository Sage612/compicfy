'use client'

import { Button } from '@/components/ui/button'
import { useEffect } from 'react'
import Link from 'next/link'
import { AlertTriangle, RotateCcw, Home, Radar } from 'lucide-react'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  useEffect(() => {
    // Send to logging monitoring service like Sentry or Logtail here
    console.error("Global Error Boundary:", error)
  }, [error])

  const displayMessage = error.message 
    ? error.message.length > 120 
      ? `${error.message.slice(0, 120)}...` 
      : error.message 
    : 'An unexpected error occurred.'

  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-background text-foreground antialiased selection:bg-primary/20">
        <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-background">
          
          {/* Background Ambience */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-destructive/5 blur-[120px]" />
            <div className="absolute -bottom-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-primary/5 blur-[120px]" />
          </div>

          <div className="relative z-10">
            {/* Icon Stack */}
            <div className="relative mb-10 inline-block">
              <div className="w-24 h-24 rounded-[2rem] bg-destructive/10 border border-destructive/20 flex items-center justify-center mx-auto shadow-2xl shadow-destructive/20 relative z-10">
                <AlertTriangle size={42} className="text-destructive" />
              </div>
              {/* Stylized Comic Background Elements */}
              <div className="absolute -top-4 -left-6 w-12 h-16 rounded-xl border border-border bg-card/50 backdrop-blur-sm -rotate-12 z-0 shadow-sm" />
              <div className="absolute -bottom-4 -right-6 w-12 h-16 rounded-xl border border-border bg-card/50 backdrop-blur-sm rotate-12 z-0 shadow-sm" />
            </div>

            {/* Text Content */}
            <div className="space-y-4 mb-10 max-w-sm mx-auto">
              <h1 className="text-4xl font-black tracking-tight italic">
                PLOT TWIST!
              </h1>
              <h2 className="text-xl font-bold text-foreground/90">Something went wrong</h2>
              <p className="text-muted-foreground text-sm leading-relaxed">
                {displayMessage}
              </p>
              
              {error.digest && (
                <div className="pt-2">
                  <code className="text-[10px] font-mono bg-muted text-muted-foreground px-2.5 py-1 rounded-full border border-border">
                    REF: {error.digest}
                  </code>
                </div>
              )}
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <Button
                onClick={() => reset()}
                className="w-full sm:w-auto gap-2 bg-primary text-primary-foreground shadow-lg shadow-primary/20 hover:scale-[1.02] transition-transform font-bold"
              >
                <RotateCcw size={16} />
                Try Again
              </Button>
              
              <Link href="/browse" className="w-full sm:w-auto">
                <Button variant="outline" className="w-full gap-2 border-border hover:bg-muted font-semibold">
                  <Radar size={16} />
                  Browse Comics
                </Button>
              </Link>

              <Link href="/" className="w-full sm:w-auto">
                <Button variant="ghost" className="w-full gap-2 text-muted-foreground font-semibold">
                  <Home size={16} />
                  Home
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
