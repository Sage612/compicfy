'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PenLine } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { AuthPromptModal } from '@/components/ui/auth-prompt-modal'

interface Props {
  isLoggedIn:  boolean
  submitRoute: string  // pre-computed on server: pro or dashboard route
  comicId:     string  // for ?next= so they return here after auth
}

export function SubmitYourOwnButton({ isLoggedIn, submitRoute, comicId }: Props) {
  const [showAuth, setShowAuth] = useState(false)

  if (!isLoggedIn) {
    return (
      <>
        <AuthPromptModal
          open={showAuth}
          onClose={() => setShowAuth(false)}
          config={{
            action: 'submit your own recommendation',
            icon: <PenLine size={24} className="text-primary" />,
          }}
        />
        <Button
          variant="outline"
          size="sm"
          onClick={() => setShowAuth(true)}
          className="gap-2 w-full hover:border-primary/40 hover:text-primary transition-colors"
        >
          <PenLine size={14} />
          Submit Your Own
        </Button>
      </>
    )
  }

  return (
    <Link href={submitRoute}>
      <Button
        variant="outline"
        size="sm"
        className="gap-2 w-full hover:border-primary/40 hover:text-primary transition-colors"
      >
        <PenLine size={14} />
        Submit Your Own
      </Button>
    </Link>
  )
}