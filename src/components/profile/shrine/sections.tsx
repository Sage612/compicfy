import Link from 'next/link'
import type { ReactNode } from 'react'
import { ArrowRight, BookOpen, ExternalLink, Flame, Globe, Heart, Lock, Sparkles, ThumbsUp } from 'lucide-react'
import { RadarChart, computeArchetypeScores, type RadarPoint } from '../RadarChart'
import { JournalEntryCard } from './JournalEntryCard'
import { proxyCover } from './util'
import type {
  GenreProfile, JournalItem, ObsessedData, QuoteData, SignalsData,
} from '@/lib/profile/getProfileExtras'
import type { PartyMember, ShrinePerson } from '@/lib/profile/getShrineExtras'

/* ── Shared bits ───────────────────────────────────────── */

function Cover({ url, alt }: { url: string | null; alt: string }) {
  return url
    ? <img src={proxyCover(url)} alt={alt} loading="lazy" />
    : <div className="sh-noimg"><BookOpen size={18} /></div>
}

export function Empty({
  title, hint, icon, action,
}: { title: string; hint?: string; icon?: ReactNode; action?: ReactNode }) {
  return (
    <div className="sh-empty">
      {icon ?? <Sparkles size={22} />}
      <p className="sh-empty-title">{title}</p>
      {hint && <p className="sh-empty-hint">{hint}</p>}
      {action}
    </div>
  )
}

/* ── Pulse: currently obsessed ─────────────────────────── */

export function ObsessedSection({ data, streak }: { data: ObsessedData; streak: number }) {
  const total = data.totalChapters
  const pct = total && total > 0 ? Math.min(100, Math.round((data.currentChapter / total) * 100)) : null

  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Currently obsessed</p>
      <Link href={`/comic/${data.comicId}`} className="sh-card sh-obsessed">
        <div className="sh-cover"><Cover url={data.coverUrl} alt={data.title} /></div>
        <div className="sh-obsessed-main">
          <p className="sh-eyebrow">Live chapter</p>
          <h3 className="sh-title sh-display">{data.title}</h3>
          {data.author && <p className="sh-muted">{data.author}</p>}
          <p className="sh-chapter">
            Ch. {data.currentChapter}{total ? <span> / {total}</span> : null}
          </p>
          <div className="sh-bar">
            <i style={{ width: `${pct ?? 100}%`, opacity: pct === null ? 0.35 : 1 }} />
          </div>
          {streak > 0 && (
            <p className="sh-streak"><Flame size={15} /> {streak}-day reading streak</p>
          )}
        </div>
      </Link>
    </section>
  )
}

/* ── Pulse: hall of fame ───────────────────────────────── */

const COUNT_WORDS = ['', 'One', 'Two', 'Three']

interface HallProps {
  items:   { id: string; title: string; author?: string | null; cover_url: string | null }[]
  isOwner: boolean
  canEdit: boolean        // Pro / Patron / Admin
  editor:  ReactNode      // PinnedFavoritesEditor, only passed for owners who can edit
}

export function HallOfFameSection({ items, isOwner, canEdit, editor }: HallProps) {
  if (!isOwner && items.length === 0) return null
  const n = Math.min(items.length, 3)

  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Hall of fame</p>
      <h2 className="sh-h2 sh-display">
        {n > 0 ? `${COUNT_WORDS[n]} masterpiece${n > 1 ? 's' : ''}` : 'Your masterpieces'}
      </h2>

      {n > 0 && (
        <div className="sh-hof">
          {items.slice(0, 3).map((c, i) => (
            <Link key={c.id} href={`/comic/${c.id}`} className="sh-hof-item">
              <div className="sh-hof-cover">
                <Cover url={c.cover_url} alt={c.title} />
                <span className="sh-rank sh-display">0{i + 1}</span>
              </div>
              <p className="sh-hof-title">{c.title}</p>
              {c.author && <p className="sh-hof-author">{c.author}</p>}
            </Link>
          ))}
        </div>
      )}

      {isOwner && canEdit && (
        <details className="sh-edit">
          <summary>{n > 0 ? 'Edit hall of fame' : 'Pin your three favorites'}</summary>
          {editor}
        </details>
      )}

      {isOwner && !canEdit && (
        <Link href="/pricing" className="sh-locked">
          <Lock size={15} /> Pin up to three favorites with Pro
        </Link>
      )}
    </section>
  )
}

/* ── Pulse: pinned moment ──────────────────────────────── */

export function PinnedMomentSection({ quote }: { quote: QuoteData }) {
  const by = [quote.comicTitle, quote.chapterLabel].filter(Boolean).join(' · ')
  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Pinned moment</p>
      <figure className="sh-moment">
        {quote.coverUrl && <img className="sh-moment-bg" src={proxyCover(quote.coverUrl)} alt="" />}
        <div className="sh-moment-shade" />
        <blockquote className="sh-quote sh-display">“{quote.text}”</blockquote>
        <figcaption className="sh-quote-by">
          {by && (quote.comicId
            ? <Link href={`/comic/${quote.comicId}`}>{by}</Link>
            : <span>{by}</span>)}
          {quote.stampCount > 0 && <span className="sh-chip">{quote.stampCount.toLocaleString()} stamps</span>}
        </figcaption>
      </figure>
    </section>
  )
}

/* ── Shrine: taste + signals ───────────────────────────── */

interface TasteProps {
  genreProfile:   GenreProfile | null
  favoriteGenres: string[]
  shareSlot?:     ReactNode
}

export function TasteSection({ genreProfile, favoriteGenres, shareSlot }: TasteProps) {
  let points: RadarPoint[]
  let caption: string
  if (genreProfile) {
    points  = genreProfile.points
    caption = `Share of ${genreProfile.comicCount} comics saved, listed or recommended. A comic can carry several genres.`
  } else {
    points  = computeArchetypeScores(favoriteGenres)
    caption = 'Based on favorite genres. Fills in as more comics are saved and listed.'
  }

  const hasChart = points.length >= 3

  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Comic DNA</p>
      <h2 className="sh-h2 sh-display">Taste breakdown</h2>

      {hasChart ? (
        <>
          <div className="sh-card">
            <div className="sh-radar"><RadarChart points={points} color="var(--sh-accent)" /></div>
          </div>
          <ul className="sh-rows">
            {points.map(p => (
              <li key={p.axis}><span>{p.axis}</span><span>{p.pct}%</span></li>
            ))}
          </ul>
          <p className="sh-caption">{caption}</p>
        </>
      ) : (
        <Empty title="No taste data yet" hint="Save or list a few comics and the breakdown fills in." />
      )}

      {favoriteGenres.length > 0 && (
        <div className="sh-pills">
          {favoriteGenres.map(g => (
            <Link key={g} href={`/browse?genre=${encodeURIComponent(g)}`} className="sh-pill">
              #{g.replace(/\s+/g, '')}
            </Link>
          ))}
        </div>
      )}

      {shareSlot && <div className="sh-share">{shareSlot}</div>}
    </section>
  )
}

function formatHour(h: number): string {
  const hour = ((Math.round(h) % 24) + 24) % 24
  return `${hour % 12 === 0 ? 12 : hour % 12}${hour >= 12 ? 'pm' : 'am'}`
}

function formatSession(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`
}

function readerType(peak: number | null, avg: number | null): string | null {
  if (peak === null) return null
  const marathon = (avg ?? 0) >= 2
  if (peak >= 22 || peak < 4) return marathon ? 'Midnight Marathoner' : 'Midnight Reader'
  if (peak < 11)              return marathon ? 'Dawn Marathoner'     : 'Early Bird'
  if (peak < 17)              return marathon ? 'Daylight Marathoner' : 'Daytime Reader'
  return marathon ? 'Evening Marathoner' : 'Evening Reader'
}

const DROP_TONE = { 'very low': 'is-good', low: 'is-good', moderate: 'is-warn', high: 'is-bad' } as const

export function SignalsSection({ signals }: { signals: SignalsData }) {
  const type = readerType(signals.peakHour, signals.avgSessionHours)
  const rows: { label: string; value: string; tone?: string }[] = []

  if (signals.avgSessionHours !== null) rows.push({ label: 'Avg session', value: formatSession(signals.avgSessionHours) })
  if (signals.peakHour !== null)        rows.push({ label: 'Peak hour',   value: `around ${formatHour(signals.peakHour)}` })
  if (signals.dropRate)                 rows.push({ label: 'Drop rate',   value: `${signals.dropRate.pct}% (${signals.dropRate.label})`, tone: DROP_TONE[signals.dropRate.label] })
  if (signals.totalSessions > 0)        rows.push({ label: 'Sessions logged', value: signals.totalSessions.toLocaleString() })
  if (type)                             rows.push({ label: 'Reader type', value: type, tone: 'is-accent' })

  if (rows.length === 0 && !signals.dedication) return null

  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Reading signals</p>
      <h2 className="sh-h2 sh-display">How they read</h2>
      {rows.length > 0 && (
        <div className="sh-card sh-signals">
          {rows.map(r => (
            <div key={r.label} className="sh-signal">
              <span>{r.label}</span>
              <span className={r.tone}>{r.value}</span>
            </div>
          ))}
        </div>
      )}
      {signals.dedication && (
        <p className="sh-dedicated"><Sparkles size={16} /> Top {signals.dedication.topPct}% most dedicated reader</p>
      )}
    </section>
  )
}

/* ── Party ─────────────────────────────────────────────── */

const RING_COLORS = ['#8c98ab', '#cdb79a', '#8fb1b3']
const MAX_BOND = 20

export function PartySection({ members }: { members: PartyMember[] }) {
  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Character shrine</p>
      <h2 className="sh-h2 sh-display">The party</h2>
      <div className="sh-stack">
        {members.map((m, i) => {
          const img = m.imageUrl ?? m.seriesCover
          const fill = Math.min(100, Math.round((m.bondLevel / MAX_BOND) * 100))
          return (
            <article key={m.id} className="sh-party">
              <div className="sh-portrait" style={{ ['--ring' as string]: RING_COLORS[i % RING_COLORS.length] }}>
                {img
                  ? <img src={proxyCover(img)} alt={m.name} loading="lazy" />
                  : <div className="sh-noimg sh-display" style={{ fontSize: 28 }}>{m.name.slice(0, 1)}</div>}
              </div>
              <div className="sh-party-main">
                <h3 className="sh-party-name">{m.name}</h3>
                {m.seriesTitle && <p className="sh-party-series">{m.seriesTitle}</p>}
                {m.tagline && <p className="sh-party-tag">{m.tagline}</p>}
                <div className="sh-bond"><span>Bond</span><b>Lv. {m.bondLevel}</b></div>
                <div className="sh-bar"><i style={{ width: `${fill}%` }} /></div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}

/* ── Activity ──────────────────────────────────────────── */

const DAY = 86_400_000

function dayLabel(iso: string, nowMs: number): string {
  const diff = Math.floor(nowMs / DAY) - Math.floor(new Date(iso).getTime() / DAY)
  if (diff <= 0) return 'Today'
  if (diff === 1) return 'Yesterday'
  if (diff < 7) return 'This week'
  if (diff < 31) return 'This month'
  return 'Earlier'
}

function agoLabel(iso: string, nowMs: number): string {
  const mins = Math.floor((nowMs - new Date(iso).getTime()) / 60_000)
  if (mins < 1) return 'just now'
  if (mins < 60) return `${mins} min ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `about ${hours} hour${hours === 1 ? '' : 's'} ago`
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days} day${days === 1 ? '' : 's'} ago`
  return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function buildGroups(items: JournalItem[]) {
  const nowMs = Date.now()
  const groups: { label: string; items: (JournalItem & { ago: string })[] }[] = []
  for (const item of items) {
    const label = dayLabel(item.createdAt, nowMs)
    const last = groups[groups.length - 1]
    const row = { ...item, ago: agoLabel(item.createdAt, nowMs) }
    if (last && last.label === label) last.items.push(row)
    else groups.push({ label, items: [row] })
  }
  return groups
}

interface ActivityProps { items: JournalItem[]; isOwner: boolean; username: string }

export function ActivitySection({ items, isOwner, username }: ActivityProps) {
  if (items.length === 0) {
    return (
      <section className="sh-section">
        <Empty
          title="Nothing on the wall yet"
          hint={isOwner ? 'Journal a chapter and your thoughts will live here.' : `@${username} hasn't written any journal entries yet.`}
        />
      </section>
    )
  }

  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Memory wall</p>
      <h2 className="sh-h2 sh-display">Recent activity</h2>
      {buildGroups(items).map(g => (
        <div key={g.label} className="sh-group">
          <p className="sh-eyebrow">{g.label}</p>
          <div className="sh-entries">
            {g.items.map(it => (
              <JournalEntryCard
                key={it.id}
                title={it.comicTitle && it.chapterLabel ? `Logged ${it.chapterLabel} of ${it.comicTitle}` : 'Journaled a session'}
                ago={it.ago}
                content={it.content}
                isSpoiler={it.isSpoiler}
                moodEmoji={it.moodEmoji}
                icon={it.comicTitle && it.chapterLabel ? 'book' : 'pen'}
                comicTitle={it.comicTitle}
                coverUrl={it.coverUrl}
                likeCount={it.likeCount}
                replyCount={it.replyCount}
              />
            ))}
          </div>
        </div>
      ))}
    </section>
  )
}

/* ── Library: recommendations + reading lists ──────────── */

interface LibraryProps {
  isGhost:    boolean
  isOwner:    boolean
  username:   string
  newRecHref: string
  pinnedRec:  any | null
  recs:       any[]
  totalRecs:  number
  lists:      any[]
}

export function LibrarySection({
  isGhost, isOwner, username, newRecHref, pinnedRec, recs, totalRecs, lists,
}: LibraryProps) {
  return (
    <>
      {pinnedRec && (
        <section className="sh-section">
          <p className="sh-eyebrow">Pinned</p>
          <Link href={`/comic/${pinnedRec.id}`} className="sh-card sh-pinned">
            <div className="sh-cover"><Cover url={pinnedRec.cover_url} alt={pinnedRec.title} /></div>
            <div style={{ minWidth: 0 }}>
              <h3 className="sh-title sh-display" style={{ fontSize: 24 }}>{pinnedRec.title}</h3>
              <p className="sh-rec-meta">{pinnedRec.type} · {pinnedRec.status}</p>
              {pinnedRec.description && <p className="sh-desc">{pinnedRec.description}</p>}
            </div>
          </Link>
        </section>
      )}

      <section className="sh-section">
        <p className="sh-eyebrow">{isGhost ? 'Archive' : 'Recommendations'}</p>
        <h2 className="sh-h2 sh-display">{isGhost ? 'Archived picks' : 'Recent picks'}</h2>

        {recs.length > 0 ? (
          <>
            <div className="sh-grid">
              {recs.map(rec => (
                <Link key={rec.id} href={`/comic/${rec.id}`} className="sh-rec">
                  <div className="sh-rec-cover"><Cover url={rec.cover_url} alt={rec.title} /></div>
                  <p className="sh-rec-title">{rec.title}</p>
                  <p className="sh-rec-meta">{[rec.type, rec.status].filter(Boolean).join(' · ')}</p>
                </Link>
              ))}
            </div>
            {totalRecs > recs.length && (
              <Link href={`/profile/${username}/recommendations`} className="sh-more">
                See all {totalRecs} recommendations <ArrowRight size={14} />
              </Link>
            )}
          </>
        ) : (
          <Empty
            icon={<BookOpen size={22} />}
            title={isGhost ? 'The archive is empty' : 'No recommendations yet'}
            hint={
              isGhost ? 'Comics find their way here when their recommenders move on.'
              : isOwner ? 'Share a comic you love and help someone find their next read.'
              : `@${username} hasn't shared any recommendations yet.`
            }
            action={isOwner && !isGhost ? <Link href={newRecHref}>Submit your first rec →</Link> : undefined}
          />
        )}
      </section>

      {!isGhost && lists.length > 0 && (
        <section className="sh-section">
          <p className="sh-eyebrow">Reading lists</p>
          <h2 className="sh-h2 sh-display">Public lists</h2>
          <div className="sh-grid">
            {lists.map(list => {
              const cover = list._cover_urls?.[0] ?? null
              return (
                <Link key={list.id} href={`/lists/${list.id}`} className="sh-list">
                  {cover && <img src={proxyCover(cover)} alt="" loading="lazy" />}
                  <div className="sh-list-text">
                    <p className="sh-list-name">{list.name}</p>
                    <p className="sh-list-count">{list.item_count} {list.item_count === 1 ? 'comic' : 'comics'}</p>
                  </div>
                </Link>
              )
            })}
          </div>
        </section>
      )}
    </>
  )
}

/* ── Other shrines ─────────────────────────────────────── */

export function OtherShrinesSection({ people }: { people: ShrinePerson[] }) {
  if (people.length === 0) return null
  return (
    <section className="sh-section" style={{ marginBottom: 24 }}>
      <p className="sh-eyebrow">Other shrines</p>
      <h2 className="sh-h2 sh-display">Walk the hall</h2>
      <div className="sh-people">
        {people.map(p => (
          <Link key={p.id} href={p.href} className="sh-person">
            <div className="sh-person-av">
              {p.avatarUrl
                ? <img src={p.avatarUrl} alt="" loading="lazy" />
                : p.displayName.slice(0, 1).toUpperCase()}
            </div>
            <div style={{ minWidth: 0 }}>
              <p className="sh-person-name">{p.displayName}</p>
              <p className="sh-person-sub">@{p.username}</p>
            </div>
          </Link>
        ))}
      </div>
    </section>
  )
}

/* ── Creator: works + about ────────────────────────────── */

interface CreatorWorksProps {
  works:      any[]
  isOwner:    boolean
  username:   string
  newRecHref: string
}

export function CreatorWorksSection({ works, isOwner, username, newRecHref }: CreatorWorksProps) {
  return (
    <section className="sh-section">
      <p className="sh-eyebrow">Published</p>
      <h2 className="sh-h2 sh-display">Works</h2>

      {works.length > 0 ? (
        <div className="sh-grid">
          {works.map(w => (
            <Link key={w.id} href={`/comic/${w.id}`} className="sh-rec">
              <div className="sh-rec-cover"><Cover url={w.cover_url} alt={w.title} /></div>
              <p className="sh-rec-title">{w.title}</p>
              <p className="sh-rec-meta">
                {[w.type, w.status].filter(Boolean).join(' · ')}
                {(w.upvotes ?? 0) > 0 && (
                  <>{w.type || w.status ? ' · ' : ''}<ThumbsUp size={11} style={{ display: 'inline', verticalAlign: '-1px' }} /> {w.upvotes}</>
                )}
              </p>
            </Link>
          ))}
        </div>
      ) : (
        <Empty
          icon={<BookOpen size={22} />}
          title="No works published yet"
          hint={isOwner ? 'Submit your first comic to let the community discover your work.' : `@${username} hasn't published any works yet.`}
          action={isOwner ? <Link href={newRecHref}>Submit your first work →</Link> : undefined}
        />
      )}
    </section>
  )
}

export interface CreatorLink { label: string; sub: string; href: string; kind: 'comic' | 'patreon' | 'kickstarter' | 'site' }

interface CreatorAboutProps {
  genres:   string[]
  links:    CreatorLink[]
  isOwner:  boolean
  username: string
}

export function CreatorAboutSection({ genres, links, isOwner, username }: CreatorAboutProps) {
  if (genres.length === 0 && links.length === 0) {
    return (
      <section className="sh-section">
        <Empty
          icon={<Heart size={22} />}
          title="Nothing here yet"
          hint={isOwner ? 'Add links and a bio in settings to tell readers about yourself.' : `@${username} hasn't added anything here yet.`}
        />
      </section>
    )
  }

  return (
    <>
      {genres.length > 0 && (
        <section className="sh-section">
          <p className="sh-eyebrow">Their world</p>
          <h2 className="sh-h2 sh-display">Genres they create in</h2>
          <div className="sh-pills" style={{ marginTop: 0 }}>
            {genres.map(g => (
              <Link key={g} href={`/browse?genre=${encodeURIComponent(g)}`} className="sh-pill">
                #{g.replace(/\s+/g, '')}
              </Link>
            ))}
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section className="sh-section">
          <p className="sh-eyebrow">Elsewhere</p>
          <h2 className="sh-h2 sh-display">Support their work</h2>
          <div className="sh-linkrows">
            {links.map(l => (
              <a key={l.kind} href={l.href} target="_blank" rel="noopener noreferrer" className="sh-linkrow">
                <span className="sh-ico">{l.kind === 'site' ? <Globe size={17} /> : l.kind === 'comic' ? <BookOpen size={17} /> : <Heart size={17} />}</span>
                <div className="sh-linkrow-main">
                  <p className="sh-linkrow-title">{l.label}</p>
                  <p className="sh-linkrow-sub">{l.sub}</p>
                </div>
                <ExternalLink size={15} />
              </a>
            ))}
          </div>
        </section>
      )}
    </>
  )
}