'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminFloatingButton() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null

  return (
    // hidden on mobile — SpeedDialFAB handles admin action there
    // only visible on desktop (lg+)
    <Link
      href="/admin"
      title="Admin Dashboard"
      className={cn(
        'hidden lg:flex',
        'fixed bottom-6 right-6 z-50',
        'w-12 h-12 rounded-full',
        'bg-primary',
        'items-center justify-center',
        'shadow-lg shadow-primary/30',
        'hover:scale-110 active:scale-95 transition-transform',
        'ring-2 ring-background'
      )}
    >
      <Shield size={19} className="text-primary-foreground" />
    </Link>
  )
}