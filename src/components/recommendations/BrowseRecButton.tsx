'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface Props {
  isLoggedIn:    boolean
  recommendHref: string
}

export function BrowseRecButton({ isLoggedIn, recommendHref }: Props) {
  const [showAuth, setShowAuth] = useState(false)

  if (isLoggedIn) {
    return (
      <Link href={recommendHref}>
        <Button size="sm" className="gap-1.5 h-8 px-3">
          <BookOpen size={14} />
          <span className="hidden sm:inline">Recommend</span>
          <span className="sm:hidden text-xs font-semibold">Rec</span>
        </Button>
      </Link>
    )
  }

  return (
    <>
      <Button
        size="sm"
        className="gap-1.5 h-8 px-3"
        onClick={() => setShowAuth(true)}
      >
        <BookOpen size={14} />
        <span className="hidden sm:inline">Recommend</span>
        <span className="sm:hidden text-xs font-semibold">Rec</span>
      </Button>

      <AuthPromptModal
        open={showAuth}
        onClose={() => setShowAuth(false)}
        config={{
          action:   'recommend a comic',
          nextPath: '/browse',
          icon:     <BookOpen size={24} className="text-primary" />,
        }}
      />
    </>
  )
}