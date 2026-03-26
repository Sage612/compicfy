import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { BillingClient } from '@/components/pro/BillingClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Billing | Compicfy' }

export default async function BillingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, role')
    .eq('id', user.id)
    .single()

  const { data: subscription } = await supabase
    .from('subscriptions')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  return (
    <BillingClient
      profile={profile}
      subscription={subscription}
      email={user.email ?? ''}
    />
  )
}