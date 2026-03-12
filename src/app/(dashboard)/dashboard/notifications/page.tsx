import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import { Bell } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Notifications' }

export default async function NotificationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: notifications } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50)

  await (supabase as any)
    .from('notifications')
    .update({ is_read: true })
    .eq('user_id', user.id)
    .eq('is_read', false)

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Bell size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          {(notifications ?? []).length} notification{(notifications ?? []).length !== 1 ? 's' : ''}
        </p>
      </div>

      <NotificationsClient initialNotifications={notifications ?? []} />
    </div>
  )
}