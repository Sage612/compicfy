'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils'

export function AdminFloatingButton() {
  const pathname = usePathname()
  if (pathname.startsWith('/admin')) return null

  return (
    <Link
      href="/admin"
      title="Admin Dashboard"
      className={cn(
        'fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6',
        'w-12 h-12 rounded-full',
        'bg-gradient-to-br from-primary to-violet-500',
        'flex items-center justify-center',
        'shadow-lg shadow-primary/30',
        'hover:scale-110 active:scale-95 transition-transform',
        'ring-2 ring-background'
      )}
    >
      <Shield size={19} className="text-white" />
    </Link>
  )
}