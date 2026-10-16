'use client'

// src/components/comic-detail/ScrubBar.tsx
//
// The "Scrub Bar": drag a slider to jump to a chapter, like scrubbing a video.
// Dragging only moves the number on screen; the chapter is saved once when you
// let go, so jumping from ch. 3 to ch. 40 is one log, not 37.

import { useRef, useState } from 'react'

interface Props {
  value:     number
  max:       number
  onCommit:  (n: number) => void
  disabled?: boolean
}

export function ScrubBar({ value, max, onCommit, disabled = false }: Props) {
  const [drag, setDrag] = useState<number | null>(null)
  const dragRef = useRef<number | null>(null)

  const shown = drag ?? value
  const safeMax = Math.max(max, value, 1)

  const commit = () => {
    const picked = dragRef.current
    dragRef.current = null
    setDrag(null)
    if (picked !== null && picked !== value) onCommit(picked)
  }

  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.18em] text-dossier-foreground/65">
        <span>Scrub to chapter</span>
        <span className="tabular-nums text-dossier-foreground/80 text-xs normal-case tracking-normal">
          Ch. {shown}
        </span>
      </div>
      <input
        type="range"
        min={0}
        max={safeMax}
        step={1}
        value={Math.min(shown, safeMax)}
        disabled={disabled}
        aria-label="Chapter"
        onChange={e => {
          const n = Number(e.target.value)
          dragRef.current = n
          setDrag(n)
        }}
        onPointerUp={commit}
        onTouchEnd={commit}
        onKeyUp={commit}
        onBlur={commit}
        className="w-full h-6 cursor-pointer accent-[var(--dossier-foreground)] disabled:opacity-40"
      />
    </div>
  )
}