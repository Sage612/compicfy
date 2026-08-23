/**
 * Chapter-number extraction AND rewriting from a reader URL — the
 * technical basis for item #25 ("Auto-Detect Last Read" link sync).
 *
 * user_comic_sources has no linked account or auth token (confirmed via
 * live schema check), so there's no way to query an external platform for
 * a user's actual read progress. What IS available is the URL text itself
 * — most reader sites encode the chapter number directly in the link
 * (mangadex.org/.../chapter-142, site.com/read?ch=142, etc). This parses
 * that number out so the UI can *suggest* a progress update — it never
 * infers "you've read this" from anything except what's already in the
 * link the user pasted.
 *
 * Patterns are deliberately keyword-anchored (require "chapter" or "ch"
 * nearby) rather than "last number in the URL" — a bare trailing number
 * is just as likely to be a volume, a database ID, or a slug fragment,
 * and a wrong silent guess is worse than no suggestion at all.
 *
 * REWRITING (auto-updating a saved source link to the new chapter) is
 * only attempted for a small, explicitly VERIFIED whitelist of domains —
 * confirmed via live research, not assumed:
 *   - webtoons.com: `?title_no=X&episode_no=Y`, episode_no is a plain
 *     sequential integer directly matching the episode/chapter number.
 *     Verified against webtoon-dl and gallery-dl tooling docs, which both
 *     map episode_no 1:1 to chapter/episode number.
 *   - mangadex.org is deliberately EXCLUDED: its chapter URLs are
 *     `/chapter/<uuid>` — a random UUID, not a number — so there's
 *     nothing safe to substitute. Confirmed via MangaDex's own API docs.
 * Domains not on this list still get chapter *extraction* (for the
 * notification text and progress suggestion) but never URL rewriting —
 * safer to leave a link untouched than guess at an unverified site's URL
 * scheme.
 */

const CHAPTER_URL_PATTERNS: RegExp[] = [
  // .../chapter-142, .../chapter_142.5, .../chapter/142
  /chapter[-_/](\d+(?:\.\d+)?)/i,
  // .../ch-142, .../ch_142, .../ch/142  (word boundary avoids matching
  // "search" or "match" etc — requires "ch" as its own path/query segment)
  /(?:^|[-_/?&])ch(?:apter)?[-_=](\d+(?:\.\d+)?)/i,
  // ?chapter=142, &ch=142
  /[?&](?:chapter|ch)=(\d+(?:\.\d+)?)/i,
]

/**
 * Returns the first chapter number found via a keyword-anchored pattern,
 * or null if the URL doesn't clearly encode one. Never guesses from a
 * bare trailing number alone.
 */
export function extractChapterFromUrl(url: string): number | null {
  for (const pattern of CHAPTER_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) {
      const value = parseFloat(match[1])
      if (!Number.isNaN(value)) return value
    }
  }
  return null
}

// ── Rewrite whitelist ──────────────────────────────────────────────────
// Each entry: a domain matcher + a pattern whose capture group is the
// exact substring to replace with the new chapter number. Kept separate
// from CHAPTER_URL_PATTERNS above because "safe to extract from" and
// "safe to blindly substitute into" aren't automatically the same
// guarantee for every possible site — this list is intentionally small
// and only grows when a domain's URL scheme has actually been checked.
interface RewriteRule {
  domain:  string   // hostname suffix match, e.g. 'webtoons.com'
  pattern: RegExp    // must have exactly one capture group: the chapter number
}

const REWRITE_WHITELIST: RewriteRule[] = [
  {
    domain:  'webtoons.com',
    pattern: /(episode_no=)(\d+)/i,
  },
]

/**
 * Attempts to rewrite `url` so it points at `newChapter` instead of
 * whatever chapter it currently encodes. Returns the rewritten URL, or
 * null if the domain isn't on the verified whitelist (or the URL doesn't
 * match that domain's expected pattern) — callers should treat null as
 * "leave the original URL untouched," not as an error.
 */
export function rewriteChapterUrl(url: string, newChapter: number): string | null {
  let hostname: string
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return null
  }

  const rule = REWRITE_WHITELIST.find(r => hostname === r.domain || hostname.endsWith(`.${r.domain}`))
  if (!rule) return null

  if (!rule.pattern.test(url)) return null

  // Whole numbers stay whole (episode_no=142), fractional stays fractional
  // (rare for webtoon-style sites, but keep parity with extraction).
  const replacement = Number.isInteger(newChapter) ? String(newChapter) : String(newChapter)
  return url.replace(rule.pattern, (_match, prefix) => `${prefix}${replacement}`)
}