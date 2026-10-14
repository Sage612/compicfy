// src/components/import/ImportClient.tsx
'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { PageShell, PageHeader } from '@/components/dashboard/PageHeader'

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
  { value: 'myanimelist', label: 'MyAnimeList', hint: 'Profile → Export List → Manga' },
  { value: 'anilist',     label: 'AniList',      hint: 'Settings → Account → Export (MAL-format XML)' },
]

export function ImportClient({
  basePath = '/reader/dashboard/lists',
  isPro = false,
}: { basePath?: string; isPro?: boolean }) {
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

  const backHref = basePath.replace(/\/lists$/, '') || '/'

  return (
    <PageShell width="narrow">

      <PageHeader
        eyebrow="Library"
        title="Import your list"
        subtitle="Bring your existing MyAnimeList or AniList tracking over to ComPicfy."
        backHref={backHref}
        backLabel="Dashboard"
        isPro={isPro}
      />

      {!result && (
        <>
          <div className="grid grid-cols-2 gap-3">
            {SOURCE_OPTIONS.map(opt => (
              <button
                key={opt.value}
                onClick={() => setSource(opt.value)}
                disabled={loading}
                className={cn(
                  'p-4 rounded-xl border bg-card space-y-1.5 text-left transition-colors',
                  source === opt.value
                    ? 'border-foreground'
                    : 'border-border hover:border-foreground/30'
                )}
              >
                <span className="font-dashboard-serif text-base text-foreground">{opt.label}</span>
                <p className="text-xs text-muted-foreground leading-relaxed">{opt.hint}</p>
              </button>
            ))}
          </div>

          <div className="p-4 rounded-xl border border-border bg-card space-y-3">
            <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">Export file (.xml)</p>
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={loading}
              className={cn(
                'w-full flex items-center gap-3 px-4 py-3.5 rounded-lg border border-dashed transition-colors text-left',
                file ? 'border-foreground/40' : 'border-border hover:border-foreground/30'
              )}
            >
              <span className="text-sm truncate flex-1">
                {file ? file.name : 'Choose a file…'}
              </span>
              {file && (
                <span className="text-[11px] text-muted-foreground shrink-0 tabular-nums">
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
              <p className="px-3 py-2 rounded-lg border border-destructive/30 text-destructive text-xs">{error}</p>
            )}

            <Button onClick={handleImport} disabled={!file || loading} className="w-full">
              {loading ? 'Importing…' : 'Import list'}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center">
            MangaUpdates, MangaBaka and more — import support is coming soon.
          </p>
        </>
      )}

      {result && (
        <div className="space-y-4">
          <div className="p-5 rounded-xl border border-foreground/30 bg-card space-y-3">
            <div>
              <p className="font-dashboard-serif text-lg text-foreground">
                Imported {result.job.matched_count} of {result.job.matched_count + result.job.skipped_count} comics
              </p>
              <p className="text-xs text-muted-foreground mt-0.5">
                Added to your new list, &ldquo;{result.list.name}&rdquo;
              </p>
            </div>
            <Link href={`${basePath}/${result.list.id}`}>
              <Button size="sm" className="w-full">View list</Button>
            </Link>
          </div>

          {result.job.skipped_titles.length > 0 && (
            <div className="p-4 rounded-xl border border-border bg-card space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground/70">
                <span className="tabular-nums">{result.job.skipped_titles.length}</span> couldn&apos;t be matched
              </p>
              <div className="max-h-72 overflow-y-auto divide-y divide-border">
                {result.job.skipped_titles.map((s, i) => {
                  const added  = addedIndexes.has(i)
                  const adding = addingIndex === i
                  return (
                    <div key={i} className="flex items-center gap-3 py-2.5">
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-foreground truncate">{s.title}</p>
                        <p className="text-muted-foreground text-[11px] mt-0.5">{s.reason}</p>
                      </div>
                      <Button
                        size="sm"
                        variant="outline"
                        disabled={added || adding}
                        onClick={() => handleAddCustomEntry(s, i)}
                        className="h-7 px-2.5 text-[11px] shrink-0"
                      >
                        {adding ? 'Adding…' : added ? 'Added' : 'Add'}
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
    </PageShell>
  )
}
