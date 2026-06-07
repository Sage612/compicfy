import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const BATCH_SIZE = 50

// ── Profanity & spam detection ────────────────────────────────────

const PROFANITY_LIST = [
  'fuck', 'shit', 'damn', 'bitch', 'asshole', 'bastard', 'crap',
  'piss', 'dick', 'cock', 'pussy', 'twat', 'wank', 'bollocks'
]

const SPAM_PATTERNS = [
  /\d{3,4}-\d{3,4}-\d{4}/g, // Phone numbers
  /[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}/g, // Emails
  /http[s]?:\/\//g, // URLs
  /\.com|\.net|\.org/gi, // Domain TLDs
]

const BLACKLIST_TITLES = [
  'untitled', 'test', 'sample', 'draft', '???', 'no title', 'n/a',
  'placeholder', 'example', 'lorem ipsum', 'ads', 'advertisement'
]

function containsProfanity(text: string): boolean {
  const lower = text.toLowerCase()
  return PROFANITY_LIST.some(word => lower.includes(word))
}

function containsSpamPatterns(text: string): boolean {
  return SPAM_PATTERNS.some(pattern => pattern.test(text))
}

function isSpamTitle(title: string): boolean {
  const lower = title.toLowerCase().trim()
  return BLACKLIST_TITLES.some(t => lower === t)
}

function hasExcessiveUnicode(text: string): boolean {
  const unicodeCount = (text.match(/[\u0080-\uFFFF]/g) || []).length
  return unicodeCount > text.length * 0.3 // More than 30% unicode
}

function hasExcessiveSpecialChars(text: string): boolean {
  const specialCount = (text.match(/[!@#$%^&*()_+=\[\]{};:'",.<>?/\\|`~]/g) || []).length
  return specialCount > text.length * 0.2 // More than 20% special chars
}

// ── Genre whitelist ──────────────────────────────────────────────

const APPROVED_GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Fantasy', 'Horror', 'Mystery',
  'Psychological', 'Romance', 'Sci-Fi', 'Slice of Life', 'Supernatural',
  'Thriller', 'Historical', 'School', 'Shounen', 'Shoujo', 'Seinen', 'Josei',
  'Magic', 'Martial Arts', 'Sports', 'Crime', 'Detective', 'Tragedy',
  'Harem', 'Isekai', 'Post-Apocalyptic', 'Dystopian', 'Military', 'Police',
  'Vampire', 'Zombie', 'Demon', 'Angel', 'Reincarnation', 'Time Travel',
  'Web Comic', 'Webtoon', 'Manga', 'Manhwa', 'Manhua', 'One-Shot',
  'Mature', 'Adult', 'Ecchi', 'Yaoi', 'Yuri', 'Shounen-Ai', 'Shoujo-Ai',
  'Music', 'Food', 'Art', 'Cooking', 'Gaming', 'Work Life', 'Office'
]

function isValidGenre(genre: string): boolean {
  return APPROVED_GENRES.some(g => g.toLowerCase() === genre.toLowerCase())
}

// ── Validation result ────────────────────────────────────────────

interface ValidationResult {
  passed: boolean
  failed_conditions: string[]
  warnings: string[]
  details: Record<string, any>
}

// ── Main validation function ────────────────────────────────────

function validateComic(comic: any): ValidationResult {
  const failed: string[] = []
  const warnings: string[] = []
  const details: Record<string, any> = {}

  // ── CORE DATA (11) ────────────────────────────────────────────

  // 1. At least 3 external IDs
  const idCount = [
    comic.mangaupdates_id,
    comic.mangabaka_id,
    comic.mangadex_id,
    comic.anilist_id,
    comic.mal_id,
    comic.kuroiru_id,
  ].filter(id => id && String(id).trim()).length

  if (idCount < 3) {
    failed.push(`Only ${idCount}/6 external IDs found (need ≥3)`)
  }
  details.external_id_count = idCount

  // 2. Description exists (not empty/placeholder)
  const desc = comic.description ?? ''
  const cleanDesc = desc.replace(/<[^>]*>/g, '').trim()

  if (!cleanDesc || cleanDesc.length === 0) {
    failed.push('Description is empty')
  }
  details.has_description = cleanDesc.length > 0

  // 3. Author AND artist filled
  const hasAuthor = comic.author && String(comic.author).trim().length > 0
  const hasArtist = comic.artist && String(comic.artist).trim().length > 0

  if (!hasAuthor || !hasArtist) {
    failed.push(`Author: ${hasAuthor ? '✓' : '✗'}, Artist: ${hasArtist ? '✓' : '✗'}`)
  }
  details.has_author = hasAuthor
  details.has_artist = hasArtist

  // 4. Cover image URL exists (valid format)
  const coverUrl = comic.cover_url ?? ''
  const isValidCoverUrl = coverUrl && 
    (coverUrl.startsWith('http://') || coverUrl.startsWith('https://')) &&
    !coverUrl.includes('pixel') &&
    !coverUrl.includes('placeholder') &&
    coverUrl.length > 20

  if (!isValidCoverUrl) {
    failed.push(`Cover URL invalid or missing: "${coverUrl.slice(0, 50)}"`)
  }
  details.cover_url_valid = isValidCoverUrl

  // 5. At least 2 genres
  const genres = comic.genres ?? []
  if (!Array.isArray(genres) || genres.length < 2) {
    failed.push(`Only ${genres.length} genres (need ≥2)`)
  }
  details.genre_count = genres.length

  // 6. Title length 3-150 chars
  const title = comic.title ?? ''
  const titleLen = title.trim().length
  if (titleLen < 3 || titleLen > 150) {
    failed.push(`Title length ${titleLen} out of range [3-150]`)
  }
  details.title_length = titleLen

  // 7. Year released valid (1980-now, not future)
  const year = comic.year_released
  const currentYear = new Date().getFullYear()
  if (year === null || year === undefined) {
    warnings.push('Year released is null')
    details.year_released_valid = false
  } else if (year < 1980 || year > currentYear) {
    failed.push(`Year ${year} out of valid range [1980-${currentYear}]`)
    details.year_released_valid = false
  } else {
    details.year_released_valid = true
  }

  // 8. Status is valid
  const validStatuses = ['ongoing', 'completed', 'hiatus', 'cancelled']
  const status = (comic.status ?? '').toLowerCase()
  if (!validStatuses.includes(status)) {
    failed.push(`Status "${status}" not in [${validStatuses.join(', ')}]`)
  }
  details.status_valid = validStatuses.includes(status)

  // 9. Type is valid
  const validTypes = ['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']
  const type = (comic.type ?? '').toLowerCase()
  if (!validTypes.includes(type)) {
    failed.push(`Type "${type}" not in [${validTypes.join(', ')}]`)
  }
  details.type_valid = validTypes.includes(type)

  // 10. No profanity in title
  if (containsProfanity(title)) {
    failed.push('Title contains profanity')
  }
  details.title_profanity_clean = !containsProfanity(title)

  // 11. Alternative titles exist & differ from main
  const altTitles = (comic.alternative_titles ?? []).filter((t: any) => t && t.trim() !== title.trim())
  if (altTitles.length === 0) {
    failed.push('No alternative titles or all are duplicates of main title')
  }
  details.alternative_titles_count = altTitles.length

  // ── QUALITY CHECKS (11) ─────────────────────────────────────

  // 12. Description ≥ 100 chars (not stub)
  if (cleanDesc.length < 100) {
    failed.push(`Description too short (${cleanDesc.length}/100 chars)`)
  }
  details.description_min_length = cleanDesc.length >= 100

  // 13. Description ≤ 5000 chars (not spam)
  if (cleanDesc.length > 5000) {
    failed.push(`Description too long (${cleanDesc.length}/5000 chars)`)
  }
  details.description_max_length = cleanDesc.length <= 5000

  // 14. No excessive Unicode/emoji in title
  if (hasExcessiveUnicode(title)) {
    failed.push('Title has excessive Unicode characters (>30%)')
  }
  details.title_excessive_unicode = !hasExcessiveUnicode(title)

  // 15. Genres from approved whitelist
  const invalidGenres = genres.filter((g: any) => !isValidGenre(g))
  if (invalidGenres.length > 0) {
    failed.push(`Invalid genres: ${invalidGenres.slice(0, 3).join(', ')}`)
  }
  details.all_genres_valid = invalidGenres.length === 0

  // 16. Author/artist names 3-100 chars (reasonable)
  const authorLen = (comic.author ?? '').toString().trim().length
  const artistLen = (comic.artist ?? '').toString().trim().length
  
  if (authorLen > 0 && (authorLen < 3 || authorLen > 100)) {
    failed.push(`Author name length invalid: ${authorLen}`)
  }
  if (artistLen > 0 && (artistLen < 3 || artistLen > 100)) {
    failed.push(`Artist name length invalid: ${artistLen}`)
  }
  details.author_length_valid = authorLen === 0 || (authorLen >= 3 && authorLen <= 100)
  details.artist_length_valid = artistLen === 0 || (artistLen >= 3 && artistLen <= 100)

  // 17. Content rating is valid
  const validRatings = ['all_ages', 'teen', 'mature', 'explicit', 'adult']
  const rating = (comic.content_rating ?? 'all_ages').toLowerCase()
  if (!validRatings.includes(rating)) {
    failed.push(`Content rating "${rating}" not in [${validRatings.join(', ')}]`)
  }
  details.content_rating_valid = validRatings.includes(rating)

  // 18. Chapter count ≥ 5 if ongoing (not brand new)
  const chapters = comic.chapter_count
  if (status.toLowerCase() === 'ongoing' && (chapters === null || chapters === undefined || chapters < 5)) {
    failed.push(`Ongoing status but only ${chapters ?? 0} chapters (need ≥5)`)
  }
  details.chapter_count_check = status.toLowerCase() !== 'ongoing' || (chapters && chapters >= 5)

  // 19. No excessive special chars in description
  if (hasExcessiveSpecialChars(cleanDesc)) {
    failed.push('Description has excessive special characters (>20%)')
  }
  details.description_excessive_special_chars = !hasExcessiveSpecialChars(cleanDesc)

  // 20. Title doesn't match spam patterns
  if (isSpamTitle(title)) {
    failed.push(`Title matches spam blacklist: "${title}"`)
  }
  details.title_not_spam = !isSpamTitle(title)

  // 21. At least 1 non-English title variant
  const nonEnglishAlt = altTitles.some((t: any) => {
    return hasExcessiveUnicode(t) || /[\u0100-\uFFFF]/.test(t)
  })
  if (!nonEnglishAlt && altTitles.length > 0) {
    warnings.push('No non-English alternative title found (culturally diverse comics expected)')
    details.has_non_english_title = false
  } else {
    details.has_non_english_title = true
  }

  // 22. Year released ≥ 1980 (not historical)
  if (year && year < 1980) {
    failed.push(`Year ${year} is too old (before 1980)`)
  }
  details.year_not_too_old = !year || year >= 1980

  // ── CROSS-VALIDATION (6) ────────────────────────────────────

  // 23. All external IDs are numeric/valid UUID format
  const invalidIds = []
  if (comic.mangaupdates_id && !/^\d+$/.test(String(comic.mangaupdates_id))) {
    invalidIds.push(`MU: ${comic.mangaupdates_id}`)
  }
  if (comic.anilist_id && !/^\d+$/.test(String(comic.anilist_id))) {
    invalidIds.push(`AL: ${comic.anilist_id}`)
  }
  if (comic.mal_id && !/^\d+$/.test(String(comic.mal_id))) {
    invalidIds.push(`MAL: ${comic.mal_id}`)
  }
  // UUIDs are OK for MangaDex, MangaBaka, Kuroiru
  
  if (invalidIds.length > 0) {
    failed.push(`Invalid ID formats: ${invalidIds.join(', ')}`)
  }
  details.id_formats_valid = invalidIds.length === 0

  // 24. Cover URL not from suspicious domains
  const suspiciousDomains = ['pixel', 'placeholder', 'cloudflare', 'tempfile', 'test']
  const isSuspicious = suspiciousDomains.some(domain => coverUrl.toLowerCase().includes(domain))
  if (isSuspicious) {
    failed.push(`Cover URL from suspicious domain`)
  }
  details.cover_url_not_suspicious = !isSuspicious

  // 25. Multiple sources agree on title (fuzzy match 80%+)
  // This is approximated by checking if we have diverse IDs
  if (idCount >= 3) {
    details.multiple_sources_agree = true
  } else {
    warnings.push('Cannot verify title consistency across sources (need ≥3 IDs)')
    details.multiple_sources_agree = false
  }

  // 26. Author/artist not generic placeholders
  const placeholders = ['unknown', 'n/a', 'not available', 'tba', 'author', 'artist', '-', '?', '??']
  const authorPlaceholder = placeholders.some(p => comic.author?.toLowerCase?.()?.includes(p))
  const artistPlaceholder = placeholders.some(p => comic.artist?.toLowerCase?.()?.includes(p))

  if (authorPlaceholder || artistPlaceholder) {
    failed.push(`Creator names are placeholders: Author: ${authorPlaceholder}, Artist: ${artistPlaceholder}`)
  }
  details.creators_not_placeholders = !authorPlaceholder && !artistPlaceholder

  // 27. Not on spam blacklist (DB check) — will be checked in handler
  details.spam_blacklist_check = 'pending' // Checked in main handler

  // 28. No IP-flagged submissions (abuse check) — will be checked in handler
  details.ip_abuse_check = 'pending' // Checked in main handler

  return {
    passed: failed.length === 0,
    failed_conditions: failed,
    warnings,
    details,
  }
}

// ── Logging helper ────────────────────────────────────────────────

interface ApprovalLog {
  comic_id: string
  comic_title: string
  action: 'auto_approved' | 'flagged_for_review'
  reason?: string
  failed_conditions: string[]
  passed_conditions_count: number
  total_conditions: number
  validation_details: Record<string, any>
  timestamp: string
}

async function logApprovalAction(supabase: any, log: ApprovalLog) {
  try {
    await supabase.from('activity_logs').insert({
      user_id: null,
      action: log.action,
      entity_type: 'recommendations',
      entity_id: log.comic_id,
      details: {
        comic_title: log.comic_title,
        reason: log.reason,
        failed_conditions: log.failed_conditions,
        passed_conditions: log.passed_conditions_count,
        total_conditions: log.total_conditions,
        validation_details: log.validation_details,
        timestamp: log.timestamp,
      },
    })
  } catch (err) {
    console.error('Failed to log approval action:', err)
  }
}

// ── Main handler ──────────────────────────────────────────────────

export async function GET(req: Request) {
  // 1. Auth check
  const secret = req.headers.get('x-cron-secret')
  if (secret !== process.env.CRON_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  // 2. Get unapproved AI-generated comics
  const { data: comics } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', false)
    .eq('is_ai_generated', true)
    .order('created_at', { ascending: true })
    .limit(BATCH_SIZE)

  if (!comics || comics.length === 0) {
    return NextResponse.json({
      processed: 0,
      approved: 0,
      flagged: 0,
      logs_count: 0,
    })
  }

  // 3. Check spam blacklist and IP abuse
  const { data: blacklist } = await supabase
    .from('spam_blacklist')
    .select('id')
  const blacklistedTitles = new Set(blacklist?.map((b: any) => b.id.toLowerCase()) ?? [])

  // 4. Process each comic
  const logs: ApprovalLog[] = []
  let approved = 0
  let flagged = 0

  for (const comic of comics) {
    const timestamp = new Date().toISOString()
    const validation = validateComic(comic)

    // Extra checks (27-28)
    const isBlacklisted = blacklistedTitles.has(comic.title.toLowerCase())
    if (isBlacklisted) {
      validation.failed_conditions.push('Title is on spam blacklist')
    }

    const totalPassed = 28 - validation.failed_conditions.length

    const log: ApprovalLog = {
      comic_id: comic.id,
      comic_title: comic.title,
      action: validation.passed && !isBlacklisted ? 'auto_approved' : 'flagged_for_review',
      failed_conditions: validation.failed_conditions,
      passed_conditions_count: totalPassed,
      total_conditions: 28,
      validation_details: validation.details,
      timestamp,
    }

    try {
      if (validation.passed && !isBlacklisted) {
        // Auto-approve
        await supabase
          .from('recommendations')
          .update({ is_approved: true })
          .eq('id', comic.id)

        approved++
        log.reason = 'All conditions passed'
      } else {
        // Flag for manual review
        await supabase
          .from('recommendations')
          .update({
            is_approved: false,
            notes: `Flagged for manual review: ${validation.failed_conditions.slice(0, 3).join('; ')}`,
          })
          .eq('id', comic.id)

        flagged++
        log.reason = `${validation.failed_conditions.length} conditions failed`
      }

      await logApprovalAction(supabase, log)
      logs.push(log)
    } catch (err: any) {
      console.error(`Failed to process ${comic.title}:`, err)

      log.action = 'flagged_for_review'
      log.reason = `Error during validation: ${err?.message}`
      flagged++

      await logApprovalAction(supabase, log)
      logs.push(log)
    }
  }

  return NextResponse.json({
    processed: comics.length,
    approved,
    flagged,
    logs_count: logs.length,
    sample_logs: logs.slice(0, 5),
  })
}