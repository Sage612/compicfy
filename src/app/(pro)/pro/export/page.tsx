import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExportClient } from '@/components/pro/ExportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Export Lists | Pro' }

export default async function ExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
  if (!isPro && profile?.role !== 'admin') redirect('/pricing?reason=pro_required')

  const { data: lists } = await supabase
    .from('reading_lists')
    .select('*, reading_list_items(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return <ExportClient lists={lists ?? []} />
}