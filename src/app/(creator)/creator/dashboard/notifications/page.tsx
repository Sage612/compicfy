import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import type { Notification } from '@/components/user/NotificationsClient'
import type { Metadata } from 'next'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

export const metadata: Metadata = { title: 'Notifications' }

export default async function CreatorNotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <PageShell width="narrow">
      <PageHeader
        eyebrow="Inbox"
        title="Notifications"
        subtitle="Reviews, follows, and activity on your works."
        backHref="/creator/dashboard"
        backLabel="Dashboard"
      />
      <NotificationsClient initialNotifications={(notifications as Notification[]) ?? []} />
    </PageShell>
  )
}
