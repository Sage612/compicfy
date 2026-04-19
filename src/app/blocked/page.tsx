import Link from 'next/link'
import { Ban, Mail, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Account Banned' }

interface Props {
  searchParams: Promise<{ reason?: string }>
}

export default async function BlockedPage({ searchParams }: Props) {
  const { reason } = await searchParams

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center relative overflow-hidden">

      {/* Background blobs */}
      <div className="absolute -top-32 -right-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-32 -left-32 w-96 h-96 rounded-full bg-destructive/5 blur-3xl pointer-events-none" />

      {/* Stacked comic panels */}
      <div className="relative mb-8 w-36 h-36 mx-auto">
        <div className="absolute top-0 left-0 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-12deg] opacity-40" />
        <div className="absolute top-2 left-6 w-20 h-28 rounded-2xl border-2 border-border bg-card rotate-[-5deg] opacity-60" />
        <div className="absolute top-4 left-10 w-20 h-28 rounded-2xl border-2 border-destructive/40 bg-card shadow-xl flex flex-col items-center justify-center gap-1">
          <Ban size={18} className="text-destructive opacity-80" />
          <span className="text-[8px] font-bold text-muted-foreground uppercase tracking-widest text-center px-1">Banned</span>
        </div>
      </div>

      <div className="space-y-3 mb-8 max-w-sm">
        <h1 className="text-3xl font-black tracking-tight">Account Banned</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Your account has been permanently banned from Compicfy.
        </p>
        {reason && (
          <div className="mt-4 p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-left">
            <p className="text-[10px] font-black uppercase tracking-widest text-destructive mb-1">Reason</p>
            <p className="text-sm text-muted-foreground">{reason}</p>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
        <a href="mailto:support@compicfy.cloud">
          <Button className="gap-2 bg-gradient-to-r from-primary to-violet-500 border-0 shadow-md shadow-primary/20 hover:opacity-90">
            <Mail size={14} />
            Appeal via Email
          </Button>
        </a>
      </div>

      <p className="text-xs text-muted-foreground max-w-xs">
        If you believe this is a mistake, email{' '}
        <a href="mailto:support@compicfy.cloud" className="text-primary hover:underline">
          support@compicfy.cloud
        </a>{' '}
        with your username and a description of the issue.
      </p>

    </div>
  )
}