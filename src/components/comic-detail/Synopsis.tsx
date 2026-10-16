'use client'

// src/components/comic-detail/Synopsis.tsx
// Three lines of synopsis with a "···" that opens the rest, like the film page.

import { useState } from 'react'

export function Synopsis({ text }: { text: string }) {
  const [open, setOpen] = useState(false)
  const long = text.length > 180

  return (
    <div>
      <p
        className={`text-[15px] leading-relaxed text-dossier-foreground/88 ${open || !long ? '' : 'line-clamp-3'}`}
      >
        {text}
      </p>
      {long && (
        <button
          type="button"
          onClick={() => setOpen(o => !o)}
          aria-expanded={open}
          aria-label={open ? 'Show less' : 'Read the full synopsis'}
          className="mt-1 mx-auto block px-4 py-1 text-xl leading-none tracking-widest text-dossier-foreground/72 hover:text-dossier-foreground"
        >
          {open ? '︿' : '···'}
        </button>
      )}
    </div>
  )
}