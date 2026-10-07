import Link from 'next/link'
import { Settings } from 'lucide-react'

interface Props {
  displayName:     string
  avatarUrl:       string | null
  // Reader-specific — omit both (or pass subtitle instead) for non-reader
  // contexts like the Creator dashboard, where "streak/chapters this month"
  // doesn't mean anything.
  currentStreak?:   number
  monthlyChapters?: number
  subtitle?:        React.ReactNode // overrides the streak line entirely when provided
  settingsHref:    string
  // Optional — lets Pro (or any future variant) extend the same shared
  // greeting instead of forking it into a separate component.
  badges?:      React.ReactNode // rendered next to the greeting headline
  extraLine?:   React.ReactNode // rendered below the streak/monthly line, e.g. leaderboard rank
  avatarSlot?:  React.ReactNode // overrides the default plain avatar circle entirely
}

function timeOfDayGreeting(): string {
  // Server-rendered, so this reflects server time rather than the reader's
  // own clock — fine for a once-a-page-load greeting, but worth knowing if
  // this ever needs to be timezone-accurate later (would need to move to a
  // client component reading the browser's local time instead).
  const hour = new Date().getHours()
  if (hour < 12) return 'Morning'
  if (hour < 18) return 'Afternoon'
  return 'Evening'
}

function todayLabel(): string {
  return new Date().toLocaleDateString(undefined, {
    weekday: 'long',
    day:     'numeric',
    month:   'long',
  })
}

export function DashboardGreeting({ displayName, avatarUrl, currentStreak, monthlyChapters, subtitle, settingsHref, badges, extraLine, avatarSlot }: Props) {
  const firstName = displayName.split(' ')[0]

  const streakLine = subtitle ?? (
    currentStreak != null && monthlyChapters != null ? (
      currentStreak > 0
        ? `${currentStreak} day streak. ${monthlyChapters} chapter${monthlyChapters === 1 ? '' : 's'} this month. Pick up where the panel stopped.`
        : `${monthlyChapters} chapter${monthlyChapters === 1 ? '' : 's'} this month. Pick up where the panel stopped.`
    ) : null
  )

  return (
    <div className="flex items-start justify-between gap-4">
      <div className="space-y-1">
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">
          {todayLabel()}
        </p>
        <div className="flex items-center gap-2 flex-wrap">
          <h1 className="font-dashboard-serif text-3xl md:text-4xl italic text-foreground">
            {timeOfDayGreeting()}, {firstName}.
          </h1>
          {badges}
        </div>
        {streakLine && (
          <p className="text-sm text-muted-foreground">
            {streakLine}
          </p>
        )}
        {extraLine}
      </div>

      <div className="flex items-center gap-3 shrink-0">
        <Link
          href={settingsHref}
          className="w-8 h-8 rounded-full border border-border flex items-center justify-center text-muted-foreground hover:text-foreground hover:border-foreground/30 transition-colors"
          aria-label="Settings"
        >
          <Settings size={14} />
        </Link>
        {avatarSlot ?? (
          <div className="w-9 h-9 rounded-full bg-muted border border-border overflow-hidden flex items-center justify-center shrink-0">
            {avatarUrl ? (
              <img src={avatarUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <span className="text-xs font-semibold text-muted-foreground">
                {firstName.slice(0, 2).toUpperCase()}
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}