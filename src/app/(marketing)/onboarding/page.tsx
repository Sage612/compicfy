import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { OnboardingFlow } from '@/components/onboarding/OnboardingFlow'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Welcome to Compicfy' }

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('username, display_name, onboarding_completed, favorite_genres')
    .eq('id', user.id)
    .single()

  // Already onboarded — skip
  if ((profile as any)?.onboarding_completed) redirect('/browse')

  return (
    <OnboardingFlow
      userId={user.id}
      username={(profile as any)?.username ?? ''}
      displayName={(profile as any)?.display_name ?? ''}
      initialGenres={(profile as any)?.favorite_genres ?? []}
    />
  )
}