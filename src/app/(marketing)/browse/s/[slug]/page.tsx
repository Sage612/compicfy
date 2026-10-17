import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { SectionPage } from '@/components/recommendations/SectionPage'
import { SECTION_META, isSectionSlug } from '@/lib/recommendations/browseSections'

interface Props {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; genre?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { genre } = await searchParams
  if (!isSectionSlug(slug)) return { title: 'Browse' }
  return { title: slug === 'genre' && genre ? genre : SECTION_META[slug].title }
}

export default async function BrowseSectionPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  if (!isSectionSlug(slug)) notFound()

  const page = Math.max(parseInt(sp.page ?? '1') || 1, 1)
  return <SectionPage slug={slug} adult={false} page={page} genre={sp.genre} />
}