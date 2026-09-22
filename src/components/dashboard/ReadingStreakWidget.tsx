import { Flame, BookOpen } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Props {
  currentStreak:   number
  longestStreak:   number
  monthlyChapters: number
}

export function ReadingStreakWidget({ currentStreak, longestStreak, monthlyChapters }: Props) {
  const isPersonalBest = currentStreak > 0 && currentStreak >= longestStreak

  return (
    <div className="grid grid-cols-2 gap-3">
      <div className={cn(
        'p-4 rounded-2xl border space-y-1',
        currentStreak > 0 ? 'border-orange-500/25 bg-orange-500/5' : 'border-border bg-card'
      )}>
        <div className="flex items-center gap-1.5">
          <Flame size={14} className={currentStreak > 0 ? 'text-orange-500' : 'text-muted-foreground'} />
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">Streak</span>
        </div>
        <p className="text-2xl font-black tabular-nums">
          {currentStreak} <span className="text-xs font-semibold text-muted-foreground">day{currentStreak === 1 ? '' : 's'}</span>
        </p>
        <p className="text-[10px] text-muted-foreground">
          {currentStreak === 0
            ? 'Read today to start a streak'
            : isPersonalBest
              ? 'Personal best — keep it going!'
              : `Best: ${longestStreak} days`}
        </p>
      </div>

      <div className="p-4 rounded-2xl border border-border bg-card space-y-1">
        <div className="flex items-center gap-1.5">
          <BookOpen size={14} className="text-primary" />
          <span className="text-[10px] font-black uppercase tracking-wider text-muted-foreground">This Month</span>
        </div>
        <p className="text-2xl font-black tabular-nums">{monthlyChapters}</p>
        <p className="text-[10px] text-muted-foreground">chapters read</p>
      </div>
    </div>
  )
}