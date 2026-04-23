import { Ban, Mail, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'    
import { BanWatchdog } from '@/components/user/BanWatchdog'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account Banned' }

// Ensures the server always re-runs the middleware logic on refresh
export const dynamic = 'force-dynamic'
export const revalidate = 0

interface Props {
  searchParams: Promise<{ reason?: string }>
}

export default async function BlockedPage({ searchParams }: Props) {
  const { reason } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden bg-background">
      
      {/* Logic component to handle automatic unban detection */}
      {user && <BanWatchdog userId={user.id} />}

      {/* Background Ambience */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />

      {/* Branded Icon Stack */}
      <div className="relative mb-8 w-36 h-36 mx-auto">
        <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
        <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
        <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-destructive/40 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
          <Ban size={18} className="text-destructive opacity-80" />
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Banned</span>
        </div>
      </div>

      {/* Main Content */}
      <div className="space-y-3 mb-8 max-w-sm">
        <h1 className="text-3xl font-black tracking-tight uppercase italic">END OF THE LINE</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
         This account has been permanently restricted for violating our community guidelines.
        </p>
        
        {reason && (
          <div className="mt-4 p-4 rounded-xl bg-destructive/5 border border-destructive/10 text-left relative overflow-hidden">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-destructive/50" />
            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">Violation Detail</p>
            <p className="text-sm text-muted-foreground leading-snug">{reason}</p>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col items-center justify-center gap-3 w-full max-w-xs">
        <a href="mailto:support@compicfy.cloud" className="w-full">
          <Button className="w-full gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 shadow-md shadow-primary/20 hover:scale-[1.02] transition-transform">
            <Mail size={14} />
           Submit an Appeal
          </Button>
        </a>

        <form action="/auth/signout" method="post" className="w-full">
          <Button variant="ghost" type="submit" className="w-full gap-2 text-muted-foreground hover:text-destructive">
            <LogOut size={14} />
            Sign Out
          </Button>
        </form>
      </div>

      <p className="mt-12 text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] max-w-xs leading-relaxed">
        Our team will review your appeal. If your status changes, this page will update automatically.
      </p>

    </div>
  )
}