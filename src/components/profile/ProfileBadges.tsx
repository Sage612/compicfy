interface BadgeDef {
  id:       string
  emoji:    string
  label:    string
  desc:     string
  color:    string     // free tier colour
  proColor: string     // pro/gold tier colour
}

interface EarnedBadge extends BadgeDef {
  earned: true
}

// ── Badge definitions ─────────────────────────────────────────────
const ALL_BADGES: BadgeDef[] = [
  // Recommendation milestones
  {
    id:       'first_rec',
    emoji:    '📖',
    label:    'First Rec',
    desc:     'Submitted your first recommendation',
    color:    'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'recommender',
    emoji:    '✍️',
    label:    'Recommender',
    desc:     '5 approved recommendations',
    color:    'bg-primary/10    text-primary    border-primary/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'curator',
    emoji:    '🎯',
    label:    'Curator',
    desc:     '25 approved recommendations',
    color:    'bg-violet-500/10 text-violet-600 border-violet-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'master',
    emoji:    '👑',
    label:    'Master Recommender',
    desc:     '100 approved recommendations',
    color:    'bg-rose-500/10   text-rose-600   border-rose-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },

  // Reading completion milestones
  {
    id:       'completionist',
    emoji:    '✅',
    label:    'Completionist',
    desc:     'Completed 10 series in your reading list',
    color:    'bg-teal-500/10   text-teal-600   border-teal-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'binge_reader',
    emoji:    '🔥',
    label:    'Binge Reader',
    desc:     'Completed 50 series',
    color:    'bg-orange-500/10 text-orange-600 border-orange-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'chapter_hunter',
    emoji:    '🏆',
    label:    'Chapter Hunter',
    desc:     'Completed 100 series',
    color:    'bg-yellow-500/10 text-yellow-600 border-yellow-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },

  // Review milestones
  {
    id:       'critic',
    emoji:    '⭐',
    label:    'Critic',
    desc:     'Wrote 10 reviews',
    color:    'bg-amber-500/10  text-amber-600  border-amber-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'voice',
    emoji:    '📣',
    label:    'Community Voice',
    desc:     'Wrote 50 reviews',
    color:    'bg-pink-500/10   text-pink-600   border-pink-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },

  // Community recognition
  {
    id:       'top_contributor',
    emoji:    '💎',
    label:    'Top Contributor',
    desc:     'Received 100 upvotes across all recs',
    color:    'bg-cyan-500/10   text-cyan-600   border-cyan-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
  {
    id:       'community_fave',
    emoji:    '❤️',
    label:    'Community Favourite',
    desc:     'Received 500 upvotes',
    color:    'bg-red-500/10    text-red-600    border-red-500/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },

  // Special
  {
    id:       'verified_rec',
    emoji:    '🔖',
    label:    'Verified Recommender',
    desc:     'Recognised as a trusted community recommender',
    color:    'bg-primary/10    text-primary    border-primary/20',
    proColor: 'bg-amber-500/10  text-amber-600  border-amber-500/30',
  },
]

// ── Badge computation ─────────────────────────────────────────────

interface ComputeInput {
  approvedRecs:      number
  totalReviews:      number
  totalVotes:        number
  completedSeries:   number
  verifiedRecommender: boolean
}

function computeBadges(input: ComputeInput): EarnedBadge[] {
  const earned: EarnedBadge[] = []

  const check = (id: string) => {
    const def = ALL_BADGES.find(b => b.id === id)
    if (def) earned.push({ ...def, earned: true })
  }

  if (input.approvedRecs >= 1)   check('first_rec')
  if (input.approvedRecs >= 5)   check('recommender')
  if (input.approvedRecs >= 25)  check('curator')
  if (input.approvedRecs >= 100) check('master')

  if (input.completedSeries >= 10)  check('completionist')
  if (input.completedSeries >= 50)  check('binge_reader')
  if (input.completedSeries >= 100) check('chapter_hunter')

  if (input.totalReviews >= 10) check('critic')
  if (input.totalReviews >= 50) check('voice')

  if (input.totalVotes >= 100) check('top_contributor')
  if (input.totalVotes >= 500) check('community_fave')

  if (input.verifiedRecommender) check('verified_rec')

  return earned
}

// ── Component ─────────────────────────────────────────────────────

interface Props {
  approvedRecs:        number
  totalReviews:        number
  totalVotes:          number
  completedSeries:     number
  verifiedRecommender: boolean
  isPro:               boolean
  isGhost:             boolean
}

export function ProfileBadges({
  approvedRecs,
  totalReviews,
  totalVotes,
  completedSeries,
  verifiedRecommender,
  isPro,
  isGhost,
}: Props) {
  if (isGhost) return null

  const badges = computeBadges({
    approvedRecs,
    totalReviews,
    totalVotes,
    completedSeries,
    verifiedRecommender,
  })

  if (badges.length === 0) return null

  return (
    <div className="space-y-1.5">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Achievements
      </p>
      <div className="flex flex-wrap gap-1.5">
        {badges.map((badge) => (
          <span
            key={badge.id}
            title={badge.desc}
            className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border cursor-default transition-all hover:scale-105 ${
              isPro ? badge.proColor : badge.color
            } ${isPro ? 'shadow-sm shadow-amber-500/10' : ''}`}
          >
            <span>{badge.emoji}</span>
            <span>{badge.label}</span>
            {/* Pro gold shimmer dot */}
            {isPro && (
              <span className="w-1 h-1 rounded-full bg-amber-400 animate-pulse ml-0.5" />
            )}
          </span>
        ))}
      </div>
    </div>
  )
}