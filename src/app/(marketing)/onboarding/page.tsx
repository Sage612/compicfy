import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Welcome to Compicfy' }

interface Props {
  searchParams: Promise<{ next?: string }>
}

export default async function OnboardingPage({ searchParams }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, onboarding_completed, favorite_genres')
    .eq('id', user.id)
    .single()

  // Already onboarded — skip straight to next or browse
  if ((profile as any)?.onboarding_completed) {
    const { next } = await searchParams
    redirect(next ?? '/browse')
  }

  const { next } = await searchParams

  return (
    <OnboardingFlow
      userId={user.id}
      username={(profile as any)?.username ?? ''}
      displayName={(profile as any)?.display_name ?? ''}
      initialGenres={(profile as any)?.favorite_genres ?? []}
      next={next ?? '/browse'}
    />
  )
}