import { createClient } from '@/lib/supabase/server'
import { aggregateSearch } from '@/lib/search/mangaAggregator'

export interface MatchResult {
  matched: boolean
  recommendationId: string | null
  matchedTitle: string | null
  /** true if the title was found on an external source but not in ComPicfy's own DB */
  foundExternally: boolean
  externalCoverUrl: string | null
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().replace(/\s+/g, ' ').trim()
}

function isCloseMatch(a: string, b: string): boolean {
  const na = normalizeTitle(a)
  const nb = normalizeTitle(b)
  if (na === nb) return true
  const strip = (s: string) => s.replace(/[:\-–—'".,!?]/g, '').replace(/\s+/g, ' ').trim()
  return strip(na) === strip(nb)
}

interface RpcCandidate {
  id: string
  title: string
  alternative_titles_flat: string | null
  title_similarity: number
  alt_similarity: number
}

export async function matchToComPicfy(
  supabase: Awaited<ReturnType<typeof createClient>>,
  title: string
): Promise<MatchResult> {
  // Step 1: check ComPicfy's own DB via the trigram-similarity RPC.
  const { data: candidates, error } = await supabase.rpc('match_recommendation_title', {
    search_title: title,
    similarity_threshold: 0.3,
    match_limit: 5,
  })

  if (!error) {
    for (const candidate of (candidates ?? []) as RpcCandidate[]) {
      if (isCloseMatch(title, candidate.title)) {
        return { matched: true, recommendationId: candidate.id, matchedTitle: candidate.title, foundExternally: false, externalCoverUrl: null }
      }
      if (candidate.alternative_titles_flat && isCloseMatch(title, candidate.alternative_titles_flat)) {
        return { matched: true, recommendationId: candidate.id, matchedTitle: candidate.title, foundExternally: false, externalCoverUrl: null }
      }
    }
  }

  try {
    const externalResults = await aggregateSearch(title, 3)
    const externalMatch = externalResults.find((r) => isCloseMatch(title, r.title))
    return {
      matched: false,
      recommendationId: null,
      matchedTitle: null,
      foundExternally: !!externalMatch,
      externalCoverUrl: externalMatch?.coverUrl || null,
    }
  } catch {
    return { matched: false, recommendationId: null, matchedTitle: null, foundExternally: false, externalCoverUrl: null }
  }
}