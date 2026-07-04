export const PLATFORM_DOMAINS: Record<string, string[]> = {
  'Webtoon':            ['webtoons.com'],
  'Tapas':              ['tapas.io'],
  'Tappytoon':          ['tappytoon.com'],
  'Viz Media':          ['viz.com'],
  'Crunchyroll Manga':  ['crunchyroll.com'],
  'Manta':              ['mantacomics.com'], // VERIFY: domain may differ, please confirm
  'Webcomics':          ['webcomicsapp.com'], // VERIFY: please confirm current domain
  'Lezhin':             ['lezhinus.com', 'lezhin.com'],
  'Mangatoon':          ['mangatoon.mobi'],
  'Pocket Comics':      ['pocketcomics.com'],
  'Toomics':            ['toomics.com'],
  'Toptoon':            ['toptoons.com'], // VERIFY: please confirm current domain
  'DAYcomics':          ['daycomics.co'], // VERIFY: please confirm current domain
  'Mangaplus':          ['mangaplus.shueisha.co.jp'],
  'INKR':               ['inkr.com'],
}

// Flat set of every allowed domain, independent of which platform label
// it's associated with — this is what link validation actually checks against.
export const ALLOWED_LINK_DOMAINS: Set<string> = new Set(
  Object.values(PLATFORM_DOMAINS).flat()
)

export interface LinkValidationResult {
  valid: boolean
  reason?: string
  /** Cleaned URL (protocol enforced, no fragment/tracking cruft) if valid */
  cleanUrl?: string
}

function extractHostname(url: string): string | null {
  try {
    const parsed = new URL(url)
    return parsed.hostname.toLowerCase().replace(/^www\./, '')
  } catch {
    return null
  }
}

/**
 * Validates a single official link URL against the domain whitelist.
 * Used identically on the client (instant feedback) and server (source of truth).
 */
export function validatePlatformLink(rawUrl: string): LinkValidationResult {
  const trimmed = rawUrl.trim()

  if (!trimmed) {
    return { valid: false, reason: 'Link cannot be empty' }
  }

  // Reject anything that isn't a well-formed http(s) URL up front —
  // blocks javascript:, data:, mailto:, etc. before we even check domain.
  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    return { valid: false, reason: 'Not a valid URL' }
  }

  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { valid: false, reason: 'Link must start with http:// or https://' }
  }

  const hostname = extractHostname(trimmed)
  if (!hostname) {
    return { valid: false, reason: 'Not a valid URL' }
  }

  const isAllowed = Array.from(ALLOWED_LINK_DOMAINS).some(
    (domain) => hostname === domain || hostname.endsWith(`.${domain}`)
  )

  if (!isAllowed) {
    return {
      valid: false,
      reason: 'This domain isn\'t a supported reading platform yet. Please use a link from one of the official platforms listed.',
    }
  }

  // Sanitize: force https, strip query string and hash (tracking params,
  // referral codes, etc.) — keep only origin + pathname.
  const cleanUrl = `https://${parsed.hostname}${parsed.pathname}`.replace(/\/+$/, '')

  return { valid: true, cleanUrl }
}

/**
 * Validates the full official_links array against official_platforms.
 * Both arrays are expected to be paired by index (link[i] belongs to platform[i]),
 * matching how the comic detail page already renders them.
 *
 * Returns cleaned links array (empty string for any index with no link provided —
 * a link is optional per-platform) or throws-equivalent via `errors`.
 */
export function validateOfficialLinks(
  platforms: string[],
  links: (string | undefined | null)[]
): { links: string[]; errors: string[] } {
  const errors: string[] = []
  const cleanedLinks: string[] = []

  for (let i = 0; i < platforms.length; i++) {
    const raw = links[i]
    if (!raw || !raw.trim()) {
      cleanedLinks.push('') // no link provided for this platform — allowed, link is optional
      continue
    }

    const result = validatePlatformLink(raw)
    if (!result.valid) {
      errors.push(`Link for "${platforms[i]}": ${result.reason}`)
      cleanedLinks.push('')
    } else {
      cleanedLinks.push(result.cleanUrl!)
    }
  }

  return { links: cleanedLinks, errors }
}