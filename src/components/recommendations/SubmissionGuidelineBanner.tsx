'use client'

import { useEffect, useState } from 'react'
import { X, BookOpen, CheckCircle2 } from 'lucide-react'
import { cn } from '@/lib/utils'

// Show every new session, dismiss survives within-session navigation
const STORAGE_KEY = 'compicfy_guidelines_dismissed'

const RULES = [
  { ok: true,  text: 'Real titles only, no made up or placeholder names'                },
  { ok: true,  text: 'Add a cover image and at least one genre'                          },
  { ok: true,  text: 'Write why YOU recommend it, not just a synopsis'                  },
  { ok: false, text: 'No duplicate submissions, search before posting'                  },
  { ok: false, text: 'No adult content without the correct content rating set'           },
  { ok: false, text: 'No spam, self-promotion, or AI-generated descriptions'             },
]

export function SubmissionGuidelineBanner() {
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    try {
      setVisible(!sessionStorage.getItem(STORAGE_KEY))
    } catch {
      setVisible(true)
    }
  }, [])

  const dismiss = () => {
    try { sessionStorage.setItem(STORAGE_KEY, '1') } catch {}
    setVisible(false)
  }

  if (!visible) return null

  return (
    <div className="relative rounded-2xl border border-primary/20 bg-primary/5 p-4 space-y-3">
      {/* Dismiss */}
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-foreground hover:text-foreground transition-colors"
        aria-label="Dismiss"
      >
        <X size={14} />
      </button>

      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0 shadow-sm">
          <BookOpen size={14} className="text-white" />
        </div>
        <div>
          <p className="text-sm font-black leading-tight">Submission Guidelines</p>
          <p className="text-xs text-muted-foreground">Keep recs useful for everyone</p>
        </div>
      </div>

      <ul className="space-y-1.5">
        {RULES.map(({ ok, text }) => (
          <li key={text} className="flex items-start gap-2">
            <CheckCircle2
              size={13}
              className={cn('shrink-0 mt-0.5', ok ? 'text-emerald-500' : 'text-destructive')}
            />
            <span className="text-xs text-muted-foreground leading-snug">{text}</span>
          </li>
        ))}
      </ul>

      <button
        onClick={dismiss}
        className="text-xs text-primary hover:underline font-semibold"
      >
        Got it, hide for this session.
      </button>
    </div>
  )
}