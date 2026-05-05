'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Users } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface Props {
  username:    string
  displayName: string
  avatarUrl:   string | null
  totalRecs:   number
  rank:        number
  isLoggedIn:  boolean
  rankStyle:   { bg: string; text: string }
}

export function ContributorLink({
  username,
  displayName,
  avatarUrl,
  totalRecs,
  rank,
  isLoggedIn,
  rankStyle,
}: Props) {
  const [open, setOpen] = useState(false)
  const initials = (displayName || username || 'U').slice(0, 2).toUpperCase()

  const inner = (
    <div className="group flex flex-col items-center gap-2.5 p-4 rounded-2xl border border-border bg-card hover:border-primary/40 hover:shadow-md transition-all duration-200 text-center cursor-pointer">
      <div className="relative">
        <Avatar className="h-12 w-12">
          <AvatarImage src={avatarUrl ?? undefined} />
          <AvatarFallback className="text-sm bg-gradient-to-br from-primary to-violet-500 text-white font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        {rank < 3 && (
          <div className={`absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full flex items-center justify-center text-[9px] font-black border-2 border-card ${rankStyle.bg} ${rankStyle.text}`}>
            {rank + 1}
          </div>
        )}
      </div>
      <div className="min-w-0 w-full">
        <p className="text-xs font-black truncate group-hover:text-primary transition-colors">
          {displayName || username}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5">
          {totalRecs} recs
        </p>
      </div>
    </div>
  )

  if (!isLoggedIn) {
    return (
      <>
        <button onClick={() => setOpen(true)} className="w-full text-left">
          {inner}
        </button>
        <AuthPromptModal
          open={open}
          onClose={() => setOpen(false)}
          config={{
            action: 'view profiles',
            icon:   <Users size={24} className="text-primary" />,
          }}
        />
      </>
    )
  }

  return (
    <Link href={`/profile/${username}`}>
      {inner}
    </Link>
  )
}