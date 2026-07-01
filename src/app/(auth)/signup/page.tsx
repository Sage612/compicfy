'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { GoogleButton } from '@/components/auth/GoogleButton'
import { toast } from 'sonner'
import { Eye, EyeOff, Loader2, BookOpen, Palette, ArrowRight, Check, MailCheck, ArrowLeft } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { UserType } from '@/lib/utils/routes'

const signupSchema = z.object({
  username: z
    .string()
    .min(3, 'At least 3 characters')
    .max(30, 'Max 30 characters')
    .regex(/^[a-zA-Z0-9_]+$/, 'Letters, numbers, underscores only'),
  email:    z.string().email('Please enter a valid email'),
  password: z
    .string()
    .min(8, 'At least 8 characters')
    .regex(/[A-Z]/, 'Must include one uppercase letter')
    .regex(/[0-9]/, 'Must include one number'),
  confirmPassword: z.string(),
}).refine((d) => d.password === d.confirmPassword, {
  message: "Passwords don't match",
  path:    ['confirmPassword'],
})

type SignupForm = z.infer<typeof signupSchema>

const USER_TYPES: {
  value:      UserType
  label:      string
  sublabel:   string
  icon:       React.ElementType
  perks:      string[]
  accent:     string
  iconBg:     string
  border:     string
  selectedBg: string
}[] = [
  {
    value:      'reader',
    label:      'Reader / Curator',
    sublabel:   'I discover and recommend comics',
    icon:       BookOpen,
    perks:      ['Browse & save comics', 'Vote and review', 'Build reading lists', 'Follow other readers'],
    accent:     'text-primary',
    iconBg:     'bg-primary',
    border:     'border-primary/50',
    selectedBg: 'bg-primary/8',
  },
  {
    value:      'creator',
    label:      'Artist / Creator',
    sublabel:   'I make comics or webtoons',
    icon:       Palette,
    perks:      ['Showcase your works', 'Link your Patreon & Kickstarter', 'Build your audience', 'Track engagement'],
    accent:     'text-teal-500',
    iconBg:     'bg-teal-500',
    border:     'border-teal-500/50',
    selectedBg: 'bg-teal-500/8',
  },
]

function SignupFormInner() {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const supabase     = createClient()

  const next = searchParams.get('next') ?? '/onboarding'

  const [userType,     setUserType]     = useState<UserType>('reader')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm,  setShowConfirm]  = useState(false)
  const [loading,      setLoading]      = useState(false)
  const [step,         setStep]         = useState<'type' | 'form' | 'verify'>('type')
  const [submittedEmail, setSubmittedEmail] = useState('')

  const { register, handleSubmit, formState: { errors } } = useForm<SignupForm>({
    resolver: zodResolver(signupSchema),
  })

  const onSubmit = async (data: SignupForm) => {
    setLoading(true)

    // Check username availability
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
      email:    data.email,
      password: data.password,
      options: {
        data: {
          username:     data.username.toLowerCase(),
          display_name: data.username,
          user_type:    userType,
        },
        emailRedirectTo: `${window.location.origin}/api/auth/callback`,
      },
    })

    if (error) {
      toast.error(error.message)
      setLoading(false)
      return
    }

    // Don't auto sign-in — Supabase requires email confirmation first.
    // Show the verify screen instead.
    setSubmittedEmail(data.email)
    setStep('verify')
    setLoading(false)
  }

  // ── Step: verify email ────────────────────────────────────────────
  if (step === 'verify') {
    return (
      <div className="w-full max-w-md space-y-6 text-center">
        <div className="inline-flex w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 items-center justify-center shadow-xl shadow-emerald-500/10">
          <MailCheck size={28} className="text-emerald-500" />
        </div>
        <div className="space-y-2">
          <h1 className="text-3xl font-black tracking-tight">Check your inbox</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            We sent a confirmation link to{' '}
            <span className="font-semibold text-foreground">{submittedEmail}</span>.<br />
            Click it to activate your account.
          </p>
        </div>

        <div className="rounded-3xl border border-border bg-card/80 backdrop-blur-sm p-6 space-y-4 text-left">
          <div className="space-y-2">
            {[
              'Check your spam folder if you don\'t see it',
              'The link expires after 24 hours',
              'You must confirm before you can sign in',
            ].map((tip) => (
              <div key={tip} className="flex items-start gap-2.5">
                <Check size={13} className="text-emerald-500 mt-0.5 shrink-0" />
                <p className="text-xs text-muted-foreground">{tip}</p>
              </div>
            ))}
          </div>

          <div className="pt-1 space-y-2">
            <Button
              variant="outline"
              className="w-full h-10 gap-2 font-semibold text-sm"
              onClick={async () => {
                const { error } = await supabase.auth.resend({
                  type:  'signup',
                  email: submittedEmail,
                  options: { emailRedirectTo: `${window.location.origin}/api/auth/callback` },
                })
                if (error) toast.error(error.message)
                else toast.success('Confirmation email resent!')
              }}
            >
              Resend confirmation email
            </Button>
            <Button
              variant="ghost"
              className="w-full h-10 gap-2 text-muted-foreground hover:text-foreground font-medium text-sm"
              onClick={() => setStep('form')}
            >
              <ArrowLeft size={14} />
              Back to sign up
            </Button>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Already confirmed?{' '}
          <Link href="/login" className="text-primary hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </div>
    )
  }

  return (
    <div className="w-full max-w-md space-y-6">

      {/* Header */}
      <div className="text-center space-y-2">
        <h1 className="text-3xl font-black tracking-tight">Join ComPicfy</h1>
        <p className="text-muted-foreground text-sm">Find your next obsession</p>
      </div>

      {/* Step 1 — pick user type */}
      {step === 'type' && (
        <div className="space-y-4">
          <p className="text-center text-sm font-semibold text-foreground">I am joining as a…</p>

          <div className="grid grid-cols-1 gap-3">
            {USER_TYPES.map((type) => {
              const Icon       = type.icon
              const isSelected = userType === type.value
              return (
                <button
                  key={type.value}
                  type="button"
                  onClick={() => setUserType(type.value)}
                  className={cn(
                    'relative text-left p-4 rounded-2xl border-2 transition-all duration-200',
                    isSelected
                      ? `${type.selectedBg} ${type.border} shadow-md`
                      : 'border-border bg-card hover:border-border/80 hover:bg-muted/30'
                  )}
                >
                  {isSelected && (
                    <div className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                      <Check size={11} className="text-primary-foreground" />
                    </div>
                  )}
                  <div className="flex items-start gap-4">
                    <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', type.iconBg)}>
                      <Icon size={18} className="text-white" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className={cn('font-black text-sm', isSelected ? type.accent : 'text-foreground')}>
                        {type.label}
                      </p>
                      <p className="text-xs text-muted-foreground mt-0.5">{type.sublabel}</p>
                      <ul className="mt-2 space-y-1">
                        {type.perks.map((perk) => (
                          <li key={perk} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <span className={cn('w-1 h-1 rounded-full shrink-0', isSelected ? type.accent.replace('text-', 'bg-') : 'bg-muted-foreground')} />
                            {perk}
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>

          <Button
            className="w-full h-11 font-bold gap-2"
            onClick={() => setStep('form')}
          >
            Continue as {userType === 'creator' ? 'Creator' : 'Reader'}
            <ArrowRight size={15} />
          </Button>

          <p className="text-sm text-muted-foreground text-center">
            Already have an account?{' '}
            <Link href="/login" className="text-primary hover:underline font-semibold">Sign in</Link>
          </p>
        </div>
      )}

      {/* Step 2 — fill in details */}
      {step === 'form' && (
        <div className="space-y-4">

          {/* Type pill */}
          <button
            type="button"
            onClick={() => setStep('type')}
            className={cn(
              'flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-semibold transition-colors',
              userType === 'creator'
                ? 'border-teal-500/30 bg-teal-500/10 text-teal-600 hover:bg-teal-500/20'
                : 'border-primary/30 bg-primary/10 text-primary hover:bg-primary/20'
            )}
          >
            {userType === 'creator' ? <Palette size={11} /> : <BookOpen size={11} />}
            {userType === 'creator' ? 'Artist / Creator' : 'Reader / Curator'}
            <span className="text-muted-foreground">· tap to change</span>
          </button>

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
                {errors.confirmPassword && (
                  <p className="text-xs text-destructive">{errors.confirmPassword.message}</p>
                )}
              </div>

              <Button
                type="submit"
                className={cn(
                  'w-full h-11 font-bold gap-2 border-0',
                  userType === 'creator'
                    ? 'bg-teal-500 hover:bg-teal-600 text-white'
                    : 'bg-primary hover:bg-primary/90 text-primary-foreground'
                )}
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
            <Link
              href={`/login${next !== '/onboarding' ? `?next=${encodeURIComponent(next)}` : ''}`}
              className="text-primary hover:underline font-semibold"
            >
              Sign in
            </Link>
          </p>
        </div>
      )}
    </div>
  )
}

export default function SignupPage() {
  return (
    <Suspense fallback={
      <div className="w-full max-w-md space-y-6 animate-pulse">
        <div className="text-center space-y-2">
          <div className="h-8 w-48 bg-muted rounded-xl mx-auto" />
          <div className="h-4 w-56 bg-muted/60 rounded mx-auto" />
        </div>
        <div className="space-y-3">
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-32 bg-muted rounded-2xl" />
          <div className="h-11 bg-muted rounded-xl" />
        </div>
      </div>
    }>
      <SignupFormInner />
    </Suspense>
  )
}