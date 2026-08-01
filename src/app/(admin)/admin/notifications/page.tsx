import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import type { Metadata } from 'next'
import type { Notification } from '@/types/database.types'

export const metadata: Metadata = { title: 'Notifications' }

export default async function AdminNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single() as { data: any }

  if (!profile || !['admin', 'moderator'].includes(profile.role)) {
    redirect('/reader/dashboard')
  }

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) console.error('Error fetching admin notifications:', error)

  const initialNotifications = (data as unknown as Notification[]) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Reports and system activity needing your attention.</p>
      </div>
      <NotificationsClient
        initialNotifications={initialNotifications}
        profileBase="/admin"
        isAdminView
      />
    </div>
  )
}