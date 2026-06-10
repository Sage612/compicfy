'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { usePathname, useRouter } from 'next/navigation'
import { toast } from 'sonner'
import {
  Plus, X, Layers, BookMarked, Shield, Crown, Loader2,
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
  const pathname    = usePathname()
  const router      = useRouter()
  const [open, setOpen]       = useState(false)
  const [creating, setCreating] = useState<'list' | 'collection' | null>(null)
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

  const handleNewList = async () => {
    if (listAtLimit) {
      toast.error(`Free users can create up to ${FREE_LIST_LIMIT} lists — upgrade to Pro`)
      setOpen(false)
      return
    }
    // Navigate to lists page where the create form lives
    setOpen(false)
    router.push('/lists?create=1')
  }

  const handleNewCollection = async () => {
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
      label:   'Admin Dashboard',
      icon:    Shield,
      href:    '/admin',
      color:   'bg-rose-500 text-white shadow-rose-500/30',
      isLink:  true,
    }] : []),
    {
      label:   listAtLimit ? 'Upgrade for Lists' : 'New Reading List',
      icon:    listAtLimit ? Crown : BookMarked,
      onClick: handleNewList,
      color:   listAtLimit
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30'
        : 'bg-card text-foreground border border-border shadow-black/10',
      isLink: false,
    },
    {
      label:   collectionAtLimit ? 'Upgrade for Collections' : 'New Collection',
      icon:    collectionAtLimit ? Crown : Layers,
      onClick: handleNewCollection,
      color:   collectionAtLimit
        ? 'bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-amber-500/30'
        : 'bg-card text-foreground border border-border shadow-black/10',
      isLink: false,
    },
  ]

  return (
    // lg:hidden — on desktop the admin button and inline create buttons handle this
    <div ref={ref} className="lg:hidden fixed bottom-28 right-4 z-50 flex flex-col items-end gap-3">

      {/* ── Action buttons — fan upward when open ── */}
      <div className={cn(
        'flex flex-col items-end gap-2.5 transition-all duration-200',
        open ? 'opacity-100 translate-y-0 pointer-events-auto' : 'opacity-0 translate-y-4 pointer-events-none'
      )}>
        {actions.map((action, i) => {
          const Icon = action.icon
          const inner = (
            <>
              {/* Label chip */}
              <span className="bg-background/90 backdrop-blur-sm border border-border text-foreground text-xs font-semibold px-3 py-1.5 rounded-full shadow-sm whitespace-nowrap">
                {action.label}
              </span>
              {/* Icon button */}
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
              className="flex items-center gap-3"
            >
              {inner}
            </Link>
          ) : (
            <button
              key={i}
              onClick={action.onClick}
              className="flex items-center gap-3"
            >
              {inner}
            </button>
          )
        })}
      </div>

      {/* ── Main FAB ── */}
      <button
        onClick={() => setOpen(o => !o)}
        className={cn(
          'w-14 h-14 rounded-full shadow-2xl flex items-center justify-center',
          'transition-all duration-200 active:scale-95',
          open
            ? 'bg-foreground text-background rotate-45'
            : isAdmin
            ? 'bg-primary text-primary-foreground'
            : 'bg-primary text-primary-foreground hover:bg-primary/90'
        )}
        aria-label={open ? 'Close menu' : 'Create new'}
      >
        {open ? <X size={22} /> : <Plus size={24} />}
      </button>
    </div>
  )
}