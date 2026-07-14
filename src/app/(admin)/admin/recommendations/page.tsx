import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { AdminRecommendations } from '@/components/admin/AdminRecommendations'
import type { Metadata } from 'next'

export const metadata: Metadata =  { title: 'Manage Recommendations' }
export default async function AdminRecommendationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: profile } = await (supabase as any)
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const role = (profile?.role === 'admin' ? 'admin' : 'moderator') as 'admin' | 'moderator'

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Approve, reject, feature, and edit community recommendations
        </p>
      </div>
      <AdminRecommendations role={role} />
    </div>
  )
}