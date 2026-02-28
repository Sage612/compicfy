import { ExternalLink } from 'lucide-react'

interface Props {
  url: string
  disclaimer?: string
}

export function AffiliateBadge({ url, disclaimer }: Props) {
  return (
    <div className="space-y-2">
      <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-yellow-500/10 border border-yellow-500/20 text-xs text-yellow-600 font-medium">
        <span>💰</span>
        Affiliate Link
      </div>
      {disclaimer && (
        <p className="text-xs text-muted-foreground italic">{disclaimer}</p>
      )}
      
          <a
              href={url}
        target="_blank"
        rel="noopener noreferrer sponsored"
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
      >
        <ExternalLink size={14} />
        Check it out
      </a>
    </div>
  )
}