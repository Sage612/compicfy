import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ExportClient } from '@/components/pro/ExportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Export' }

export default async function ProReaderExportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')
  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight">Export</h1>
        <p className="text-sm text-muted-foreground mt-1">Download your reading lists and data.</p>
      </div>
      <ExportClient />
    </div>
  )
}
