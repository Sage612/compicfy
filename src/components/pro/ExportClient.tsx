'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { formatDate } from '@/lib/utils/format'
import { PageHeader } from '@/components/dashboard/PageHeader'

interface ReadingList {
  id: string
  name: string
  description: string | null
  is_public: boolean | null
  created_at: string | null
  reading_list_items: { count: number }[]
}

interface Props {
  lists: ReadingList[]
  backHref?: string
  isPro?:    boolean
}

export function ExportClient({ lists, backHref = '/pro/reader/dashboard', isPro = true }: Props) {
  const [exporting, setExporting] = useState<string | null>(null)
  const [exported, setExported] = useState<string[]>([])

  const handleExport = async (listId: string, format: 'csv' | 'pdf') => {
    const key = `${listId}-${format}`
    setExporting(key)

    try {
      const res = await fetch(`/api/pro/export?list_id=${listId}&format=${format}`)

      if (!res.ok) {
        const data = await res.json()
        toast.error(data.error ?? 'Export failed')
        return
      }

      const blob = await res.blob()
      const list = lists.find(l => l.id === listId)
      const filename = `${list?.name ?? 'reading-list'}-ComPicfy.${format}`

      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename
      document.body.appendChild(a)
      a.click()
      window.URL.revokeObjectURL(url)
      document.body.removeChild(a)

      setExported(prev => [...prev, key])
      toast.success(`${format.toUpperCase()} exported`)
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const itemCount = (list: ReadingList) => list.reading_list_items?.[0]?.count ?? 0

  return (
    <>
      <PageHeader
        eyebrow="Library"
        title="Export lists"
        subtitle="Download your reading lists as CSV or PDF."
        backHref={backHref}
        backLabel="Dashboard"
        isPro={isPro}
      />

      <dl className="grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <dt className="text-[11px] uppercase tracking-widest text-muted-foreground/70">CSV</dt>
          <dd className="text-xs text-muted-foreground leading-relaxed">
            Spreadsheet format. Open in Excel, Google Sheets, or Numbers.
          </dd>
        </div>
        <div className="rounded-xl border border-border bg-card p-4 space-y-1">
          <dt className="text-[11px] uppercase tracking-widest text-muted-foreground/70">PDF</dt>
          <dd className="text-xs text-muted-foreground leading-relaxed">
            Formatted document. Print or share as a reading guide.
          </dd>
        </div>
      </dl>

      {lists.length === 0 ? (
        <div className="text-center py-16 rounded-xl border border-dashed border-border space-y-1">
          <p className="font-dashboard-serif text-lg text-foreground">No reading lists yet</p>
          <p className="text-sm text-muted-foreground">Create reading lists to export them.</p>
        </div>
      ) : (
        <section className="space-y-3">
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
            Your lists <span className="tabular-nums">{lists.length}</span>
          </p>
          {lists.map((list) => {
            const count  = itemCount(list)
            const csvKey = `${list.id}-csv`
            const pdfKey = `${list.id}-pdf`

            return (
              <div key={list.id} className="rounded-xl border border-border bg-card p-4 space-y-3">
                <div className="min-w-0">
                  <p className="font-dashboard-serif text-base text-foreground truncate">{list.name}</p>
                  {list.description && (
                    <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{list.description}</p>
                  )}
                  <p className="text-[11px] text-muted-foreground mt-1">
                    {count} comic{count !== 1 ? 's' : ''}
                    {list.created_at ? ` · Created ${formatDate(list.created_at)}` : ''}
                  </p>
                </div>

                <div className="flex gap-2">
                  {([['csv', csvKey], ['pdf', pdfKey]] as const).map(([fmt, key]) => (
                    <Button
                      key={fmt}
                      size="sm"
                      variant="outline"
                      onClick={() => handleExport(list.id, fmt)}
                      disabled={!!exporting || count === 0}
                      className="flex-1"
                    >
                      {exporting === key
                        ? 'Preparing…'
                        : exported.includes(key)
                        ? `${fmt.toUpperCase()} · done`
                        : fmt.toUpperCase()}
                    </Button>
                  ))}
                </div>

                {count === 0 && (
                  <p className="text-[11px] text-muted-foreground">Add comics to this list to export it.</p>
                )}
              </div>
            )
          })}
        </section>
      )}
    </>
  )
}
