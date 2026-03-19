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
import { Eye, EyeOff, Loader2, BookOpen, ArrowRight } from 'lucide-react'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
})

type LoginForm = z.infer<typeof loginSchema>

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, formState: { errors } } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  })

  const onSubmit = async (data: LoginForm) => {
    setLoading(true)
    const { data: authData, error } = await supabase.auth.signInWithPassword({
      email: data.email,
      password: data.password,
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Check if user has completed onboarding
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('id', authData.user.id)
      .single()

    toast.success('Welcome back!')
    router.refresh()

    if (!(profile as any)?.onboarding_completed) {
      router.push('/onboarding')
    } else {
      router.push('/browse')
    }
  }

  return (
    <div className="w-full max-w-md space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <div className="inline-flex w-14 h-14 rounded-2xl bg-gradient-to-br from-primary to-violet-500 items-center justify-center shadow-xl shadow-primary/20 mb-2">
          <BookOpen size={24} className="text-white" />
        </div>
        <h1 className="text-3xl font-black tracking-tight">Welcome back</h1>
        <p className="text-muted-foreground text-sm">Sign in to your Compicfy account</p>
      </div>

      {/* Card */}
      <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm shadow-xl shadow-black/5 p-6 space-y-5">

        <GoogleButton mode="signin" />

        <div className="relative flex items-center gap-3">
          <div className="flex-1 h-px bg-border" />
          <span className="text-xs text-muted-foreground font-medium uppercase tracking-wider">or</span>
          <div className="flex-1 h-px bg-border" />
        </div>

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

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <Label htmlFor="password" className="text-sm font-semibold">Password</Label>
              <Link href="/forgot-password" className="text-xs text-muted-foreground hover:text-primary transition-colors">
                Forgot password?
              </Link>
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                autoComplete="current-password"
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
            {errors.password && <p className="text-xs text-destructive">{errors.password.message}</p>}
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-bold gap-2 bg-gradient-to-r from-primary to-violet-500 hover:from-primary/90 hover:to-violet-500/90 border-0 shadow-lg shadow-primary/20"
            disabled={loading}
          >
            {loading ? (
              <><Loader2 size={16} className="animate-spin" /> Signing in…</>
            ) : (
              <>Sign in <ArrowRight size={15} /></>
            )}
          </Button>
        </form>
      </div>

      <p className="text-sm text-muted-foreground text-center">
        Don&apos;t have an account?{' '}
        <Link href="/signup" className="text-primary hover:underline font-semibold">
          Sign up free
        </Link>
      </p>
    </div>
  )
}