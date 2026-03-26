import { createClient } from '@/lib/supabase/server'
import { PricingClient } from '@/components/pro/PricingClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Pricing | Compicfy',
  description: 'Upgrade to Compicfy Pro for unlimited recommendations, advanced filters, analytics and more.',
}

export default async function PricingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let profile = null
  if (user) {
    const { data } = await supabase
      .from('profiles')
      .select('is_pro, pro_expires_at, role, recommendation_count_this_month, total_saves')
      .eq('id', user.id)
      .single()
    profile = data
  }

  return <PricingClient user={user} profile={profile} />
}