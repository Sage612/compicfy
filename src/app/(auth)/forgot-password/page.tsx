'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { ArrowLeft, Loader2, MailCheck, KeyRound, ArrowRight } from 'lucide-react'

const forgotSchema = z.object({
  email: z.string().email('Please enter a valid email'),
})

type ForgotForm = z.infer<typeof forgotSchema>

export default function ForgotPasswordPage() {
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [sent, setSent] = useState(false)

  const { register, handleSubmit, formState: { errors }, getValues } = useForm<ForgotForm>({
    resolver: zodResolver(forgotSchema),
  })

  const onSubmit = async (data: ForgotForm) => {
    setLoading(true)
    const { error } = await supabase.auth.resetPasswordForEmail(data.email, {
      redirectTo: `${window.location.origin}/reset-password`,
    })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setSent(true)
    setLoading(false)
  }

  if (sent) {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 items-center justify-center shadow-xl shadow-emerald-500/20">
          <MailCheck size={28} className="text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Check your inbox</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We sent a reset link to{' '}
            <span className="font-semibold text-foreground">{getValues('email')}</span>.<br />
            It may take a minute to arrive.
          </p>
        </div>
        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6">
          <Link href="/login">
            <Button variant="outline" className="w-full h-11 gap-2 font-semibold">
              <ArrowLeft size={15} />
              Back to login
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-500 items-center justify-center shadow-xl shadow-amber-500/20 mb-2">
          <KeyRound size={22} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Reset password</h1>
        <p className="text-muted-foreground text-sm">We'll send a reset link to your email</p>
      </div>

      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="email" className="text-sm font-semibold">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              autoComplete="email"
              className="h-11 bg-background border-border focus:border-primary transition-colors"
              {...register('email')}
            />
            {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
          </div>
          <Button
            type="submit"
            className="w-full h-11 font-bold gap-2 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 border-0 shadow-lg shadow-amber-500/20 text-white"
            disabled={loading}
          >
            {loading ? <><Loader2 size={16} className="animate-spin" /> Sending…</> : <>Send reset link <ArrowRight size={15} /></>}
          </Button>
        </form>
        <Link href="/login">
          <Button variant="ghost" className="w-full h-10 gap-2 text-muted-foreground hover:text-foreground font-medium">
            <ArrowLeft size={15} />
            Back to login
          </Button>
        </Link>
      </div>
    </div>
  )
}