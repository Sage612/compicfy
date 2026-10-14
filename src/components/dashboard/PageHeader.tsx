import Link from 'next/link'

interface PageShellProps {
  children: React.ReactNode
  // 'default' matches the dashboard home width. 'narrow' suits forms/settings.
  // 'wide' is for cover-grid pages (saved comics) that need more columns.
  width?: 'default' | 'narrow' | 'wide'
}

const WIDTH_CLASS = {
  narrow:  'max-w-2xl',
  default: 'max-w-4xl',
  wide:    'max-w-5xl',
} as const

export function PageShell({ children, width = 'default' }: PageShellProps) {
  return (
    <div className={`${WIDTH_CLASS[width]} mx-auto px-4 py-8 space-y-8`}>
      {children}
    </div>
  )
}

interface PageHeaderProps {
  title:      string
  eyebrow?:   string
  subtitle?:  string
  backHref?:  string
  backLabel?: string          // defaults to "Back"
  actions?:   React.ReactNode
  // Pro accounts get a quiet gold mark: "· Pro" in the eyebrow and a short
  // gold rule under the title. No icons, no badges, no extra chrome.
  isPro?:     boolean
}

export function PageHeader({ title, eyebrow, subtitle, backHref, backLabel = 'Back', actions, isPro = false }: PageHeaderProps) {
  return (
    <div className="space-y-3">
      {backHref && (
        <Link
          href={backHref}
          className="inline-block text-xs text-muted-foreground hover:text-foreground underline-offset-4 hover:underline transition-colors"
        >
          {backLabel}
        </Link>
      )}
      <div className="flex items-start justify-between gap-4">
        <div className="space-y-1 min-w-0">
          {(eyebrow || isPro) && (
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60">
              {eyebrow}
              {isPro && (
                <span className="text-amber-600 dark:text-amber-400">
                  {eyebrow ? ' · ' : ''}Pro
                </span>
              )}
            </p>
          )}
          <h1 className="font-dashboard-serif text-3xl md:text-4xl text-foreground">{title}</h1>
          {isPro && (
            <span aria-hidden className="block h-0.5 w-10 rounded-full bg-gradient-to-r from-amber-400 to-amber-600 mt-2" />
          )}
          {subtitle && <p className="text-sm text-muted-foreground pt-1">{subtitle}</p>}
        </div>
        {actions && <div className="shrink-0 flex items-center gap-2">{actions}</div>}
      </div>
    </div>
  )
}