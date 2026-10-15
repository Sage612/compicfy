'use client'

// src/components/comic-detail/FriendNote.tsx
// A friend's one-liner, blurred until you tap it when it could spoil you
// (they flagged it, or they are further along than you are).

import { useState } from 'react'

export function FriendNote({ note, hidden }: { note: string; hidden: boolean }) {
  const [shown, setShown] = useState(!hidden)

  if (shown) {
    return <span className="text-dossier-foreground/85">&ldquo;{note}&rdquo;</span>
  }

  return (
    <button
      type="button"
      onClick={() => setShown(true)}
      className="text-left text-dossier-foreground/60"
      aria-label="Reveal a note that may contain spoilers"
    >
      <span className="blur-sm select-none">&ldquo;{note}&rdquo;</span>
      <span className="ml-2 text-[11px] underline underline-offset-2">may spoil · tap to reveal</span>
    </button>
  )
}