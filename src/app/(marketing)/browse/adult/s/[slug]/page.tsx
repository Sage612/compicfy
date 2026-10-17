import { notFound, redirect } from 'next/navigation'
import type { Metadata } from 'next'
import { createClient } from '@/lib/supabase/server'
import { SectionPage } from '@/components/recommendations/SectionPage'
import { SECTION_META, isSectionSlug } from '@/lib/recommendations/browseSections'

interface Props {
  params:       Promise<{ slug: string }>
  searchParams: Promise<{ page?: string; genre?: string }>
}

export async function generateMetadata({ params, searchParams }: Props): Promise<Metadata> {
  const { slug } = await params
  const { genre } = await searchParams
  if (!isSectionSlug(slug)) return { title: '18+ Comics' }
  return { title: `${slug === 'genre' && genre ? genre : SECTION_META[slug].title} · 18+` }
}

export default async function AdultSectionPage({ params, searchParams }: Props) {
  const { slug } = await params
  const sp = await searchParams
  if (!isSectionSlug(slug)) notFound()

  // Same gate as /browse/adult: logged in AND opted in. Anyone else is sent
  // there, where the access screen explains what to do.
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/browse/adult')

  const { data: profile } = await supabase
    .from('profiles')
    .select('adult_content_enabled')
    .eq('id', user.id)
    .single()
  if (!(profile as any)?.adult_content_enabled) redirect('/browse/adult')

  const page = Math.max(parseInt(sp.page ?? '1') || 1, 1)
  return <SectionPage slug={slug} adult page={page} genre={sp.genre} />
}