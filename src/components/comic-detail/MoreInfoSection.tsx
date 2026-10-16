import { ExternalLink, ShieldCheck, Clock } from 'lucide-react'

interface MoreInfoSectionProps {
  link:       string | null
  source:     'user_submitted' | 'auto_fetched' | 'admin_approved' | null
  verifiedAt: string | null
}

function sourceLabel(source: MoreInfoSectionProps['source']) {
  switch (source) {
    case 'admin_approved': return 'Verified'
    case 'auto_fetched':   return 'Auto-matched'
    case 'user_submitted': return 'Community submitted'
    default:               return null
  }
}

function hostLabel(url: string) {
  try {
    const host = new URL(url).hostname.replace('www.', '')
    if (host.includes('mangaupdates')) return 'MangaUpdates'
    return host
  } catch {
    return 'More Info'
  }
}

export function MoreInfoSection({ link, source, verifiedAt }: MoreInfoSectionProps) {
  if (!link) return null

  const label     = sourceLabel(source)
  const isTrusted = source === 'admin_approved'

  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-bold uppercase tracking-widest text-dossier-foreground/70">
        More Info
      </p>
      <div className="flex items-center gap-2">
        <a
          href={link}
          target="_blank"
          rel="noopener noreferrer nofollow"
          className="flex items-center gap-1.5 pl-2.5 pr-2 py-1.5 rounded-full border border-dossier-foreground/10 bg-dossier-panel/40 text-xs text-dossier-foreground/90 hover:border-dossier-foreground/40 hover:text-dossier-foreground transition-colors shrink-0 whitespace-nowrap"
        >
          <span className="font-medium">More on {hostLabel(link)}</span>
          <ExternalLink size={10} className="text-dossier-foreground/65" />
        </a>

        {label && (
          <span
            className={`inline-flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-full border ${
              isTrusted
                ? 'text-primary border-primary/20 bg-primary/5'
                : 'text-dossier-foreground/65 border-dossier-foreground/10'
            }`}
            title={verifiedAt ? `Verified ${new Date(verifiedAt).toLocaleDateString()}` : undefined}
          >
            {isTrusted ? <ShieldCheck size={9} /> : <Clock size={9} />}
            {label}
          </span>
        )}
      </div>
    </div>
  )
}