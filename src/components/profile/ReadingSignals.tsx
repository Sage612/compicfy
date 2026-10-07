import { Sparkles } from 'lucide-react'
import type { SignalsData } from '@/lib/profile/getProfileExtras'

// Every row is optional. A row renders only when its data exists, and the
// whole card disappears if no row has anything to show.

function formatHour(h: number): string {
  const hour = ((Math.round(h) % 24) + 24) % 24
  const suffix = hour >= 12 ? 'pm' : 'am'
  const twelve = hour % 12 === 0 ? 12 : hour % 12
  return `${twelve}${suffix}`
}

function formatSession(hours: number): string {
  if (hours < 1) return `${Math.max(1, Math.round(hours * 60))} min`
  return `${hours.toFixed(1).replace(/\.0$/, '')}h`
}

function readerType(peakHour: number | null, avgHours: number | null): string | null {
  if (peakHour === null) return null
  const marathon = (avgHours ?? 0) >= 2
  if (peakHour >= 22 || peakHour < 4) return marathon ? 'Midnight Marathoner' : 'Midnight Reader'
  if (peakHour < 11)                  return marathon ? 'Dawn Marathoner'     : 'Early Bird'
  if (peakHour < 17)                  return marathon ? 'Daylight Marathoner' : 'Daytime Reader'
  return marathon ? 'Evening Marathoner' : 'Evening Reader'
}

const DROP_COLOR = {
  'very low': 'text-emerald-500',
  'low':      'text-emerald-500',
  'moderate': 'text-amber-500',
  'high':     'text-red-500',
} as const

interface Row {
  label: string
  value: string
  tone?: string
}

interface Props {
  signals: SignalsData
}

export function ReadingSignals({ signals }: Props) {
  const type = readerType(signals.peakHour, signals.avgSessionHours)

  const rows: Row[] = []
  if (signals.avgSessionHours !== null) {
    rows.push({ label: 'Avg session', value: formatSession(signals.avgSessionHours) })
  }
  if (signals.peakHour !== null) {
    rows.push({ label: 'Peak hour', value: `around ${formatHour(signals.peakHour)}` })
  }
  if (signals.dropRate) {
    rows.push({
      label: 'Drop rate',
      value: `${signals.dropRate.pct}% (${signals.dropRate.label})`,
      tone:  DROP_COLOR[signals.dropRate.label],
    })
  }
  if (signals.totalSessions > 0) {
    rows.push({ label: 'Sessions logged', value: signals.totalSessions.toLocaleString() })
  }
  if (type) rows.push({ label: 'Reader type', value: type, tone: 'text-primary' })

  if (rows.length === 0 && !signals.dedication) return null

  return (
    <section className="space-y-2">
      <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground">
        Reading signals
      </p>
      <div className="rounded-2xl border border-border bg-card overflow-hidden">
        {rows.length > 0 && (
          <div className="divide-y divide-border/60">
            {rows.map(r => (
              <div key={r.label} className="flex items-center justify-between gap-4 px-4 py-3">
                <span className="text-sm text-muted-foreground">{r.label}</span>
                <span className={`text-sm font-black text-right ${r.tone ?? ''}`}>{r.value}</span>
              </div>
            ))}
          </div>
        )}
        {signals.dedication && (
          <div className={`flex items-center gap-2 px-4 py-3 bg-primary/5 text-primary text-xs font-semibold ${rows.length > 0 ? 'border-t border-border/60' : ''}`}>
            <Sparkles size={14} className="shrink-0" />
            Top {signals.dedication.topPct}% most dedicated reader
          </div>
        )}
      </div>
    </section>
  )
}