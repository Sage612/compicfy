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
 *   - vortexscans.org: `/series/{slug}/chapter-N`. Verified by fetching a
 *     live chapter page and confirming its rendered "Prev" link points at
 *     chapter-1 less than the current page (67 ← current 68) — a real,
 *     live increment chain, not a guess from the URL shape alone.
 *   - asurascans.com: `/comics/{slug}-{id}/chapter/N`. Verified the same
 *     way — live "Prev" link confirmed chapter 337 → 336, plus a
 *     "You're all caught up!" marker confirming 337 was the current
 *     latest at verification time.
 *   - qimanga.com: `/series/{id}-{slug}/chapter-N`. Verified via the
 *     series' own chapter listing showing a complete, gapless run
 *     (387–416) with chronological weekly release dates — not just a
 *     plausible-looking number in the URL.
 *   - lezhinus.com: `/en/comic/{slug}/N`. Verified indirectly but
 *     strongly: multiple unrelated titles on the platform ("Behind the
 *     Scenes", "Jinx", "Full Book") were each confirmed to have their
 *     first episode at exactly `/1` — only explicable if N is a
 *     per-series relative sequential position, not a global opaque ID
 *     (which would essentially never coincidentally start at 1 for
 *     three unrelated titles at once). Lezhin is points/paywall-gated
 *     like Tappytoon, so a rewritten link may point at a chapter the
 *     user hasn't unlocked — acceptable, since the alternative (a stale
 *     link to an old chapter) is strictly worse, but worth knowing.
 *
 * mangadex.org is deliberately EXCLUDED: its chapter URLs are
 * `/chapter/<uuid>` — a random UUID, not a number — so there's nothing
 * safe to substitute. Confirmed via MangaDex's own API docs.
 *
 * comix.to and tapas.io were checked and deliberately EXCLUDED, not
 * merely unconsidered: comix.to's chapter URLs are prefixed with a
 * numeric ID that does NOT correlate with chapter order (e.g. chapter 2
 * had a numerically smaller ID than chapter 1 for the same series,
 * confirmed across 7 real chapters of the same title) — there is no
 * chapter number alone to substitute into a predictable position.
 * tapas.io's `/episode/{id}` was confirmed via Tapas' own official Go API
 * client (which requires resolving an opaque per-episode ID from a
 * separate episodes-list call, not incrementing) and third-party tooling
 * showing large, irregular gaps between consecutive real episode IDs
 * (e.g. 2253285 and 2250364 for back-to-back episodes of the same comic).
 *
 * en-hijala.com and kaynscans.com/kaynscan.org were investigated but
 * left OUT for now, not because they're known-unsafe but because
 * verification was inconclusive: en-hijala.com shares vortexscans.org's
 * exact template and URL shape (strong circumstantial signal) but no
 * live Prev/Next chain was directly observed during research; the
 * kaynscans.com URL provided didn't match the domain/path format
 * actually indexed (kaynscan.org, a different path shape entirely),
 * which needs resolving before either can be verified one way or the
 * other. tappytoon.com's numeric chapter IDs also couldn't be confirmed
 * sequential from available research. All four still get chapter
 * *extraction* below, same as any other unverified domain.
 *
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
  // ?...&episode_no=142 (webtoons.com) — keyword-anchored same as the
  // others, just a different keyword. Added alongside the rewrite
  // whitelist entry so extraction and rewriting cover the same domains
  // instead of silently diverging (webtoons.com previously supported
  // rewrite but NOT extraction, since it has no "chapter" keyword at all).
  /[?&]episode_no=(\d+(?:\.\d+)?)/i,
]

// Domain-scoped extraction patterns — deliberately NOT part of
// CHAPTER_URL_PATTERNS above, because a bare trailing number in a URL is
// NOT a safe general-purpose signal (see comix.to/tapas.io in the
// rewrite-whitelist notes: a trailing number is just as likely to be an
// opaque ID as a chapter number). This only fires for domains where the
// bare-trailing-number shape has been specifically verified, mirroring
// how REWRITE_WHITELIST is scoped rather than opening a generic pattern
// that would misfire on unverified sites.
interface DomainExtractionRule {
  domain:  string
  pattern: RegExp // single capture group: the chapter number
}

const DOMAIN_EXTRACTION_WHITELIST: DomainExtractionRule[] = [
  {
    // lezhinus.com: /en/comic/{slug}/{N} — verified via multiple
    // unrelated titles all starting at exactly /1 (see rewrite-whitelist
    // notes above). No "chapter" keyword appears anywhere in the URL, so
    // the generic keyword-anchored patterns above can never match it.
    domain:  'lezhinus.com',
    pattern: /\/comic\/[^/]+\/(\d+)/i,
  },
]

/**
 * Returns the first chapter number found via a keyword-anchored pattern,
 * or (for a small verified set of domains with no chapter keyword at all)
 * a domain-specific positional pattern. Never guesses from a bare
 * trailing number on an unverified domain.
 */
export function extractChapterFromUrl(url: string): number | null {
  for (const pattern of CHAPTER_URL_PATTERNS) {
    const match = url.match(pattern)
    if (match?.[1]) {
      const value = parseFloat(match[1])
      if (!Number.isNaN(value)) return value
    }
  }

  try {
    const hostname = new URL(url).hostname.replace(/^www\./, '')
    const rule = DOMAIN_EXTRACTION_WHITELIST.find(
      r => hostname === r.domain || hostname.endsWith(`.${r.domain}`)
    )
    if (rule) {
      const match = url.match(rule.pattern)
      if (match?.[1]) {
        const value = parseFloat(match[1])
        if (!Number.isNaN(value)) return value
      }
    }
  } catch {
    // Invalid URL — fall through to null, same as the keyword patterns above.
  }

  return null
}

// ── Rewrite whitelist ─────────────────────────────────────────────────
// Each entry: a domain matcher + a pattern whose capture groups are
// (prefix, number) — the prefix is preserved, the number is replaced.
// Kept separate from CHAPTER_URL_PATTERNS above because "safe to extract
// from" and "safe to blindly substitute into" aren't automatically the
// same guarantee for every possible site — this list is intentionally
// small and only grows when a domain's URL scheme has actually been
// checked against real, live pages (see verification notes above).
interface RewriteRule {
  domain:  string   // hostname suffix match, e.g. 'webtoons.com'
  pattern: RegExp    // must have exactly two capture groups: (prefix, number)
}

const REWRITE_WHITELIST: RewriteRule[] = [
  {
    domain:  'webtoons.com',
    pattern: /(episode_no=)(\d+)/i,
  },
  {
    domain:  'vortexscans.org',
    pattern: /(chapter-)(\d+)/i,
  },
  {
    domain:  'asurascans.com',
    pattern: /(chapter\/)(\d+)/i,
  },
  {
    domain:  'qimanga.com',
    pattern: /(chapter-)(\d+)/i,
  },
  {
    domain:  'lezhinus.com',
    // /en/comic/{slug}/{N} — the slug itself may contain digits/hyphens,
    // so this anchors on "/comic/{non-slash-chars}/" as the prefix to
    // avoid accidentally matching a number inside the slug instead of
    // the trailing episode number.
    pattern: /(\/comic\/[^/]+\/)(\d+)/i,
  },
]

/**
 * Domain-only check — is this URL's host on the verified rewrite
 * whitelist at all? Used by the add/edit-source UI to warn the user
 * up front ("this site won't auto-update") before they save, without
 * needing a fake chapter number just to probe rewriteChapterUrl().
 * Returns false for an unparseable URL, same as the other functions
 * treating an invalid URL as "nothing we can do here."
 */
export function isRewriteWhitelisted(url: string): boolean {
  let hostname: string
  try {
    hostname = new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return false
  }
  return REWRITE_WHITELIST.some(r => hostname === r.domain || hostname.endsWith(`.${r.domain}`))
}

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