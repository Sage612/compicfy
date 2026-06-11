'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, X, Layers, BookMarked, Shield, Crown,
} from 'lucide-react'
import { cn } from '@/lib/utils'

const FREE_LIST_LIMIT       = 5
const FREE_COLLECTION_LIMIT = 3

interface Props {
  userId:               string | null
  isAdmin:              boolean
  isProUser:            boolean
  userListCount:        number
  userCollectionCount:  number
  myListsHref:          string
}

export function SpeedDialFAB({
  userId,
  isAdmin,
  isProUser,
  userListCount,
  userCollectionCount,
  myListsHref,
}: Props) {
  const pathname = usePathname()
  const router   = useRouter()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  // Hide on admin/dashboard pages
  const hidden =
    pathname.startsWith('/admin') ||
    pathname.startsWith('/reader/dashboard') ||
    pathname.startsWith('/pro/reader/dashboard') ||
    pathname.startsWith('/creator/dashboard') ||
    pathname.startsWith('/pro/creator/dashboard')

  if (hidden || !userId) return null

  const listAtLimit       = !isProUser && userListCount >= FREE_LIST_LIMIT
  const collectionAtLimit = !isProUser && userCollectionCount >= FREE_COLLECTION_LIMIT

  // Close on outside click
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  const handleNewList = () => {
    if (listAtLimit) {
      toast.error(`Free users can create up to ${FREE_LIST_LIMIT} lists — upgrade to Pro`)
      setOpen(false)
      return
    }
    setOpen(false)
    router.push('/lists?create=1')
  }

  const handleNewCollection = () => {
    if (collectionAtLimit) {
      toast.error(`Free users can create up to ${FREE_COLLECTION_LIMIT} collections — upgrade to Pro`)
      setOpen(false)
      return
    }
    setOpen(false)
    router.push('/collections?create=1')
  }

  const actions = [
    ...(isAdmin ? [{
      label:  'Admin Dashboard',
      icon:   Shield,
      color:  'bg-rose-500 text-white',
      isLink: true,
      href:   '/admin',
    }] : []),
    {
      label:  listAtLimit ? 'Upgrade for Lists' : 'New Reading List',
      icon:   listAtLimit ? Crown : BookMarked,
      color:  listAtLimit
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
        : 'bg-card text-foreground border border-border',
      isLink: false,
      onClick: handleNewList,
    },
    {
      label:  collectionAtLimit ? 'Upgrade for Collections' : 'New Collection',
      icon:   collectionAtLimit ? Crown : Layers,
      color:  collectionAtLimit
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white'
        : 'bg-card text-foreground border border-border',
      isLink: false,
      onClick: handleNewCollection,
    },
  ]

  return (
    <>
      {/* ── Backdrop — only when open, closes on tap ── */}
      {open && (
        <div
          className="lg:hidden fixed inset-0 z-40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* ── FAB container — w-fit so it never blocks taps when closed ── */}
      <div
        ref={ref}
        className="lg:hidden fixed bottom-28 right-4 z-50 flex flex-col items-end gap-3 w-fit"
      >
        {/* ── Action buttons — only rendered when open so they have zero hit area when closed ── */}
        {open && (
          <div className="flex flex-col items-end gap-2.5 w-fit">
            {actions.map((action, i) => {
              const Icon = action.icon
              const inner = (
                <>
                  <span className="bg-background/95 backdrop-blur-sm border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-md whitespace-nowrap">
                    {action.label}
                  </span>
                  <div className={cn(
                    'w-12 h-12 rounded-full flex items-center justify-center shadow-lg shrink-0',
                    action.color
                  )}>
                    <Icon size={18} />
                  </div>
                </>
              )

              return action.isLink ? (
                <Link
                  key={i}
                  href={(action as any).href}
                  onClick={() => setOpen(false)}
                  className="flex items-center gap-3 w-fit"
                >
                  {inner}
                </Link>
              ) : (
                <button
                  key={i}
                  onClick={(action as any).onClick}
                  className="flex items-center gap-3 w-fit"
                >
                  {inner}
                </button>
              )
            })}
          </div>
        )}

        {/* ── Main FAB ── */}
        <button
          onClick={() => setOpen(o => !o)}
          className={cn(
            'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center',
            'transition-all duration-200 active:scale-95',
            open
              ? 'bg-foreground text-background'
              : 'bg-primary text-primary-foreground hover:bg-primary/90'
          )}
          aria-label={open ? 'Close menu' : 'Create new'}
        >
          <div className={cn('transition-transform duration-200', open && 'rotate-45')}>
            <Plus size={24} />
          </div>
        </button>
      </div>
    </>
  )
}