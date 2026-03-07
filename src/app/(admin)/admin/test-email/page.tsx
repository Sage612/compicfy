'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Mail, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

const EMAIL_TYPES = [
  { type: 'welcome', label: 'Welcome Email', description: 'Sent when a user signs up', color: 'text-primary' },
  { type: 'approved', label: 'Recommendation Approved', description: 'Sent when admin approves a rec', color: 'text-green-500' },
  { type: 'rejected', label: 'Recommendation Rejected', description: 'Sent when admin rejects a rec', color: 'text-destructive' },
  { type: 'banned', label: 'Account Banned', description: 'Sent when admin bans a user', color: 'text-destructive' },
  { type: 'unbanned', label: 'Account Unbanned', description: 'Sent when admin lifts a ban', color: 'text-green-500' },
  { type: 'appeal_approved', label: 'Appeal Approved', description: 'Sent when ban appeal is approved', color: 'text-green-500' },
  { type: 'appeal_rejected', label: 'Appeal Rejected', description: 'Sent when appeal is rejected', color: 'text-orange-500' },
]

export default function TestEmailPage() {
  const [email, setEmail] = useState('')
  const [loading, setLoading] = useState<string | null>(null)
  const [sent, setSent] = useState<string[]>([])

  const sendTest = async (type: string) => {
    if (!email.trim()) {
      toast.error('Enter a recipient email address first')
      return
    }

    setLoading(type)
    try {
      const res = await fetch('/api/admin/test-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, to: email }),
      })

      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to send')
        return
      }

      toast.success(`✅ ${type} email sent to ${email}`)
      setSent(prev => [...prev, type])
    } catch {
      toast.error('Network error — check console')
    } finally {
      setLoading(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Email Testing</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Send test emails to verify Resend is configured correctly
        </p>
      </div>

      {/* Recipient input */}
      <div className="space-y-2">
        <label className="text-sm font-medium">Recipient Email</label>
        <div className="flex gap-2">
          <Input
            type="email"
            placeholder="your@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
          />
        </div>
        <p className="text-xs text-muted-foreground">
          All test emails will be sent to this address
        </p>
      </div>

      {/* Email type buttons */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Email Types</p>
        <div className="space-y-2">
          {EMAIL_TYPES.map(({ type, label, description, color }) => (
            <div
              key={type}
              className="flex items-center justify-between p-4 rounded-xl border border-border bg-card"
            >
              <div className="flex items-center gap-3">
                <div className={cn('w-8 h-8 rounded-full flex items-center justify-center bg-muted', color)}>
                  {sent.includes(type)
                    ? <CheckCircle2 size={16} />
                    : <Mail size={15} />
                  }
                </div>
                <div>
                  <p className="text-sm font-medium">{label}</p>
                  <p className="text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <Button
                size="sm"
                variant={sent.includes(type) ? 'outline' : 'default'}
                onClick={() => sendTest(type)}
                disabled={!!loading || !email.trim()}
                className="gap-2 min-w-[80px]"
              >
                {loading === type
                  ? <Loader2 size={13} className="animate-spin" />
                  : sent.includes(type) ? 'Resend' : 'Send'
                }
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Env check */}
      <div className="p-4 rounded-xl border border-border bg-muted/30 space-y-2">
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
          Environment Check
        </p>
        <p className="text-xs text-muted-foreground">
          Make sure these are set in Vercel environment variables:
        </p>
        <div className="space-y-1">
          {['RESEND_API_KEY', 'RESEND_FROM_EMAIL', 'NEXT_PUBLIC_SITE_URL', 'NEXT_PUBLIC_SITE_NAME'].map(key => (
            <code key={key} className="block text-xs bg-muted px-2 py-1 rounded font-mono">
              {key}
            </code>
          ))}
        </div>
      </div>
    </div>
  )
}