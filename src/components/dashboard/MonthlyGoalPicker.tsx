'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'

const PRESETS = [60, 80, 100, 120]

interface Props {
  userId:          string
  initialGoal:     number
  monthlyChapters: number
}

export function MonthlyGoalPicker({ userId, initialGoal, monthlyChapters }: Props) {
  const [goal, setGoal] = useState(initialGoal)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const pct = goal > 0 ? Math.min(100, Math.round((monthlyChapters / goal) * 100)) : 0

  const setGoalTo = (next: number) => {
    setGoal(next) // optimistic
    startTransition(async () => {
      await supabase.from('profiles').update({ monthly_reading_goal: next }).eq('id', userId)
    })
  }

  return (
    <div className="rounded-2xl border border-border p-4 space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground/60">Monthly goal</span>
        <span className="text-xs text-muted-foreground">{monthlyChapters} / {goal} ch.</span>
      </div>
      <p className="text-2xl font-medium tabular-nums leading-none">{pct}%</p>
      <div className="h-1 rounded-full bg-muted overflow-hidden">
        <div className="h-full rounded-full bg-foreground/70 transition-all duration-700" style={{ width: `${pct}%` }} />
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
  )
}