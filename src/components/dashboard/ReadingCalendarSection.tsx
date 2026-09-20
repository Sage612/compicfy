interface Props {
  // Map of 'YYYY-MM-DD' -> chapters_read, for the lookback window
  activityByDate: Record<string, number>
  weeks?: number // default 16, matching the mockup
}

function intensityClass(chapters: number, max: number): string {
  if (chapters === 0) return 'bg-muted'
  const ratio = max > 0 ? chapters / max : 0
  if (ratio > 0.75) return 'bg-foreground'
  if (ratio > 0.5)  return 'bg-foreground/70'
  if (ratio > 0.25) return 'bg-foreground/45'
  return 'bg-foreground/25'
}

export function ReadingCalendarSection({ activityByDate, weeks = 16 }: Props) {
  const days = weeks * 7
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const cells: { date: string; chapters: number }[] = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    const key = d.toISOString().slice(0, 10)
    cells.push({ date: key, chapters: activityByDate[key] ?? 0 })
  }

  const max = Math.max(1, ...cells.map(c => c.chapters))

  // Render as `weeks` columns of 7 rows (Sun-Sat), like a GitHub-style grid
  const columns: typeof cells[] = []
  for (let i = 0; i < cells.length; i += 7) {
    columns.push(cells.slice(i, i + 7))
  }

  return (
    <div>
      <p className="text-[11px] uppercase tracking-widest text-muted-foreground/60 mb-1">Reading calendar</p>
      <h2 className="font-dashboard-serif text-xl mb-3">{weeks} weeks of ink</h2>

      <div className="rounded-2xl border border-border p-4">
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {columns.map((col, ci) => (
            <div key={ci} className="flex flex-col gap-1">
              {col.map(cell => (
                <div
                  key={cell.date}
                  title={`${cell.date}: ${cell.chapters} ch.`}
                  className={`w-2.5 h-2.5 rounded-sm ${intensityClass(cell.chapters, max)}`}
                />
              ))}
            </div>
          ))}
        </div>
        <div className="flex items-center gap-1.5 mt-3 text-[11px] text-muted-foreground/60">
          <span>Less</span>
          <div className="w-2.5 h-2.5 rounded-sm bg-muted" />
          <div className="w-2.5 h-2.5 rounded-sm bg-foreground/25" />
          <div className="w-2.5 h-2.5 rounded-sm bg-foreground/45" />
          <div className="w-2.5 h-2.5 rounded-sm bg-foreground/70" />
          <div className="w-2.5 h-2.5 rounded-sm bg-foreground" />
          <span>More</span>
        </div>
      </div>
    </div>
  )
}