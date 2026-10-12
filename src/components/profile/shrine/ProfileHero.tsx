import Link from 'next/link'
import { BookOpen, CalendarDays, Flame, Globe, Moon, Palette } from 'lucide-react'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { FollowButton } from '@/components/user/FollowButton'
import { formatDate } from '@/lib/utils/format'
import { compact, proxyCover } from './util'

export interface HeroMatch {
  similarityPct:  number
  confidenceTier: string
  sharedGenres:   string[]
}

interface Props {
  profile: {
    id:                   string
    username:             string
    display_name:         string | null
    avatar_url:           string | null
    bio:                  string | null
    website:              string | null
    role:                 string
    verified_recommender: boolean | null
    member_since:         string
    current_streak?:      number | null
  }
  initials:     string
  isGhost:      boolean
  isOwner:      boolean
  isPro:        boolean
  isAdmin:      boolean
  showGold:     boolean
  canFollow:    boolean       // logged-in viewer looking at someone else
  isFollowing:  boolean
  isLoggedIn:   boolean
  editHref:     string
  bannerCovers: string[]
  kicker:       string | null
  /** Reader stats. Creators pass `statItems` instead. */
  stats?: {
    chapters:  number
    followers: number
    following: number
    recs:      number
    completed: number
    reviews:   number
  }
  statItems?: { label: string; value: string }[]
  match?:     HeroMatch | null
  variant?:   'reader' | 'creator'
  cta?:       { label: string; href: string } | null
}

export function ProfileHero({
  profile, initials, isGhost, isOwner, isPro, isAdmin, showGold, canFollow, isFollowing,
  isLoggedIn, editHref, bannerCovers, kicker, stats, statItems: statItemsProp, match = null,
  variant = 'reader', cta = null,
}: Props) {
  const name = profile.display_name || profile.username
  const ring = isGhost ? 'ghost' : isAdmin ? 'admin' : showGold ? 'gold' : 'default'

  const s = stats ?? { chapters: 0, followers: 0, following: 0, recs: 0, completed: 0, reviews: 0 }
  const statItems = statItemsProp ?? (isGhost
    ? [{ label: 'Archived', value: s.recs.toLocaleString() }]
    : [
        ...(s.chapters > 0 ? [{ label: 'Chapters', value: s.chapters.toLocaleString() }] : []),
        { label: 'Followers', value: compact(s.followers) },
        { label: 'Following', value: compact(s.following) },
        { label: 'Recs',      value: compact(s.recs) },
      ])

  const streak = profile.current_streak ?? 0

  return (
    <header>
      {bannerCovers.length > 0 && (
        <div
          className="sh-banner"
          aria-hidden
          style={{ gridTemplateColumns: `repeat(${bannerCovers.length}, 1fr)` }}
        >
          {bannerCovers.map((url, i) => (
            <img key={i} src={proxyCover(url)} alt="" />
          ))}
        </div>
      )}

      <div className={`sh-body sh-hero${bannerCovers.length > 0 ? '' : ' sh-hero-flat'}`}>
        <div className="sh-hero-top">
          <div className="sh-avatar" data-ring={ring}>
            <ProAvatar
              src={profile.avatar_url}
              fallback={initials}
              size="xl"
              isPro={isPro}
              isAdmin={isAdmin}
            />
          </div>

          <div className="sh-id">
            <div className="sh-name-row">
              <h1 className="sh-name sh-display">{name}</h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
            </div>
            <p className="sh-handle">@{profile.username}</p>
            {isGhost ? (
              <p className="sh-ghost-pill">The Archivist</p>
            ) : kicker ? (
              <p className="sh-kicker">{variant === 'creator' ? <Palette size={14} /> : <Moon size={14} />} {kicker}</p>
            ) : null}
          </div>
        </div>

        {(canFollow || isOwner || cta) && (
          <div className="sh-actions">
            {cta && (
              <a href={cta.href} target="_blank" rel="noopener noreferrer" className="sh-cta">
                <BookOpen size={16} /> {cta.label}
              </a>
            )}
            {canFollow && (
              <div className="sh-follow">
                <FollowButton profileId={profile.id} initialFollowing={isFollowing} isLoggedIn={isLoggedIn} />
              </div>
            )}
            {isOwner && <Link href={editHref} className="sh-btn">Edit profile</Link>}
          </div>
        )}

        {isGhost ? (
          <p className="sh-bio" style={{ color: '#a5b4fc' }}>
            An archivist of forgotten recommendations. Comics submitted here live on even when their recommenders are gone.
          </p>
        ) : (
          profile.bio && <p className="sh-bio">{profile.bio}</p>
        )}

        {profile.website && !isGhost && (
          <a href={profile.website} target="_blank" rel="noopener noreferrer" className="sh-site">
            <Globe size={13} /> {profile.website.replace(/^https?:\/\//, '')}
          </a>
        )}

        <dl className="sh-stats">
          {statItems.map(s => (
            <div key={s.label} className="sh-stat">
              <dt>{s.label}</dt>
              <dd className="sh-display">{s.value}</dd>
            </div>
          ))}
        </dl>

        {!isGhost && (
          <div className="sh-meta">
            {streak > 0 && (
              <span><Flame size={15} className="sh-flame" /> {streak}-day streak</span>
            )}
            {s.completed > 0 && <span>{s.completed} completed</span>}
            {s.reviews > 0 && <span>{s.reviews} review{s.reviews === 1 ? '' : 's'}</span>}
            <span><CalendarDays size={14} /> Joined {formatDate(profile.member_since)}</span>
          </div>
        )}

        {match && (
          <div className="sh-card sh-match">
            <p className="sh-eyebrow">Taste match</p>
            <p className="sh-match-pct sh-display">
              {match.confidenceTier === 'high' ? '' : '~'}{match.similarityPct}<small>%</small>
            </p>
            <p>
              {match.sharedGenres.length > 0
                ? `You both like ${match.sharedGenres.join(' · ')}`
                : 'Not many shared genres yet'}
              {match.confidenceTier !== 'high' && ' · still learning their taste'}
            </p>
          </div>
        )}
      </div>
    </header>
  )
}