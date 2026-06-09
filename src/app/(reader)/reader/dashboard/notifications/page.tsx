import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { NotificationsClient } from '@/components/user/NotificationsClient'
import type { Metadata } from 'next'
import type { Notification } from '@/types/database.types'

export const metadata: Metadata = { title: 'Notifications' }

export default async function ReaderNotificationsPage() {
  const supabase = await createClient()
  
  // 1. Authenticate user session
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // 2. Fetch notifications matching clean row constraints and limits
  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(50) // Matches Pro query constraint window for ultra-fast database execution

  if (error) {
    console.error('Error fetching initial notifications on server:', error)
  }

  // 3. Cast the fetched rows directly to the array structure expected by the client deck
  const initialNotifications = (data as unknown as Notification[]) ?? []

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Notifications</h1>
        <p className="text-xs text-muted-foreground mt-0.5">Stay up to date with your activity.</p>
      </div>
      
      {/* 4. Pass the verified structure array straight down into the interactive deck */}
      <NotificationsClient initialNotifications={initialNotifications} />
    </div>
  )
}
