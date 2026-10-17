import Link from 'next/link'
import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { PageHeader } from '@/components/dashboard/PageHeader'
import {
  SECTION_META, SECTION_PAGE_SIZE, fetchSection, type SectionSlug,
} from '@/lib/recommendations/browseSections'

interface Props {
  slug:   SectionSlug
  adult:  boolean
  page:   number
  genre?: string
}

function pageHref(base: string, slug: SectionSlug, genre: string | undefined, page: number) {
  const p = new URLSearchParams()
  if (genre) p.set('genre', genre)
  if (page > 1) p.set('page', String(page))
  const qs = p.toString()
  return `${base}/s/${slug}${qs ? `?${qs}` : ''}`
}

/**
 * The single page every "See all" link lands on: one dedicated, paginated
 * grid per section, for both the all-ages and the 18+ browse.
 */
export async function SectionPage({ slug, adult, page, genre }: Props) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const result = await fetchSection(supabase, slug, { adult, page, userId: user?.id ?? null, genre })
  if (!result) notFound()

  const { items, total } = result
  const base       = adult ? '/browse/adult' : '/browse'
  const meta       = SECTION_META[slug]
  const title      = slug === 'genre' && genre ? genre : meta.title
  const totalPages = Math.max(1, Math.ceil(total / SECTION_PAGE_SIZE))

  const subtitle = [meta.blurb, `${total} comic${total !== 1 ? 's' : ''}`].filter(Boolean).join(' · ')

  return (
    <div className="max-w-7xl mx-auto px-4 py-8 space-y-8">
      <PageHeader
        eyebrow={adult ? 'Browse · 18+' : 'Browse'}
        title={title}
        subtitle={subtitle}
        backHref={base}
        backLabel={adult ? 'All 18+ comics' : 'Browse'}
      />

      {items.length === 0 ? (
        <div className="rounded-xl border border-dashed border-border bg-card px-6 py-16 text-center">
          <p className="font-dashboard-serif text-xl text-foreground">Nothing here yet</p>
          <p className="text-sm text-muted-foreground mt-2">Check back soon, or browse everything.</p>
          <Link
            href={base}
            className="inline-block mt-4 text-sm text-foreground underline underline-offset-4 decoration-border hover:decoration-foreground transition-colors"
          >
            Back to browse
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-x-3 gap-y-6">
          {items.map(rec => <ComicCard key={rec.id} recommendation={rec} showGenres />)}
        </div>
      )}

      {totalPages > 1 && (
        <nav className="flex items-center justify-between gap-4 border-t border-border/60 pt-5" aria-label="Pagination">
          {page > 1 ? (
            <Link
              href={pageHref(base, slug, genre, page - 1)}
              className="h-9 px-4 rounded-full border border-border text-sm text-foreground hover:border-foreground/50 transition-colors inline-flex items-center"
            >
              Previous
            </Link>
          ) : <span className="h-9 px-4" />}

          <p className="text-xs text-muted-foreground tabular-nums">
            Page {page} of {totalPages}
          </p>

          {page < totalPages ? (
            <Link
              href={pageHref(base, slug, genre, page + 1)}
              className="h-9 px-4 rounded-full border border-border text-sm text-foreground hover:border-foreground/50 transition-colors inline-flex items-center"
            >
              Next
            </Link>
          ) : <span className="h-9 px-4" />}
        </nav>
      )}
    </div>
  )
}