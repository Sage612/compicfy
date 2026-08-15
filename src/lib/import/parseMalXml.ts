import { XMLParser } from 'fast-xml-parser'

export interface ParsedImportEntry {
  title: string
  malId: number | null
  status: 'reading' | 'plan_to_read' | 'completed' | 'on_hold' | 'dropped'
  progressChapter: number | null
  score: number | null
}

export interface ParseResult {
  entries: ParsedImportEntry[]
  parseErrors: string[]
}

const STATUS_MAP: Record<string, ParsedImportEntry['status']> = {
  'reading':      'reading',
  'completed':    'completed',
  'on-hold':      'on_hold',
  'dropped':      'dropped',
  'plan to read': 'plan_to_read',
}

function mapStatus(raw: unknown): ParsedImportEntry['status'] {
  if (typeof raw !== 'string' || !raw.trim()) return 'plan_to_read'
  const normalized = raw.trim().toLowerCase()
  return STATUS_MAP[normalized] ?? 'plan_to_read'
}

function toPositiveInt(raw: unknown): number | null {
  if (raw === null || raw === undefined) return null
  const n = typeof raw === 'number' ? raw : parseInt(String(raw), 10)
  return Number.isFinite(n) && n > 0 ? n : null
}

function toTitle(raw: unknown): string | null {
  if (typeof raw !== 'string') return null
  const trimmed = raw.trim()
  return trimmed.length > 0 ? trimmed : null
}

const parser = new XMLParser({
  ignoreAttributes: true,
  trimValues: true,
  // MAL exports wrap CDATA around titles/tags — fast-xml-parser unwraps
  // CDATA automatically with default settings, no extra config needed.
})

/**
 * Parses a MAL-format XML export (used directly by MAL, and by AniList's
 * official MAL-compatible export tool).
 */
export function parseMalXml(xmlText: string): ParseResult {
  const parseErrors: string[] = []
  const entries: ParsedImportEntry[] = []

  let parsed: any
  try {
    parsed = parser.parse(xmlText)
  } catch {
    return { entries: [], parseErrors: ['Could not parse file as XML. Make sure the export completed correctly.'] }
  }

  const root = parsed?.myanimelist
  if (!root) {
    return { entries: [], parseErrors: ['File does not look like a MyAnimeList-format export (missing root <myanimelist> element).'] }
  }

  // fast-xml-parser gives a single object (not an array) when there's only
  // one <manga> entry — normalize to an array either way.
  const rawMangaList = root.manga
  const mangaNodes: any[] = Array.isArray(rawMangaList)
    ? rawMangaList
    : rawMangaList
      ? [rawMangaList]
      : []

  if (mangaNodes.length === 0) {
    return {
      entries: [],
      parseErrors: ['No manga entries found. Make sure this is a manga list export, not an anime list export.'],
    }
  }

  for (const node of mangaNodes) {
    const title = toTitle(node.manga_title)
    if (!title) {
      parseErrors.push('Skipped an entry with no title.')
      continue
    }

    entries.push({
      title,
      malId: toPositiveInt(node.manga_mangadb_id),
      status: mapStatus(node.my_status),
      progressChapter: toPositiveInt(node.my_read_chapters),
      score: toPositiveInt(node.my_score),
    })
  }

  return { entries, parseErrors }
}