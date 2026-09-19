import Link from 'next/link'
import { ArrowRight } from 'lucide-react'

interface Props {
  title:    string
  features: string[]
  ctaLabel: string
}

/**
 * Shared by the reader dashboard and CuratorPanel. Deliberately quiet — even
 * the upsell should read in the same restrained voice as the rest of the
 * dashboard, not shout with gradients and icon boxes.
 */
export function ProUpsellCard({ title, features, ctaLabel }: Props) {
  return (
    <div className="rounded-2xl border border-border p-5 space-y-3">
      <div className="space-y-1">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{features.join(' · ')}</p>
      </div>
      <Link
        href="/pricing"
        className="inline-flex items-center gap-1.5 text-sm font-medium hover:underline"
      >
        {ctaLabel} <ArrowRight size={12} />
      </Link>
    </div>
  )
}