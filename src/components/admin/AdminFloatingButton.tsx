'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Shield } from 'lucide-react'
import { cn } from '@/lib/utils/cn'

export function AdminFloatingButton() {
  const pathname = usePathname()
  const isOnAdmin = pathname.startsWith('/admin')

  if (isOnAdmin) return null

  return (
    <Link
      href="/admin"
      className={cn(
        'fixed bottom-20 right-4 z-50 md:bottom-6 md:right-6',
        'w-12 h-12 rounded-full shadow-lg',
        'bg-primary text-primary-foreground',
        'flex items-center justify-center',
        'hover:scale-110 active:scale-95 transition-transform',
        'ring-2 ring-background'
      )}
      title="Admin Dashboard"
    >
      <Shield size={20} />
    </Link>
  )
}