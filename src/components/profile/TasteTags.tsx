interface Props {
  genres:       string[]   // user's favorite_genres from profile
  recGenres?:   string[]   // genres from their approved recommendations (optional extra signal)
  compact?:     boolean
}

// ── Tag definitions — ordered by specificity ─────────────────────
// Each tag has a trigger condition based on genre presence

interface TagDef {
  tag:      string
  emoji:    string
  color:    string
  requires: string[]   // must have at least one of these genres
  bonus?:   string[]   // having these too increases confidence
  min?:     number     // minimum genre matches required (default 1)
}

const TAG_DEFINITIONS: TagDef[] = [
  // Genre specialists
  { tag: 'Action Connoisseur',    emoji: '⚔️',  color: 'bg-red-500/10    text-red-500    border-red-500/20',    requires: ['Action'],                               bonus: ['Martial Arts', 'Adventure'] },
  { tag: 'Romance Expert',        emoji: '💕',  color: 'bg-pink-500/10   text-pink-500   border-pink-500/20',   requires: ['Romance'],                              bonus: ['Drama', 'Shoujo'] },
  { tag: 'Fantasy Dweller',       emoji: '🧙',  color: 'bg-violet-500/10 text-violet-500 border-violet-500/20', requires: ['Fantasy'],                              bonus: ['Isekai', 'Supernatural'] },
  { tag: 'Isekai Enthusiast',     emoji: '🌀',  color: 'bg-indigo-500/10 text-indigo-500 border-indigo-500/20', requires: ['Isekai'] },
  { tag: 'Horror Aficionado',     emoji: '👁️', color: 'bg-zinc-700/10   text-zinc-400   border-zinc-700/20',   requires: ['Horror'],                              bonus: ['Psychological', 'Thriller'] },
  { tag: 'Psychological Analyst', emoji: '🧠',  color: 'bg-fuchsia-500/10 text-fuchsia-500 border-fuchsia-500/20', requires: ['Psychological'] },
  { tag: 'Comedy Lover',          emoji: '😂',  color: 'bg-yellow-500/10 text-yellow-600 border-yellow-500/20', requires: ['Comedy'],                              bonus: ['Slice of Life'] },
  { tag: 'Slice of Life Fan',     emoji: '☕',  color: 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20', requires: ['Slice of Life'] },
  { tag: 'Sports Fanatic',        emoji: '🏆',  color: 'bg-amber-500/10  text-amber-500  border-amber-500/20',  requires: ['Sports'] },
  { tag: 'Sci-Fi Explorer',       emoji: '🚀',  color: 'bg-cyan-500/10   text-cyan-500   border-cyan-500/20',   requires: ['Sci-Fi'] },
  { tag: 'Mystery Solver',        emoji: '🔍',  color: 'bg-slate-500/10  text-slate-400  border-slate-500/20',  requires: ['Mystery'],                             bonus: ['Thriller'] },
  { tag: 'Historical Scholar',    emoji: '📜',  color: 'bg-stone-500/10  text-stone-400  border-stone-500/20',  requires: ['Historical'] },
  { tag: 'Martial Arts Master',   emoji: '🥋',  color: 'bg-rose-600/10   text-rose-600   border-rose-600/20',   requires: ['Martial Arts'] },
  { tag: 'Mecha Pilot',           emoji: '🤖',  color: 'bg-teal-500/10   text-teal-500   border-teal-500/20',   requires: ['Mecha'] },

  // Format specialists
  { tag: 'Manhwa Devotee',        emoji: '????', color: 'bg-teal-400/10 text-teal-400 border-teal-400/20', requires: ['Manhwa'] },
  { tag: 'Manhua Collector',      emoji: '🇨🇳', color: 'bg-amber-400/10  text-amber-400  border-amber-400/20',  requires: ['Manhua'] },

  // Demo specialists
  { tag: 'Shounen Veteran',       emoji: '💥',  color: 'bg-blue-500/10   text-blue-500   border-blue-500/20',   requires: ['Shounen'] },
  { tag: 'Seinen Connoisseur',    emoji: '🎯',  color: 'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',   requires: ['Seinen'] },
  { tag: 'Shoujo Romantic',       emoji: '🌸',  color: 'bg-pink-400/10   text-pink-400   border-pink-400/20',   requires: ['Shoujo'] },
  { tag: 'Josei Appreciator',     emoji: '🌷',  color: 'bg-rose-400/10   text-rose-400   border-rose-400/20',   requires: ['Josei'] },

  // Cross-genre combinations
  { tag: 'Dark Fantasy Fan',      emoji: '🌑',  color: 'bg-purple-900/20 text-purple-400 border-purple-900/30', requires: ['Fantasy', 'Horror'],    min: 2 },
  { tag: 'Action Romance Fan',    emoji: '💘',  color: 'bg-rose-500/10   text-rose-500   border-rose-500/20',   requires: ['Action', 'Romance'],    min: 2 },
  { tag: 'Omnivore Reader',       emoji: '📚',  color: 'bg-primary/10    text-primary    border-primary/20',    requires: ['Action', 'Romance', 'Fantasy', 'Comedy', 'Drama'], min: 4 },
]

function computeTasteTags(genres: string[]): typeof TAG_DEFINITIONS {
  if (!genres || genres.length === 0) return []

  const genreSet = new Set(genres)

  // Score each tag
  const scored = TAG_DEFINITIONS.map(def => {
    const requiredMatches = def.requires.filter(g => genreSet.has(g)).length
    const bonusMatches    = (def.bonus ?? []).filter(g => genreSet.has(g)).length
    const minRequired     = def.min ?? 1
    const qualifies       = requiredMatches >= minRequired

    return { def, score: requiredMatches + bonusMatches * 0.5, qualifies }
  })

  // Take top qualifying tags — max 4 shown
  return scored
    .filter(s => s.qualifies)
    .sort((a, b) => b.score - a.score)
    .slice(0, 4)
    .map(s => s.def)
}

export function TasteTags({ genres, recGenres, compact = false }: Props) {
  // Merge profile genres + rec genres for better signal
  const allGenres = [...new Set([...(genres ?? []), ...(recGenres ?? [])])]
  const tags      = computeTasteTags(allGenres)

  if (tags.length === 0) return null

  return (
    <div className="flex flex-wrap gap-1.5">
      {tags.map(({ tag, emoji, color }) => (
        <span
          key={tag}
          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${color}`}
          title={`Taste tag: ${tag}`}
        >
          <span>{emoji}</span>
          {!compact && <span>{tag}</span>}
        </span>
      ))}
    </div>
  )
}
