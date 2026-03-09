import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminUsers } from '@/components/admin/AdminUsers'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Manage Users' }

export default async function AdminUsersPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user!.id)
    .single()

  // Mods cannot access user management
  if (profile?.role !== 'admin') {
    redirect('/admin')
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users, roles, bans, and appeals
        </p>
      </div>
      <AdminUsers />
    </div>
  )
}