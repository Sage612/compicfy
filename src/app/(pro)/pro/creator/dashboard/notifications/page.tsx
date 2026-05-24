import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notifications' }

export default async function ProCreatorNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('id, type, title, is_read, created_at, data')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
        <p className="text-sm text-muted-foreground mt-1">Reviews, follows, and activity on your works.</p>
      </div>
      <NotificationsClient initialNotifications={notifications ?? []} />
    </div>
  )
}
