import { createClient } from '@/lib/supabase/server'
import { NewsManager } from '@/components/admin/NewsManager'
import type { Metadata } from 'next'
export const metadata: Metadata = { title: 'Manage News' }

export default async function AdminNewsPage() {
  const supabase = await createClient()

  const { data } = await supabase
    .from('news')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50)

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">News Management</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Create, edit, and publish news articles
        </p>
      </div>
      <NewsManager initialNews={data ?? []} />
    </div>
  )
}