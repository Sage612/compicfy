import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import type { Metadata } from 'next'
import type { Notification } from '@/types/database.types'

export const metadata: Metadata = { title: 'Notifications' }

export default async function ReaderNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Derive profileBase dynamically so follow links never hardcode /reader
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at, user_type')
    .eq('id', user.id)
    .single() as { data: any }

  const isCreator = profile?.user_type === 'creator'
  // profileBase is the route prefix used on public profile pages
  // readers  → /reader/:username
  // creators → /creator/:username  (adjust if your public creator route differs)
  const profileBase = isCreator ? '/creator' : '/reader'

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) console.error('Error fetching notifications:', error)

  const initialNotifications = (data as unknown as Notification[]) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Stay up to date with your activity.</p>
      </div>
      <NotificationsClient
        initialNotifications={initialNotifications}
        profileBase={profileBase}
      />
    </div>
  )
}