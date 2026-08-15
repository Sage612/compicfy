// src/components/import/ImportListModal.tsx
'use client'

import { useState, useRef } from 'react'
import { X, Upload, Loader2, CheckCircle2, AlertCircle, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Source = 'myanimelist' | 'anilist'

interface SkippedTitle {
  title: string
  reason: string
}

interface JobResult {
  job: {
    id: string
    matched_count: number
    skipped_count: number
    skipped_titles: SkippedTitle[]
  }
  list: {
    id: string
    name: string
  }
  parseErrors: string[]
}

interface Props {
  open: boolean
  onClose: () => void
  /** Called after a successful import, with the new list's id — parent can navigate/refresh */
  onImported?: (listId: string) => void
}

const SOURCE_OPTIONS: { value: Source; label: string; hint: string }[] = [
  { value: 'myanimelist', label: 'MyAnimeList', hint: 'Profile → Export List → Manga' },
  { value: 'anilist',     label: 'AniList',      hint: 'Settings → Account → Export (MAL-format XML)' },
]

export function ImportListModal({ open, onClose, onImported }: Props) {
  const [source, setSource]   = useState<Source>('myanimelist')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [result, setResult]   = useState<JobResult | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  if (!open) return null

  const reset = () => {
    setFile(null)
    setError(null)
    setResult(null)
    setLoading(false)
  }

  const handleClose = () => {
    reset()
    onClose()
  }

  const handleFileSelect = (f: File | null) => {
    setError(null)
    if (f && !f.name.toLowerCase().endsWith('.xml')) {
      setError('Please select an .xml export file.')
      setFile(null)
      return
    }
    setFile(f)
  }

  const handleImport = async () => {
    if (!file) return
    setLoading(true)
    setError(null)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('source', source)

      const res = await fetch('/api/import/list', { method: 'POST', body: formData })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error ?? 'Import failed. Please try again.')
        setLoading(false)
        return
      }

      setResult(data)
      onImported?.(data.list.id)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={handleClose} />
      <div
        onClick={e => e.stopPropagation()}
        className="relative w-full sm:max-w-md bg-card rounded-t-2xl sm:rounded-2xl border border-border shadow-2xl overflow-hidden max-h-[85vh] sm:max-h-none overflow-y-auto"
      >
        <div className="flex items-center justify-between px-4 py-3 border-b border-border">
          <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">
            Import your list
          </p>
          <button onClick={handleClose} className="text-muted-foreground hover:text-foreground transition-colors">
            <X size={14} />
          </button>
        </div>

        <div className="p-4 space-y-4">
          {!result && (
            <>
              {/* Source selector */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Import from</p>
                <div className="grid grid-cols-2 gap-2">
                  {SOURCE_OPTIONS.map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => setSource(opt.value)}
                      disabled={loading}
                      className={cn(
                        'px-3 py-2.5 rounded-xl border text-left transition-all',
                        source === opt.value
                          ? 'border-primary bg-primary/10'
                          : 'border-border hover:border-primary/40'
                      )}
                    >
                      <p className="text-sm font-bold">{opt.label}</p>
                    </button>
                  ))}
                </div>
                <p className="text-[11px] text-muted-foreground">
                  {SOURCE_OPTIONS.find(o => o.value === source)?.hint}
                </p>
              </div>

              {/* File picker */}
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-muted-foreground">Export file (.xml)</p>
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={loading}
                  className={cn(
                    'w-full flex items-center gap-3 px-4 py-3 rounded-xl border border-dashed transition-colors text-left',
                    file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40'
                  )}
                >
                  {file
                    ? <FileText size={16} className="text-primary shrink-0" />
                    : <Upload size={16} className="text-muted-foreground shrink-0" />
                  }
                  <span className="text-sm truncate">
                    {file ? file.name : 'Choose a file…'}
                  </span>
                </button>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xml"
                  className="hidden"
                  onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
                />
              </div>

              {error && (
                <div className="flex items-start gap-2 px-3 py-2.5 rounded-xl bg-destructive/10 text-destructive text-xs">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <p>{error}</p>
                </div>
              )}

              <Button
                onClick={handleImport}
                disabled={!file || loading}
                className="w-full gap-2"
              >
                {loading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {loading ? 'Importing…' : 'Import list'}
              </Button>
            </>
          )}

          {result && (
            <div className="space-y-3">
              <div className="flex items-start gap-2.5 px-3.5 py-3 rounded-xl bg-primary/10 border border-primary/20">
                <CheckCircle2 size={16} className="text-primary shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-bold">
                    Imported {result.job.matched_count} of {result.job.matched_count + result.job.skipped_count} comics
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Added to "{result.list.name}"
                  </p>
                </div>
              </div>

              {result.job.skipped_titles.length > 0 && (
                <div className="space-y-1.5">
                  <p className="text-xs font-semibold text-muted-foreground">
                    {result.job.skipped_titles.length} couldn't be matched
                  </p>
                  <div className="max-h-40 overflow-y-auto space-y-1 rounded-xl border border-border p-2">
                    {result.job.skipped_titles.map((s, i) => (
                      <div key={i} className="text-xs px-2 py-1.5 rounded-lg bg-muted/40">
                        <p className="font-medium truncate">{s.title}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{s.reason}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              <Button onClick={handleClose} variant="outline" className="w-full">
                Done
              </Button>
            </div>
          )}
        </div>

        {!result && (
          <div className="sm:hidden border-t border-border">
            <button
              onClick={handleClose}
              className="w-full px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] text-sm font-semibold text-center text-muted-foreground hover:text-foreground transition-colors"
            >
              Cancel
            </button>
          </div>
        )}
      </div>
    </div>
  )
}