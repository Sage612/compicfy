// src/components/import/ImportClient.tsx
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Upload, Loader2, CheckCircle2, AlertCircle, FileText, ArrowRight, BookMarked, UserPlus, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

type Source = 'myanimelist' | 'anilist'

interface SkippedTitle {
  title: string
  reason: string
  coverUrl: string | null
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

const SOURCE_OPTIONS: { value: Source; label: string; hint: string }[] = [
  { value: 'myanimelist', label: 'MyAnimeList', hint: 'Profile -> Export List -> Manga' },
  { value: 'anilist',     label: 'AniList',      hint: 'Settings -> Account -> Export (MAL-format XML)' },
]

export function ImportClient({ basePath = '/reader/dashboard/lists' }: { basePath?: string }) {
  const [source, setSource]   = useState<Source>('myanimelist')
  const [file, setFile]       = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError]     = useState<string | null>(null)
  const [result, setResult]   = useState<JobResult | null>(null)
  const [addingIndex, setAddingIndex] = useState<number | null>(null)
  const [addedIndexes, setAddedIndexes] = useState<Set<number>>(new Set())
  const fileInputRef = useRef<HTMLInputElement>(null)

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
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleImportAnother = () => {
    setFile(null)
    setError(null)
    setResult(null)
    setAddedIndexes(new Set())
  }

  const handleAddCustomEntry = async (skipped: SkippedTitle, index: number) => {
    if (!result || addingIndex !== null) return
    setAddingIndex(index)
    try {
      const res = await fetch('/api/custom-entries', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          list_id: result.list.id,
          title: skipped.title,
          cover_url: skipped.coverUrl,
          source: 'import',
        }),
      })
      if (!res.ok) return
      setAddedIndexes(prev => new Set([...prev, index]))
    } finally {
      setAddingIndex(null)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-cyan-600 flex items-center justify-center shadow-lg shadow-teal-500/20">
            <Upload size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Import Your List</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Bring your existing MyAnimeList or AniList tracking over to ComPicfy
        </p>
      </div>

      {!result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSource(opt.value)}
                disabled={loading}
                className={cn(
                  'p-4 rounded-2xl border bg-card space-y-2 text-left transition-all',
                  source === opt.value
                    ? 'border-primary bg-primary/5'
                    : 'border-border hover:border-primary/40'
                )}
              >
                <div className="flex items-center gap-2">
                  <span className={cn('text-sm font-black', source === opt.value ? 'text-primary' : 'text-foreground')}>
                    {opt.label}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  {opt.hint}
                </p>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-2xl border border-border bg-card space-y-3">
            <p className="text-sm font-semibold text-muted-foreground uppercase tracking-wider text-xs">
              Export file (.xml)
            </p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-xl border border-dashed transition-colors text-left',
                file ? 'border-primary/40 bg-primary/5' : 'border-border hover:border-primary/40'
              )}
            >
              {file
                ? <FileText size={16} className="text-primary shrink-0" />
                : <Upload size={16} className="text-muted-foreground shrink-0" />
              }
              <span className="text-sm truncate flex-1">
                {file ? file.name : 'Choose a file...'}
              </span>
              {file && (
                <span className="text-[10px] text-muted-foreground shrink-0">
                  {(file.size / 1024).toFixed(0)} KB
                </span>
              )}
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".xml"
              className="hidden"
              onChange={e => handleFileSelect(e.target.files?.[0] ?? null)}
            />

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
              {loading ? 'Importing...' : 'Import list'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            MangaUpdates, MangaBaka and more... import support is coming soon.
          </p>
        </>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-5 rounded-2xl border border-primary/20 bg-primary/5 space-y-3">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                <CheckCircle2 size={18} className="text-primary" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="font-black text-sm">
                  Imported {result.job.matched_count} of {result.job.matched_count + result.job.skipped_count} comics
                </p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Added to your new list, "{result.list.name}"
                </p>
              </div>
            </div>
            <Link href={`${basePath}/${result.list.id}`}>
              <Button size="sm" className="w-full gap-2">
                <BookMarked size={13} />
                View list
                <ArrowRight size={13} />
              </Button>
            </Link>
          </div>

          {result.job.skipped_titles.length > 0 && (
            <div className="p-4 rounded-2xl border border-border bg-card space-y-2">
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                {result.job.skipped_titles.length} couldn't be matched
              </p>
              <div className="max-h-72 overflow-y-auto space-y-1.5">
                {result.job.skipped_titles.map((s, i) => {
                  const added  = addedIndexes.has(i)
                  const adding = addingIndex === i
                  return (
                    <div key={i} className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-muted/40">
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-medium truncate">{s.title}</p>
                        <p className="text-muted-foreground text-[10px] mt-0.5">{s.reason}</p>
                      </div>
                      <Button
                        size="sm"
                        variant={added ? 'outline' : 'ghost'}
                        disabled={added || adding}
                        onClick={() => handleAddCustomEntry(s, i)}
                        className={cn(
                          'h-7 px-2.5 text-[11px] gap-1.5 shrink-0',
                          added && 'border-emerald-500/40 text-emerald-600'
                        )}
                      >
                        {adding
                          ? <Loader2 size={11} className="animate-spin" />
                          : added
                            ? <Check size={11} />
                            : <UserPlus size={11} />
                        }
                        {added ? 'Added' : 'Add'}
                      </Button>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <Button onClick={handleImportAnother} variant="outline" className="w-full">
            Import another list
          </Button>
        </div>
      )}
    </div>
  )
}