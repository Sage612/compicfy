// src/app/reader/dashboard/import/page.tsx
import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ImportClient } from '@/components/import/ImportClient'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Import Your List · ComPicfy' }

export default async function ImportPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  return <ImportClient basePath="/reader/dashboard/lists" />
}