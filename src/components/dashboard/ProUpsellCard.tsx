import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Zap, ArrowRight } from 'lucide-react'

interface Props {
  title:    string
  features: string[]
  ctaLabel: string
}

/**
 * Mirrors the "Unlock Pro Creator" card on the Creator dashboard, just
 * re-themed to primary (blue/violet) instead of teal so it reads as
 * Reader/Curator rather than Creator, and made reusable so both the
 * reader dashboard and the Curator tab can drop it in with their own
 * feature list.
 */
export function ProUpsellCard({ title, features, ctaLabel }: Props) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/20 bg-gradient-to-br from-primary/5 to-transparent p-5">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shrink-0">
          <Zap size={16} className="text-white" />
        </div>
        <div className="flex-1 min-w-0 space-y-1">
          <p className="font-black text-sm">{title}</p>
          <div className="flex flex-wrap gap-1.5 pt-1">
            {features.map(f => (
              <span key={f} className="px-2 py-0.5 rounded-full text-[10px] bg-primary/10 text-primary border border-primary/20 font-medium">
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
      <Link href="/pricing" className="block mt-4">
        <Button size="sm" className="w-full gap-1.5">
          {ctaLabel} <ArrowRight size={12} />
        </Button>
      </Link>
    </div>
  )
}