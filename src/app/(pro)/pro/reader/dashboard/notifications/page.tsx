import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import { Bell } from 'lucide-react'
import type { Metadata } from 'next'
import type { Notification } from '@/types/database.types'

export const metadata: Metadata = { title: 'Notifications | Pro' }

export default async function ProReaderNotificationsPage() {
  const supabase = await createClient()
  
  // 1. Authenticate user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch notifications cleanly matching row constraints
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) // Reasonable layout limit window for ultra fast loadtimes

  if (error) {
    console.error('Error fetching initial notifications on server:', error)
  }

  // 3. Cast the fetched rows directly to the array structure expected by the client deck
  const initialNotifications = (data as unknown as Notification[]) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header Matrix Layout Block */}
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center shrink-0">
          <Bell size={20} className="text-blue-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
          <p className="text-sm text-muted-foreground">Your activity and alerts</p>
        </div>
      </div>

      {/* 4. Pass the verified structure array straight down into the interactive deck */}
      <NotificationsClient initialNotifications={initialNotifications} />
    </div>
  )
}
