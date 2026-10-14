import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExportClient } from '@/components/pro/ExportClient'
import { PageShell } from '@/components/dashboard/PageHeader'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Export | Pro' }

export default async function ProReaderExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = await supabase
    .from('reading_lists')
    .select('id, name, description, is_public, created_at, reading_list_items(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <PageShell width="narrow">
      <ExportClient lists={lists ?? []} backHref="/pro/reader/dashboard" isPro />
    </PageShell>
  )
}
