import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminLogs } from '@/components/admin/AdminLogs'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Activity Logs' }

export default async function AdminLogsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Mods cannot access activity logs
  if (profile?.role !== 'admin') {
    redirect('/admin')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Activity Logs</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Full audit trail of all admin actions
        </p>
      </div>
      <AdminLogs />
    </div>
  )
}