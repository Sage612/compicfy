import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ReadingListsClient } from '@/components/user/ReadingListsClient'
import { BookMarked } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Reading Lists | Pro' }

export default async function ProReaderListsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const { data: lists } = await supabase
    .from('reading_lists')
    .select('id, name, description, is_public, created_at, reading_list_items(count)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-teal-500/10 flex items-center justify-center shrink-0">
          <BookMarked size={20} className="text-teal-500" />
        </div>
        <div>
          <h1 className="text-2xl font-black tracking-tight">Reading Lists</h1>
          <p className="text-sm text-muted-foreground">Unlimited lists on Pro</p>
        </div>
      </div>
      <ReadingListsClient
        initialLists={lists ?? []}
        basePath="/pro/reader/dashboard/lists"
        hideHeader
      />
    </div>
  )
}