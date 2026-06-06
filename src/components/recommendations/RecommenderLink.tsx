'use client'

import { useState } from 'react'
import Link from 'next/link'
import { User } from 'lucide-react'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'
import { UserBadges } from '@/components/pro/UserBadges'

interface Props {
  username:     string
  displayName:  string
  isLoggedIn:   boolean
  isGhost?:     boolean
  role?:        string
  isPro?:       boolean
  isVerified?:  boolean
  comicTitle?:  string
  userType?:    string | null
}

export function RecommenderLink({
  username,
  displayName,
  isLoggedIn,
  isGhost = false,
  role,
  isPro,
  isVerified,
  comicTitle,
  userType,
}: Props) {
  const [open, setOpen] = useState(false)

  // Route creators to their creator profile directly — no redirect hop needed
  const profileHref = userType === 'creator'
    ? `/creator/${username}`
    : `/profile/${username}`

  if (isGhost) {
    return (
      <Link
        href="/profile/their_shadow"
        className="inline-flex items-center gap-1.5 text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
      >
        👻 @their_shadow
        <span className="text-[10px] text-indigo-400/60 italic font-normal">archived</span>
      </Link>
    )
  }

  if (!isLoggedIn) {
    return (
      <>
        <button
          onClick={() => setOpen(true)}
          className="text-foreground hover:text-primary font-semibold transition-colors"
        >
          @{displayName}
        </button>
        <AuthPromptModal
          open={open}
          onClose={() => setOpen(false)}
          config={{
            action:     'view profiles',
            comicTitle,
            icon:       <User size={24} className="text-primary" />,
          }}
        />
      </>
    )
  }

  return (
    <>
      <Link
        href={profileHref}
        className="text-foreground hover:text-primary font-semibold transition-colors"
      >
        @{displayName}
      </Link>
      <UserBadges
        role={role}
        isPro={isPro}
        isVerified={isVerified}
        size="sm"
      />
    </>
  )
}