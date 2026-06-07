import { Ban, Mail, LogOut } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { createClient } from '@/lib/supabase/server'
import { BanWatchdog } from '@/components/user/BanWatchdog'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account Banned' }

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
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center relative overflow-hidden bg-background">

	 {user && <BanWatchdog userId={user.id} />}
      
      {/* Background Blobs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-[10%] -right-[10%] w-[40%] h-[40%] rounded-full bg-destructive/10 blur-[120px]" />
        <div className="absolute -bottom-[10%] -left-[10%] w-[40%] h-[40%] rounded-full bg-destructive/5 blur-[120px]" />
      </div>

      <div className="relative z-10 w-full max-w-sm mx-auto">
        {/* Visual Header */}
        <div className="relative mb-10 w-32 h-32 mx-auto">
          <div className="absolute inset-0 rounded-3xl bg-destructive/10 border-2 border-destructive/20 rotate-6" />
          <div className="absolute inset-0 rounded-3xl bg-card border-2 border-destructive/40 shadow-2xl flex flex-col items-center justify-center gap-2 -rotate-3 transition-transform hover:rotate-0 duration-500">
            <Ban size={32} className="text-destructive animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-destructive/70">Banned</span>
          </div>
        </div>

        {/* Content */}
        <div className="space-y-4 mb-10">
          <h1 className="text-4xl font-black tracking-tighter italic">END OF THE LINE</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            This account has been permanently restricted for violating our community guidelines.
          </p>

          {reason && (
            <div className="p-4 rounded-2xl bg-destructive/5 border border-destructive/10 text-left relative overflow-hidden">
               <div className="absolute top-0 left-0 w-1 h-full bg-destructive/40" />
               <p className="text-[10px] font-black uppercase tracking-widest text-destructive/80 mb-1">Violation Detail</p>
               <p className="text-sm font-medium text-foreground/80">{reason}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex flex-col gap-3">
          <a href="mailto:support@compicfy.com" className="w-full">
            <Button className="w-full gap-2 bg-destructive hover:bg-destructive/90 text-white font-bold shadow-lg shadow-destructive/20 h-11">
              <Mail size={16} />
              Submit an Appeal
            </Button>
          </a>
          {/* Allow them to sign out so they aren't trapped if they have another account */}
          <form action="/auth/signout" method="post">
            <Button variant="ghost" className="w-full gap-2 text-muted-foreground hover:text-destructive">
              <LogOut size={16} />
              Sign Out
            </Button>
          </form>
        </div>

	 <p className="mt-12 text-[10px] text-muted-foreground/60 uppercase tracking-[0.2em] max-w-xs leading-relaxed">
        Our team will review your appeal. If your status changes, this page will update automatically.
      </p>

      </div>
    </div>
  )
}