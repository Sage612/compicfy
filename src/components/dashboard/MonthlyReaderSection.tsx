'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRESETS = [60, 80, 100, 120]

interface TypeCount {
  type: string
  chapters: number
}

interface Props {
  userId:            string
  monthlyChapters:   number
  lastMonthChapters: number
  initialGoal:       number
  typeBreakdown:     TypeCount[] // THIS month, sourced from reading_activity.type
}

export function MonthlyReaderSection({ userId, monthlyChapters, lastMonthChapters, initialGoal, typeBreakdown }: Props) {
  const [goal, setGoal] = useState(initialGoal)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const delta = monthlyChapters - lastMonthChapters
  const deltaPct = lastMonthChapters > 0 ? Math.round((delta / lastMonthChapters) * 100) : null
  const goalPct = goal > 0 ? Math.min(100, Math.round((monthlyChapters / goal) * 100)) : 0
  const maxBar = Math.max(monthlyChapters, lastMonthChapters, 1)
  const maxType = Math.max(1, ...typeBreakdown.map(t => t.chapters))

  const setGoalTo = (next: number) => {
    setGoal(next) // optimistic
    startTransition(async () => {
      await supabase.from('profiles').update({ monthly_reading_goal: next }).eq('id', userId)
    })
  }

  return (
    <div className="rounded-2xl border border-border p-5 space-y-5">
      <div>
        <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1">Monthly reader</p>
        <h2 className="font-dashboard-serif text-xl mb-2">Same day, last month</h2>
        <p className="text-sm text-muted-foreground">
          {monthlyChapters} chapters so far{lastMonthChapters > 0 && ` versus ${lastMonthChapters} at this point last month`}.
          {deltaPct !== null && <span className="text-foreground font-medium"> {deltaPct >= 0 ? 'Up' : 'Down'} {Math.abs(deltaPct)}%.</span>}
        </p>
      </div>

      {/* Last month vs this month — simple two-bar comparison */}
      <div className="flex items-end gap-8 justify-center py-2">
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 rounded-t-md bg-muted" style={{ height: `${Math.max(8, (lastMonthChapters / maxBar) * 96)}px` }} />
          <span className="text-xs text-muted-foreground">Last month</span>
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-10 rounded-t-md bg-foreground/80" style={{ height: `${Math.max(8, (monthlyChapters / maxBar) * 96)}px` }} />
          <span className="text-xs text-muted-foreground">This month</span>
        </div>
      </div>

      {/* Goal */}
      <div className="space-y-2">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Goal</span>
          <span>{monthlyChapters} / {goal}</span>
        </div>
        <div className="h-1 rounded-full bg-muted overflow-hidden">
          <div className="h-full rounded-full bg-foreground/70 transition-all duration-700" style={{ width: `${goalPct}%` }} />
        </div>
        <div className="flex items-center gap-2 pt-1">
          {PRESETS.map(p => (
            <button
              key={p}
              type="button"
              disabled={isPending}
              onClick={() => setGoalTo(p)}
              className={`h-8 px-3 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                goal === p ? 'bg-foreground text-background border-foreground' : 'border-border text-muted-foreground hover:border-foreground/30'
              }`}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {/* Type breakdown — this month, from reading_activity.type */}
      {typeBreakdown.length > 0 && (
        <div className="space-y-2.5 pt-1">
          {typeBreakdown.map(({ type, chapters }) => (
            <div key={type} className="space-y-1">
              <div className="flex items-center justify-between text-sm">
                <span className="capitalize text-muted-foreground">{type}</span>
                <span>{chapters} ch</span>
              </div>
              <div className="h-1.5 rounded-full bg-muted overflow-hidden">
                <div className="h-full rounded-full bg-foreground/70" style={{ width: `${(chapters / maxType) * 100}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}