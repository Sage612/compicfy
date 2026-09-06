import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { ReleaseRadar } from '@/components/recommendations/ReleaseRadar'
import { isProUser } from '@/lib/access'

export const metadata: Metadata = {
  title: 'Release Radar',
}

export default async function ReleaseRadarPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('is_pro, pro_expires_at, is_patron, patron_expires_at, role')
    .eq('id', user.id)
    .single()

  const isPro = profile ? isProUser(profile as any) : false

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <ReleaseRadar isPro={isPro} />
    </div>
  )
}