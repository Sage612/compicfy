import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportClient } from '@/components/import/ImportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Import Your List' }

export default async function ProImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ImportClient basePath="/pro/reader/dashboard/lists" />
}