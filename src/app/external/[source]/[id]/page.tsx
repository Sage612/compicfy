import { notFound } from 'next/navigation'
import Link from 'next/link'
import type { Metadata } from 'next'
import { BookOpen, Globe, Star, Plus, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/server'

interface MangaDetail {
  id: string
  title: string
  alternativeTitles: string[]
  author: string
  artist: string
  description: string
  genres: string[]
  type: string
  status: string
  coverUrl: string
  year: number | null
  chapters: number | null
  score: number | null
  source: 'jikan' | 'anilist' | 'mangaupdates'
}

const TYPE_COLORS: Record<string, string> = {
  manga:   'bg-rose-500/10   text-rose-500   border-rose-500/20',
  manhwa:  'bg-teal-500/10 text-teal-500 border-teal-500/20',
  manhua:  'bg-amber-500/10  text-amber-500  border-amber-500/20',
  webtoon: 'bg-teal-500/10   text-teal-500   border-teal-500/20',
  comic:   'bg-blue-500/10   text-blue-500   border-blue-500/20',
  other:   'bg-zinc-500/10   text-zinc-400   border-zinc-500/20',
}

const SOURCE_LABELS: Record<string, string> = {
  jikan:        'MyAnimeList',
  anilist:      'AniList',
  mangaupdates: 'MangaUpdates',
}

interface Props {
  params: Promise<{ source: string; id: string }>
}

async function getDetail(source: string, id: string): Promise<MangaDetail | null> {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? ''
  try {
    const res = await fetch(
      `${base}/api/manga-details?source=${encodeURIComponent(source)}&id=${encodeURIComponent(id)}`,
      { cache: 'no-store' }
    )
    if (!res.ok) return null
    const data = await res.json()
    return data.result ?? null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { source, id } = await params
  const detail = await getDetail(source, id)
  if (!detail) return { title: 'Not found · ComPicfy' }
  return {
    title: `${detail.title} · ComPicfy`,
    description: detail.description?.slice(0, 160),
  }
}

function buildPrefillUrl(result: MangaDetail, isPro: boolean): string {
  const base = isPro
    ? '/pro/reader/dashboard/recommendations/new'
    : '/reader/dashboard/recommendations/new'
  const params = new URLSearchParams({
    title:       result.title       ?? '',
    author:      result.author      ?? '',
    artist:      result.artist      ?? '',
    description: result.description?.slice(0, 2000) ?? '',
    type:        result.type        ?? 'manga',
    status:      result.status      ?? 'ongoing',
    cover_url:   result.coverUrl    ?? '',
    ...(result.year     ? { year_released: String(result.year)     } : {}),
    ...(result.chapters ? { chapter_count: String(result.chapters) } : {}),
    genres: (result.genres ?? []).slice(0, 5).join(','),
  })
  return `${base}?${params.toString()}`
}

export default async function ExternalDetailPage({ params }: Props) {
  const { source, id } = await params
  const detail = await getDetail(source, id)

  if (!detail) notFound()

  // Determine pro status for the recommend CTA prefill target
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  let isPro = false
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, pro_expires_at, role')
      .eq('id', user.id)
      .single() as { data: any }
    isPro =
      profile?.role === 'admin' ||
      (profile?.is_pro &&
        (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  }

  const typeColor  = TYPE_COLORS[detail.type] ?? TYPE_COLORS.other
  const prefillUrl = buildPrefillUrl(detail, isPro)

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6">

      <Link
        href="/search"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft size={14} />
        Back to search
      </Link>

      <div className="flex gap-5 flex-col sm:flex-row">
        <div className="w-40 h-[224px] rounded-2xl overflow-hidden bg-muted shrink-0 shadow-md mx-auto sm:mx-0">
          {detail.coverUrl
            ? <img src={detail.coverUrl} alt={detail.title} className="w-full h-full object-cover" />
            : <div className="w-full h-full flex items-center justify-center"><BookOpen size={28} className="text-muted-foreground opacity-40" /></div>
          }
        </div>

        <div className="flex-1 min-w-0 space-y-3">
          <div className="space-y-1.5">
            <h1 className="text-2xl font-black leading-tight">{detail.title}</h1>
            {detail.alternativeTitles.length > 0 && (
              <p className="text-sm text-muted-foreground">
                {detail.alternativeTitles.join(' · ')}
              </p>
            )}
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border bg-primary/10 text-primary border-primary/20">
              <Globe size={10} />
              {SOURCE_LABELS[detail.source] ?? detail.source}
            </span>
            <span className={cn('inline-flex px-2.5 py-1 rounded-full text-xs font-bold border capitalize', typeColor)}>
              {detail.type}
            </span>
            <span className="text-xs text-muted-foreground capitalize px-1">{detail.status}</span>
            {detail.score != null && detail.score > 0 && (
              <span className="flex items-center gap-1 text-xs text-amber-500 font-bold">
                <Star size={11} className="fill-amber-400" />
                {detail.score.toFixed(1)}
              </span>
            )}
          </div>

          <div className="text-sm text-muted-foreground space-y-0.5">
            {detail.author && <p>Author: <span className="text-foreground">{detail.author}</span></p>}
            {detail.artist && detail.artist !== detail.author && (
              <p>Artist: <span className="text-foreground">{detail.artist}</span></p>
            )}
            {detail.year && <p>Year: <span className="text-foreground">{detail.year}</span></p>}
            {detail.chapters && <p>Chapters: <span className="text-foreground">{detail.chapters}</span></p>}
          </div>

          {detail.genres.length > 0 && (
            <div className="flex flex-wrap gap-1.5">
              {detail.genres.map(g => (
                <span key={g} className="px-2 py-0.5 rounded-full text-[11px] font-medium border border-border text-muted-foreground">
                  {g}
                </span>
              ))}
            </div>
          )}

          <Link href={prefillUrl}>
            <Button size="sm" className="gap-1.5 mt-2">
              <Plus size={13} />
              Recommend to ComPicfy
            </Button>
          </Link>
        </div>
      </div>

      {detail.description && (
        <div className="space-y-2 pt-2 border-t border-border">
          <h2 className="text-xs font-black uppercase tracking-widest text-muted-foreground">Synopsis</h2>
          <p className="text-sm leading-relaxed whitespace-pre-line">{detail.description}</p>
        </div>
      )}
    </div>
  )
}