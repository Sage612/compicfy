// src/lib/tracking/constants.ts
//
// Shared by the server (core.ts) and the client (TrackingProvider, TrackSheet,
// MomentStrip). Keep this file free of server-only imports.

/** Same six moods the profile "Log a session" form already uses. */
export const MOODS = [
  { emoji: '😭', label: 'Wrecked'    },
  { emoji: '😍', label: 'Loved it'   },
  { emoji: '🤯', label: 'Mind blown' },
  { emoji: '🧐', label: 'Intrigued'  },
  { emoji: '😴', label: 'Bored'      },
  { emoji: '🔥', label: 'Hyped'      },
] as const

export const MOOD_EMOJIS: readonly string[] = MOODS.map(m => m.emoji)

/** Colour of each mood's dot on the progress ribbon. */
export const MOOD_TINT: Record<string, string> = {
  '😭': '#60a5fa',
  '😍': '#f472b6',
  '🤯': '#a78bfa',
  '🧐': '#2dd4bf',
  '😴': '#94a3b8',
  '🔥': '#fb923c',
}

/** One-liner limit. Short on purpose: it is a breadcrumb, not a review. */
export const NOTE_MAX_LENGTH = 280

/** Sanity ceiling for a chapter number. */
export const MAX_CHAPTER = 20000

/** Created silently the first time someone tracks a comic with no lists yet. */
export const DEFAULT_LIST_NAME = 'My Library'

/** Spite Read is stored as a sub-status of "reading". */
export const SPITE_SUB_STATUS = 'spite'

/** Logging a chapter on a comic in one of these statuses flips it to "reading". */
export const RESUME_FROM_STATUSES: readonly string[] = [
  'plan_to_read',
  'on_hold',
  'marinating',
  'dropped',
]

/** How long the "how did it feel?" strip stays after a one-tap log. */
export const MOMENT_STRIP_MS = 9000