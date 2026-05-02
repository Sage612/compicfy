import { Suspense } from 'react'
import { SearchPageClient } from '@/components/layout/SearchPageClient'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Search Comics — Compicfy',
  description: 'Search manga, manhwa, manhua and webtoons across Compicfy, MyAnimeList, MangaDex, AniList and MangaUpdates.',
}

interface Props {
  searchParams: Promise<{ q?: string }>
}

export default async function SearchPage({ searchParams }: Props) {
  const { q } = await searchParams
  return (
    <Suspense fallback={null}>
      <SearchPageClient initialQuery={q ?? ''} />
    </Suspense>
  )
}