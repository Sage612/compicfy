import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ProAnalyticsClient } from '@/components/pro/ProAnalyticsClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Analytics' }

export default async function ProReaderAnalyticsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="max-w-4xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Analytics</h1>
        <p className="text-sm text-muted-foreground mt-1">Performance data for your recommendations.</p>
      </div>
      <ProAnalyticsClient userId={user.id} />
    </div>
  )
}
