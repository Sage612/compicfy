'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, BookMarked, FileText, Table, Loader2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { formatDate } from '@/lib/utils/format'

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
}

export function ExportClient({ lists }: Props) {
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
      toast.success(`${format.toUpperCase()} exported successfully!`)
    } catch {
      toast.error('Export failed. Please try again.')
    } finally {
      setExporting(null)
    }
  }

  const itemCount = (list: ReadingList) => list.reading_list_items?.[0]?.count ?? 0

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Download size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Export Lists</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Download your reading lists as CSV or PDF
        </p>
      </div>

      {/* Format info */}
      <div className="grid grid-cols-2 gap-3">
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <Table size={14} className="text-teal-500" />
            <span className="text-sm font-black">CSV</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Spreadsheet format. Open in Excel, Google Sheets, or Numbers.
          </p>
        </div>
        <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
          <div className="flex items-center gap-2">
            <FileText size={14} className="text-rose-500" />
            <span className="text-sm font-black">PDF</span>
          </div>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Formatted document. Print or share as a reading guide.
          </p>
        </div>
      </div>

      {/* Lists */}
      {lists.length === 0 ? (
        <div className="text-center py-16 rounded-2xl border border-dashed border-border space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-muted flex items-center justify-center mx-auto">
            <BookMarked size={22} className="text-muted-foreground opacity-40" />
          </div>
          <div>
            <p className="font-black text-sm">No reading lists yet</p>
            <p className="text-xs text-muted-foreground mt-1">Create reading lists to export them</p>
          </div>
        </div>
      ) : (
        <div className="space-y-3">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
            Your Lists ({lists.length})
          </h2>
          {lists.map((list) => {
            const count = itemCount(list)
            const csvKey = `${list.id}-csv`
            const pdfKey = `${list.id}-pdf`

            return (
              <div key={list.id} className="p-4 rounded-2xl border border-border bg-card space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-black text-sm truncate">{list.name}</p>
                    {list.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1 mt-0.5">{list.description}</p>
                    )}
                    <p className="text-[10px] text-muted-foreground mt-1">
                      {count} comic{count !== 1 ? 's' : ''}
                      {list.created_at ? ` · Created ${formatDate(list.created_at)}` : ''}
                    </p>
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(list.id, 'csv')}
                    disabled={!!exporting || count === 0}
                    className={cn(
                      'gap-1.5 flex-1',
                      exported.includes(csvKey) && 'border-emerald-500/40 text-emerald-600'
                    )}
                  >
                    {exporting === csvKey ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : exported.includes(csvKey) ? (
                      <CheckCircle size={13} />
                    ) : (
                      <Table size={13} />
                    )}
                    CSV
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleExport(list.id, 'pdf')}
                    disabled={!!exporting || count === 0}
                    className={cn(
                      'gap-1.5 flex-1',
                      exported.includes(pdfKey) && 'border-emerald-500/40 text-emerald-600'
                    )}
                  >
                    {exporting === pdfKey ? (
                      <Loader2 size={13} className="animate-spin" />
                    ) : exported.includes(pdfKey) ? (
                      <CheckCircle size={13} />
                    ) : (
                      <FileText size={13} />
                    )}
                    PDF
                  </Button>
                </div>

                {count === 0 && (
                  <p className="text-[10px] text-muted-foreground">Add comics to this list to export it</p>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
