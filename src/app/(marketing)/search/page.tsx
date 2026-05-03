import { Suspense } from 'react'
import { SearchPageClient } from '@/components/layout/SearchPageClient'
import { createClient } from '@/lib/supabase/server'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Comics Compicfy',
  description: 'Search manga, manhwa, manhua and webtoons across Compicfy, MyAnimeList, MangaDex, AniList and MangaUpdates.',
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  let isPro = false
  if (user) {
    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()

    isPro = profile
      ? ['admin', 'moderator'].includes(profile.role) ||
        (profile.is_pro &&
          (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
      : false
  }

  return (
    <Suspense fallback={null}>
      <SearchPageClient initialQuery={q ?? ''} isPro={isPro} />
    </Suspense>
  )
}