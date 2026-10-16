// src/components/comic-detail/OfficialPlatforms.tsx
// The comic's official platforms as readable rows with a "Read" button.
// Replaces the old Sources tab / desktop chip row with one layout for every screen.

import { ExternalLink, Globe } from 'lucide-react'
import { resolvePlatformIcon } from '@/lib/utils/platformIcons'

export function OfficialPlatforms({ platforms }: { platforms: { name: string; link: string | null }[] }) {
  if (platforms.length === 0) return null

  return (
    <div className="space-y-2">
      <p className="font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.2em] text-dossier-foreground/65">
        Official platforms
      </p>
      <div className="space-y-2">
        {platforms.map(platform => {
          const icon = resolvePlatformIcon(platform.name)
          return (
            <div
              key={platform.name}
              className="flex items-center justify-between gap-3 rounded-xl border border-dossier-foreground/10 bg-dossier-panel/30 px-4 py-3"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="shrink-0 w-8 h-8 rounded-lg flex items-center justify-center bg-dossier-panel border border-dossier-foreground/10">
                  {icon.kind === 'svg' ? (
                    <svg viewBox="0 0 24 24" width={14} height={14} aria-hidden="true">
                      <path d={icon.path} fill={icon.hex} />
                    </svg>
                  ) : icon.kind === 'monogram' ? (
                    <span
                      className="w-5 h-5 rounded flex items-center justify-center text-[11px] font-bold"
                      style={{ background: icon.bg, color: icon.fg }}
                      aria-hidden="true"
                    >
                      {icon.letter}
                    </span>
                  ) : (
                    <Globe size={14} className="text-dossier-foreground/65" />
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-dossier-foreground truncate">{platform.name}</p>
                  <p className="text-[11px] text-dossier-foreground/65">Official</p>
                </div>
              </div>
              {platform.link && (
                <a
                  href={platform.link}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-dossier-foreground text-dossier text-xs font-semibold hover:opacity-90 transition-opacity"
                >
                  Read
                  <ExternalLink size={11} />
                </a>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}