'use client'

import { useState } from 'react'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
)

const ID_FIELDS = [
  { key: 'mangaupdates_id', label: 'MangaUpdates', urlBase: 'https://www.mangaupdates.com/series/' },
  { key: 'mangadex_id',     label: 'MangaDex',     urlBase: 'https://mangadex.org/title/' },
  { key: 'anilist_id',      label: 'AniList',      urlBase: 'https://anilist.co/manga/' },
  { key: 'mal_id',          label: 'MyAnimeList',  urlBase: 'https://myanimelist.net/manga/' },
] as const

type IdField = (typeof ID_FIELDS)[number]['key']

interface ExternalIdsPanelProps {
  comicId:      string
  initialIds:   Partial<Record<IdField, string | null>>
  initialLocks: string[] // subset of ID_FIELDS keys
  onSaved?:     (locked: string[]) => void
}

export default function ExternalIdsPanel({
  comicId, initialIds, initialLocks, onSaved,
}: ExternalIdsPanelProps) {
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(ID_FIELDS.map(f => [f.key, initialIds[f.key] ?? '']))
  )
  const [locked, setLocked] = useState<Set<string>>(new Set(initialLocks))
  const [savingField, setSavingField] = useState<string | null>(null)
  const [savedField, setSavedField]   = useState<string | null>(null)
  const [error, setError]             = useState<string | null>(null)

  async function persist(nextValues: Record<string, string>, nextLocked: Set<string>, field: string) {
    setSavingField(field)
    setError(null)
    try {
      const payload: Record<string, any> = {
        id_locked_fields: [...nextLocked],
      }
      for (const f of ID_FIELDS) {
        payload[f.key] = nextValues[f.key]?.trim() ? nextValues[f.key].trim() : null
      }
      const { error: dbError } = await supabase
        .from('recommendations')
        .update(payload)
        .eq('id', comicId)

      if (dbError) throw dbError

      setSavedField(field)
      onSaved?.([...nextLocked])
      setTimeout(() => setSavedField(null), 1500)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save')
    } finally {
      setSavingField(null)
    }
  }

  function handleValueChange(field: string, val: string) {
    setValues(prev => ({ ...prev, [field]: val }))
  }

  function handleBlur(field: string) {
    persist(values, locked, field)
  }

  function toggleLock(field: string) {
    const next = new Set(locked)
    if (next.has(field)) next.delete(field)
    else next.add(field)
    setLocked(next)
    persist(values, next, field)
  }

  return (
    <div className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-medium text-foreground">External IDs</h3>
        {error && <span className="text-xs text-destructive">{error}</span>}
      </div>

      <p className="text-xs text-muted-foreground">
        Locked fields are skipped entirely by the automated ID checker — use this when a match
        is wrong, or when a series genuinely isn't listed on a given source.
      </p>

      <div className="space-y-2">
        {ID_FIELDS.map(({ key, label, urlBase }) => {
          const isLocked  = locked.has(key)
          const isSaving  = savingField === key
          const justSaved = savedField === key
          const val       = values[key]

          return (
            <div key={key} className="flex items-center gap-2">
              <label className="w-28 shrink-0 text-xs text-muted-foreground">{label}</label>

              <input
                type="text"
                value={val}
                onChange={(e) => handleValueChange(key, e.target.value)}
                onBlur={() => handleBlur(key)}
                placeholder="Not set"
                className="flex-1 min-w-0 rounded-md border border-input bg-background px-2 py-1.5 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />

              {val && (
                <a
                  href={`${urlBase}${val}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-xs text-muted-foreground hover:text-foreground underline shrink-0"
                >
                  view
                </a>
              )}

              <button
                type="button"
                onClick={() => toggleLock(key)}
                title={isLocked ? 'Locked — cron will not touch this field' : 'Unlocked — cron may update this field'}
                className={`shrink-0 rounded-md px-2 py-1.5 text-xs font-medium transition-colors ${
                  isLocked
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                }`}
              >
                {isLocked ? 'Locked' : 'Lock'}
              </button>

              <span className="w-10 shrink-0 text-xs text-muted-foreground">
                {isSaving ? 'Saving…' : justSaved ? 'Saved' : ''}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}