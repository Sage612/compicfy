'use client'

import { useState } from 'react'
import Link from 'next/link'
import { X } from 'lucide-react'

interface Props {
  hasAvatar: boolean
  hasBio: boolean
  hasWebsite: boolean
}

const PROFILE_SESSION_KEY = 'ComPicfy_profile_banner_dismissed'

export function ProfileCompletionBanner({ hasAvatar, hasBio, hasWebsite }: Props) {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return typeof window !== 'undefined'
        ? !!sessionStorage.getItem(PROFILE_SESSION_KEY)
        : false
    } catch { return false }
  })

  const items = [
    { label: 'a photo',   done: hasAvatar,  anchor: '#avatar'  },
    { label: 'a bio',     done: hasBio,     anchor: '#bio'     },
    { label: 'a website', done: hasWebsite, anchor: '#website' },
  ]

  const missing = items.filter(i => !i.done)

  if (dismissed || missing.length === 0) return null

  return (
    <div className="flex items-center gap-3 py-2 text-sm text-muted-foreground">
      <span className="flex-1 min-w-0 truncate">
        Add{' '}
        {missing.map((item, i) => (
          <span key={item.label}>
            {i > 0 && (i === missing.length - 1 ? ' and ' : ', ')}
            <Link href={`/reader/dashboard/settings${item.anchor}`} className="text-foreground hover:underline">
              {item.label}
            </Link>
          </span>
        ))}
        {' '}to complete your profile.
      </span>
      <button
        onClick={() => {
          try { sessionStorage.setItem(PROFILE_SESSION_KEY, '1') } catch {}
          setDismissed(true)
        }}
        className="text-muted-foreground/50 hover:text-foreground transition-colors shrink-0"
        aria-label="Dismiss"
      >
        <X size={13} />
      </button>
    </div>
  )
}