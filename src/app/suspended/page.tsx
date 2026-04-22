import { Clock, Mail, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'
import { SuspendedCountdown } from '@/components/user/SuspendedCountdown'

export const metadata: Metadata = { title: 'Account Suspended' }

interface Props {
  searchParams: Promise<{ reason?: string; until?: string }>
}

export default async function SuspendedPage({ searchParams }: Props) {
  const { reason, until } = await searchParams

  const liftDate = until ? new Date(until).toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit'
  }) : null

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden">
      
      {/* Amber Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[5%] -right-[5%] w-[40%] h-[40%] rounded-full bg-amber-500/5 blur-[100px]" />
        <div className="absolute -bottom-[5%] -left-[5%] w-[40%] h-[40%] rounded-full bg-amber-500/10 blur-[100px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
        {/* Icon Illustration */}
        <div className="relative mb-10 w-32 h-32 mx-auto">
          <div className="absolute inset-0 rounded-[2rem] bg-amber-500/10 border-2 border-amber-500/20 -rotate-6" />
          <div className="absolute inset-0 rounded-[2rem] bg-card border-2 border-amber-500/40 shadow-xl flex flex-col items-center justify-center gap-2 rotate-3">
            <Clock size={32} className="text-amber-500" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-amber-600/80">On Hold</span>
          </div>
        </div>

        <div className="space-y-4 mb-8">
          <h1 className="text-3xl font-black tracking-tight uppercase italic">HIATUS IN EFFECT</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            Your account is currently in a "cooling off" period. You'll be back in the story shortly.
          </p>

          {until && <SuspendedCountdown until={until} />}

          <div className="space-y-2">
            {liftDate && (
              <div className="p-3 rounded-2xl bg-amber-500/5 border border-amber-500/20 flex items-center gap-3 text-left">
                <AlertCircle size={18} className="text-amber-500 shrink-0" />
                <div>
                  <p className="text-[9px] font-black uppercase tracking-widest text-amber-600/70">Estimated Return</p>
                  <p className="text-xs font-bold">{liftDate}</p>
                </div>
              </div>
            )}
            
            {reason && (
              <div className="p-3 rounded-2xl bg-muted/50 border border-border text-left">
                <p className="text-[9px] font-black uppercase tracking-widest text-muted-foreground mb-1">Reason for Hold</p>
                <p className="text-xs text-muted-foreground leading-snug">{reason}</p>
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col gap-3">
          <a href="mailto:support@compicfy.cloud">
            <Button variant="outline" className="w-full gap-2 border-amber-500/30 text-amber-700 hover:bg-amber-500/5 h-11 font-bold">
              <Mail size={16} />
              Contact Support
            </Button>
          </a>
        </div>
      </div>
    </div>
  )
}