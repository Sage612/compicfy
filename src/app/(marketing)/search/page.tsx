import { createClient } from '@/lib/supabase/server'
import { SearchPageClient } from '@/components/layout/SearchPageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search · ComPicfy',
  description: 'Search manga, manhwa, manhua and webtoons across ComPicfy and external databases.',
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q }    = await searchParams
  const supabase = await createClient()

  const { data: { user } } = await supabase.auth.getUser()

  let isPro      = false
  let isLoggedIn = !!user

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, pro_expires_at, role')
      .eq('id', user.id)
      .single() as { data: any }

    isPro =
      profile?.role === 'admin' ||
      (profile?.is_pro &&
        (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  }

  return (
    <SearchPageClient
      initialQuery={q ?? ''}
      isPro={isPro}
      isLoggedIn={isLoggedIn}
    />
  )
}