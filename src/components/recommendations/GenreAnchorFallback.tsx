'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { GENRES, genreSlug } from '@/lib/utils/constants'

interface Props {
  /** Slugs of genres that actually have a rendered section on this page today. */
  availableSlugs: string[]
  /** Base path to redirect to when the hash doesn't match anything, e.g. '/browse' or '/browse/adult'. */
  redirectBase?: string
}


export function GenreAnchorFallback({ availableSlugs, redirectBase = '/browse' }: Props) {
  const router = useRouter()

  useEffect(() => {
    const hash = window.location.hash // e.g. "#genre-slice-of-life"
    if (!hash.startsWith('#genre-')) return

    const slug = hash.replace('#genre-', '')
    if (availableSlugs.includes(slug)) return // section exists, native anchor scroll will handle it

    const genre = GENRES.find(g => genreSlug(g) === slug)
    if (!genre) return // unknown slug, nothing sensible to redirect to

    router.replace(`${redirectBase}?genre=${encodeURIComponent(genre)}`)
  }, [availableSlugs, redirectBase, router])

  return null
}