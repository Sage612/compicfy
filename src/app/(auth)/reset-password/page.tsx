'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Loader2, KeyRound, CheckCircle, ShieldAlert, ArrowRight } from 'lucide-react'
import Link from 'next/link'

const resetSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: 'Passwords do not match',
  path: ['confirmPassword'],
})

type ResetForm = z.infer<typeof resetSchema>

export default function ResetPasswordPage() {
  const router = useRouter()
  const supabase = createClient()
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [validSession, setValidSession] = useState(false)
  const [checking, setChecking] = useState(true)

  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setValidSession(!!session)
      setChecking(false)
    }
    checkSession()
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      }
    })
    return () => subscription.unsubscribe()
  }, [])

  const { register, handleSubmit, formState: { errors } } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetForm) => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) { toast.error(error.message); setLoading(false); return }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (checking) return (
    <div className="w-full max-w-md text-center space-y-4">
      <div className="inline-flex w-14 h-14 rounded-2xl bg-muted items-center justify-center">
        <Loader2 size={24} className="animate-spin text-muted-foreground" />
      </div>
      <p className="text-sm text-muted-foreground">Verifying reset link…</p>
    </div>
  )

  if (!validSession) return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="inline-flex w-16 h-16 rounded-2xl bg-destructive/10 items-center justify-center">
        <ShieldAlert size={28} className="text-destructive" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Link expired</h1>
        <p className="text-muted-foreground text-sm">This reset link is invalid or expired. Please request a new one.</p>
      </div>
      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6">
        <Link href="/forgot-password">
          <Button className="w-full h-11 font-bold">Request new link</Button>
        </Link>
      </div>
    </div>
  )

  if (done) return (
    <div className="w-full max-w-md space-y-6 text-center">
      <div className="inline-flex w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-500 items-center justify-center shadow-xl shadow-emerald-500/20">
        <CheckCircle size={28} className="text-white" />
      </div>
      <div className="space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Password updated!</h1>
        <p className="text-muted-foreground text-sm">Redirecting you to login…</p>
      </div>
    </div>
  )

  return (
    <div className="w-full max-w-md space-y-6">
      <div className="text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 items-center justify-center shadow-xl shadow-primary/20 mb-2">
          <KeyRound size={22} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">New password</h1>
        <p className="text-muted-foreground text-sm">Choose a strong password for your account</p>
      </div>

      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 p-6 space-y-5">
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold">New Password</Label>
            <Input id="password" type="password" placeholder="At least 8 characters" autoComplete="new-password"
              className="h-11 bg-background border-border focus:border-primary transition-colors" {...register('password')} />
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password</Label>
            <Input id="confirmPassword" type="password" placeholder="Repeat your password" autoComplete="new-password"
              className="h-11 bg-background border-border focus:border-primary transition-colors" {...register('confirmPassword')} />
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>
          <Button type="submit"
            className="w-full h-11 font-bold gap-2 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 border-0 shadow-lg shadow-primary/20"
            disabled={loading}>
            {loading ? <><Loader2 size={16} className="animate-spin" /> Updating…</> : <>Update password <ArrowRight size={15} /></>}
          </Button>
        </form>
      </div>
    </div>
  )
}