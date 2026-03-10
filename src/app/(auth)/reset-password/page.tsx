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
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, KeyRound, CheckCircle } from 'lucide-react'
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
    // Supabase puts the token in the URL hash — it handles it automatically
    // We just need to confirm there's an active session from the reset link
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      setValidSession(!!session)
      setChecking(false)
    }
    checkSession()

    // Listen for the PASSWORD_RECOVERY event from the hash token
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY') {
        setValidSession(true)
        setChecking(false)
      }
    })

    return () => subscription.unsubscribe()
  }, [])

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetForm>({
    resolver: zodResolver(resetSchema),
  })

  const onSubmit = async (data: ResetForm) => {
    setLoading(true)
    const { error } = await supabase.auth.updateUser({ password: data.password })
    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }
    setDone(true)
    setLoading(false)
    setTimeout(() => router.push('/login'), 2500)
  }

  if (checking) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardContent className="py-12">
          <Loader2 size={32} className="animate-spin mx-auto text-muted-foreground" />
          <p className="text-sm text-muted-foreground mt-3">Verifying reset link...</p>
        </CardContent>
      </Card>
    )
  }

  if (!validSession) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <CardTitle className="text-2xl font-bold">Link expired</CardTitle>
          <CardDescription>
            This password reset link is invalid or has expired. Please request a new one.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Link href="/forgot-password">
            <Button className="w-full">Request new link</Button>
          </Link>
        </CardContent>
      </Card>
    )
  }

  if (done) {
    return (
      <Card className="w-full max-w-md text-center">
        <CardHeader className="space-y-4">
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-full bg-green-500/10 flex items-center justify-center">
              <CheckCircle size={32} className="text-green-500" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">Password updated!</CardTitle>
          <CardDescription>
            Your password has been changed. Redirecting you to login...
          </CardDescription>
        </CardHeader>
      </Card>
    )
  }

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="space-y-1">
        <div className="flex justify-center mb-2">
          <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center">
            <KeyRound size={24} className="text-primary" />
          </div>
        </div>
        <CardTitle className="text-2xl font-bold text-center">Set new password</CardTitle>
        <CardDescription className="text-center">
          Choose a strong password for your account
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="At least 8 characters"
              autoComplete="new-password"
              {...register('password')}
            />
            {errors.password && (
              <p className="text-sm text-destructive">{errors.password.message}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword">Confirm Password</Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Repeat your password"
              autoComplete="new-password"
              {...register('confirmPassword')}
            />
            {errors.confirmPassword && (
              <p className="text-sm text-destructive">{errors.confirmPassword.message}</p>
            )}
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading ? (
              <>
                <Loader2 size={16} className="mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update password'
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}