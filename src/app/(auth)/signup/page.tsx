'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, Users, ArrowRight } from 'lucide-react'

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  email: z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include one uppercase letter')
    .regex(/[0-9]/, 'Must include one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)
    const { data: existingUser } = await supabase
      .from('profiles')
      .select('username')
      .eq('username', data.username.toLowerCase())
      .single()

    if (existingUser) {
      toast.error('Username is already taken')
      setLoading(false)
      return
    }

    const { error } = await supabase.auth.signUp({
      email: data.email,
      password: data.password,
      options: {
        data: {
          username: data.username.toLowerCase(),
          display_name: data.username,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    toast.success('Account created! You can now sign in.')
    router.push('/login')
  }

  return (
    <div className="w-full max-w-md space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-500 to-violet-500 items-center justify-center shadow-xl shadow-rose-500/20 mb-2">
          <Users size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Join Compicfy</h1>
        <p className="text-muted-foreground text-sm">Discover your next favourite comic</p>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 p-6 space-y-5">

        <GoogleButton mode="signup" />

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">

          <div className="space-y-1.5">
            <Label htmlFor="username" className="text-sm font-semibold">Username</Label>
            <Input
              id="username"
              type="text"
              placeholder="comicfan123"
              autoComplete="username"
              className="h-11 bg-background border-border focus:border-primary transition-colors"
              {...register('username')}
            />
            {errors.username
              ? <p className="text-xs text-destructive">{errors.username.message}</p>
              : <p className="text-xs text-muted-foreground">Letters, numbers, underscores only</p>
            }
          </div>

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

          <div className="space-y-1.5">
            <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-11 pr-10 bg-background border-border focus:border-primary transition-colors"
                {...register('password')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.password
              ? <p className="text-xs text-destructive">{errors.password.message}</p>
              : <p className="text-xs text-muted-foreground">Min 8 chars · one uppercase · one number</p>
            }
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="confirmPassword" className="text-sm font-semibold">Confirm Password</Label>
            <div className="relative">
              <Input
                id="confirmPassword"
                type={showConfirm ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="new-password"
                className="h-11 pr-10 bg-background border-border focus:border-primary transition-colors"
                {...register('confirmPassword')}
              />
              <button
                type="button"
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowConfirm(!showConfirm)}
                aria-label={showConfirm ? 'Hide password' : 'Show password'}
              >
                {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {errors.confirmPassword && <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-bold gap-2 bg-gradient-to-r from-rose-500 to-violet-500 hover:from-rose-400 hover:to-violet-400 border-0 shadow-lg shadow-rose-500/20 text-white"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Creating account…</>
            ) : (
              <>Create account <ArrowRight size={15} /></>
            )}
          </Button>
        </form>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Already have an account?{' '}
        <Link href="/login" className="text-primary hover:underline font-semibold">
          Sign in
        </Link>
      </p>
    </div>
  )
}