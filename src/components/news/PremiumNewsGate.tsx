import { Crown, Lock } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface Props {
  previewLines?: number
  children: React.ReactNode
}

export function PremiumNewsGate({ previewLines = 3, children }: Props) {
  return (
    <div className="relative">
      {/* Blurred preview */}
      <div
        className="overflow-hidden"
        style={{
          WebkitMaskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          maskImage: 'linear-gradient(to bottom, black 40%, transparent 100%)',
          maxHeight: `${previewLines * 1.75}rem`,
        }}
      >
        {children}
      </div>

      {/* Gate overlay */}
      <div className="mt-4 flex flex-col items-center gap-4 py-8 px-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 text-center">
        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-lg shadow-amber-500/20">
          <Lock size={20} className="text-white" />
        </div>
        <div className="space-y-1">
          <p className="font-black text-base">Premium Article</p>
          <p className="text-sm text-muted-foreground max-w-xs leading-relaxed">
            This article is exclusive to ComPicfy Pro subscribers.
          </p>
        </div>
        <Link href="/pricing">
          <Button className="gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white shadow-md shadow-amber-500/20">
            <Crown size={14} />
            Unlock with Pro — from $4.99/mo
          </Button>
        </Link>
      </div>
    </div>
  )
}