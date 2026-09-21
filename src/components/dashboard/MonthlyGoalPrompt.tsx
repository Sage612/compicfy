'use client'

import { useState, useTransition } from 'react'
import { createClient } from '@/lib/supabase/client'
import { X } from 'lucide-react'

const PRESETS = [60, 80, 100, 120]

function monthKey(): string {
  const d = new Date()
  return `${d.getFullYear()}-${d.getMonth() + 1}`
}

function storageKey(): string {
  return `ComPicfy_goal_prompt_seen_${monthKey()}`
}

interface Props {
  userId:      string
  currentGoal: number
}

export function MonthlyGoalPrompt({ userId, currentGoal }: Props) {
  const [goal, setGoal] = useState(currentGoal)
  const [changing, setChanging] = useState(false)
  const [isPending, startTransition] = useTransition()
  const supabase = createClient()

  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined' ? !!localStorage.getItem(storageKey()) : false
    } catch { return false }
  })

  if (dismissed) return null

  const dismiss = () => {
    try { localStorage.setItem(storageKey(), '1') } catch {}
    setDismissed(true)
  }

  const setGoalTo = (next: number) => {
    setGoal(next)
    startTransition(async () => {
      await supabase.from('profiles').update({ monthly_reading_goal: next }).eq('id', userId)
    })
    dismiss()
  }

  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border p-3 text-sm">
      {!changing ? (
        <>
          <span className="flex-1 text-muted-foreground">
            New month — keep your <span className="text-foreground font-medium">{goal} ch.</span> goal, or set a new one?
          </span>
          <button onClick={dismiss} className="text-xs font-medium hover:underline shrink-0">Keep</button>
          <button onClick={() => setChanging(true)} className="text-xs font-medium hover:underline shrink-0">Change</button>
          <button onClick={dismiss} aria-label="Dismiss" className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0">
            <X size={13} />
          </button>
        </>
      ) : (
        <>
          <span className="text-muted-foreground shrink-0">New goal:</span>
          <div className="flex items-center gap-1.5 flex-1">
            {PRESETS.map(p => (
              <button
                key={p}
                disabled={isPending}
                onClick={() => setGoalTo(p)}
                className="h-7 px-2.5 rounded-full text-xs font-medium border border-border text-muted-foreground hover:border-foreground/30 disabled:opacity-50 transition-colors"
              >
                {p}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}