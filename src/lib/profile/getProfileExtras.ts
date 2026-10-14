// src/lib/profile/getProfileExtras.ts
//
// One server-side helper that loads everything the new profile sections need,
// so page.tsx only gains a single call. Built against the generated
// database.types.ts (reading_progress, reading_activity, pinned_quotes,
// reading_signals view, journal_entries, reading_list_items).
//
// Streak numbers are NOT fetched here: they already live on `profiles`
// (current_streak / longest_streak) and come with the profile row.

import type { createClient } from '@/lib/supabase/server'

type Supa = Awaited<ReturnType<typeof createClient>>

// Supabase types a to-one embed as an object, but be tolerant of an array.
function one<T>(v: T | T[] | null | undefined): T | null {
  if (!v) return null
  return Array.isArray(v) ? (v[0] ?? null) : v
}

// ── Tunables ────────────────────────────────────────────────────────
// reading_list_items.status value that means "dropped". If your app uses a
// different string (e.g. 'abandoned'), change it here.
const DROPPED_STATUS   = 'dropped'
const COMPLETED_STATUS = 'completed'
// Don't show a drop rate until there are at least this many finished-or-
// dropped series; 1 dropped out of 2 is noise, not a trait.
const MIN_FINISHED_FOR_DROP_RATE = 5
// Only brag when it's actually a brag. Hide the percentile above this.
const MAX_TOP_PCT_TO_SHOW = 25

export interface ObsessedData {
  comicId:        string
  title:          string
  author:         string | null
  coverUrl:       string | null
  currentChapter: number
  totalChapters:  number | null
}

export interface QuoteData {
  id:           string
  text:         string
  chapterLabel: string | null
  stampCount:   number
  comicId:      string | null
  comicTitle:   string | null
  coverUrl:     string | null
}

export interface DropRateData {
  pct:   number
  label: 'very low' | 'low' | 'moderate' | 'high'
}

export interface DedicationData {
  topPct:      number
  readerCount: number
}

export interface GenreProfile {
  points:     { axis: string; pct: number }[]   // pct = % of the user's comics carrying that genre
  comicCount: number
}

// A radar needs at least 3 axes, and a profile built from 1-2 comics is noise.
const MIN_COMICS_FOR_RADAR  = 3
const MIN_GENRES_FOR_RADAR  = 3
const MAX_RADAR_AXES        = 6

// Every field is optional/nullable: the card renders only what exists and
// hides itself entirely when nothing does.
export interface SignalsData {
  avgSessionHours: number | null
  peakHour:        number | null
  totalSessions:   number
  totalHours:      number | null
  dropRate:        DropRateData | null
  dedication:      DedicationData | null
}

export interface JournalItem {
  id:           string
  content:      string
  chapterLabel: string | null
  moodEmoji:    string | null
  isSpoiler:    boolean
  likeCount:    number
  replyCount:   number
  createdAt:    string
  comicId:      string | null
  comicTitle:   string | null
  coverUrl:     string | null
}

export interface ProfileExtras {
  obsessed:          ObsessedData | null
  quote:             QuoteData | null
  signals:           SignalsData | null
  totalChaptersRead: number
  totalHours:        number | null
  journal:           JournalItem[]
  genreProfile:      GenreProfile | null
}

function dropLabel(pct: number): DropRateData['label'] {
  if (pct <= 15) return 'very low'
  if (pct <= 30) return 'low'
  if (pct <= 50) return 'moderate'
  return 'high'
}

async function getDropRate(supabase: Supa, profileId: string): Promise<DropRateData | null> {
  const { data: lists } = await supabase
    .from('reading_lists')
    .select('id')
    .eq('user_id', profileId)

  const listIds = (lists ?? []).map(l => l.id)
  if (listIds.length === 0) return null

  const [dropped, completed] = await Promise.all([
    supabase
      .from('reading_list_items')
      .select('*', { count: 'exact', head: true })
      .in('list_id', listIds)
      .eq('status', DROPPED_STATUS),
    supabase
      .from('reading_list_items')
      .select('*', { count: 'exact', head: true })
      .in('list_id', listIds)
      .eq('status', COMPLETED_STATUS),
  ])

  const d = dropped.count ?? 0
  const c = completed.count ?? 0
  const finished = d + c
  if (finished < MIN_FINISHED_FOR_DROP_RATE) return null

  const pct = Math.round((d / finished) * 100)
  return { pct, label: dropLabel(pct) }
}

export async function getProfileExtras(
  supabase: Supa,
  profileId: string,
  opts: { includeJournal?: boolean; includeTaste?: boolean } = {},
): Promise<ProfileExtras> {
  const [
    progressRes, activityRes, quoteRes, signalsRes, journalRes, dropRate, dedicationRes, genreRes, hoursRes,
  ] = await Promise.all([
    // Most recently touched series the user is actively reading
    supabase
      .from('reading_progress')
      .select('current_chapter, total_chapters, recommendations(id, title, author, cover_url, chapter_count)')
      .eq('user_id', profileId)
      .eq('is_actively_reading', true)
      .order('last_read_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Lifetime chapters = sum of daily activity rows
    supabase
      .from('reading_activity')
      .select('chapters_read')
      .eq('user_id', profileId),

    // The pinned quote (is_pinned = true), newest if somehow several
    supabase
      .from('pinned_quotes')
      .select('id, quote_text, chapter_label, stamp_count, recommendations(id, title, cover_url)')
      .eq('user_id', profileId)
      .eq('is_pinned', true)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle(),

    // Aggregates only — raw reading_sessions stay private (owner-only RLS)
    supabase
      .from('reading_signals')
      .select('avg_session_hours, peak_hour, total_sessions')
      .eq('user_id', profileId)
      .maybeSingle(),

    // Journal is only fetched when its tab is open
    opts.includeJournal
      ? supabase
          .from('journal_entries')
          .select('id, content, chapter_label, mood_emoji, is_spoiler, like_count, reply_count, created_at, recommendations(id, title, cover_url)')
          .eq('user_id', profileId)
          .order('created_at', { ascending: false })
          .limit(30)
      : Promise.resolve({ data: null }),

    getDropRate(supabase, profileId),

    // Needs migration 20261007_dedication_percentile.sql. Until it is
    // applied this errors; we swallow that and simply show no percentile.
    (supabase as any).rpc('get_dedication_percentile', { p_user_id: profileId }),

    // Needs migration 20261007_genre_profile.sql. Only fetched on the taste
    // tab. If the function is missing the call errors, genreRes.data is null
    // and the radar falls back to favourite genres.
    opts.includeTaste
      ? (supabase as any).rpc('get_user_genre_profile', { p_user_id: profileId })
      : Promise.resolve({ data: null }),

    // Needs migration 20261014_journal_likes_and_hours.sql. Total only; the
    // raw sessions stay private. Errors are swallowed (no hours shown).
    (supabase as any).rpc('get_total_reading_hours', { p_user_id: profileId }),
  ])

  // ── Genre profile (activity-based radar data) ──
  let genreProfile: GenreProfile | null = null
  const genreRows = (genreRes?.data ?? []) as { genre: string; comic_count: number; total_comics: number }[]
  if (genreRows.length >= MIN_GENRES_FOR_RADAR) {
    const total = Number(genreRows[0].total_comics ?? 0)
    if (total >= MIN_COMICS_FOR_RADAR) {
      genreProfile = {
        comicCount: total,
        points: genreRows.slice(0, MAX_RADAR_AXES).map(r => ({
          axis: r.genre,
          pct:  Math.round((Number(r.comic_count) / total) * 100),
        })),
      }
    }
  }

  // ── Currently obsessed ──
  // The reading list is the single source of truth for chapter progress
  // (progress_chapter / last_read_at), so updating a list and logging a
  // session always agree. Completed and dropped series are skipped.
  // reading_progress is only a fallback for older rows. ──
  let obsessed: ObsessedData | null = null
  {
    const { data: listRows } = await supabase
      .from('reading_lists')
      .select('id')
      .eq('user_id', profileId)

    const listIds = (listRows ?? []).map(l => l.id)
    if (listIds.length > 0) {
      const { data: itemRows } = await supabase
        .from('reading_list_items')
        .select('progress_chapter, recommendations(id, title, author, cover_url, chapter_count, content_rating)')
        .in('list_id', listIds)
        .gt('progress_chapter', 0)
        .or('status.is.null,status.not.in.(completed,dropped)')
        .order('last_read_at', { ascending: false, nullsFirst: false })
        .limit(5)

      for (const row of (itemRows ?? []) as any[]) {
        const rec = one<any>(row.recommendations)
        if (!rec || rec.content_rating === 'adult' || rec.content_rating === 'mature') continue
        obsessed = {
          comicId:        rec.id,
          title:          rec.title,
          author:         rec.author ?? null,
          coverUrl:       rec.cover_url ?? null,
          currentChapter: row.progress_chapter ?? 0,
          totalChapters:  rec.chapter_count ?? null,
        }
        break
      }
    }
  }


  // Fallback: legacy reading_progress rows.
  if (!obsessed && progressRes.data) {
    const p   = progressRes.data as any
    const rec = one<any>(p.recommendations)
    if (rec) {
      obsessed = {
        comicId:        rec.id,
        title:          rec.title,
        author:         rec.author ?? null,
        coverUrl:       rec.cover_url ?? null,
        currentChapter: p.current_chapter ?? 0,
        totalChapters:  p.total_chapters ?? rec.chapter_count ?? null,
      }
    }
  }

  // ── Lifetime chapters ──
  const totalChaptersRead = (activityRes.data ?? []).reduce(
    (sum, r) => sum + (r.chapters_read ?? 0),
    0,
  )

  // ── Pinned quote ──
  let quote: QuoteData | null = null
  if (quoteRes.data) {
    const q   = quoteRes.data as any
    const rec = one<any>(q.recommendations)
    quote = {
      id:           q.id,
      text:         q.quote_text,
      chapterLabel: q.chapter_label ?? null,
      stampCount:   q.stamp_count ?? 0,
      comicId:      rec?.id ?? null,
      comicTitle:   rec?.title ?? null,
      coverUrl:     rec?.cover_url ?? null,
    }
  }

  // ── Dedication percentile ──
  let dedication: DedicationData | null = null
  const ded = (dedicationRes?.data ?? [])[0] as { top_pct: number; reader_count: number } | undefined
  if (ded && ded.top_pct <= MAX_TOP_PCT_TO_SHOW) {
    dedication = { topPct: ded.top_pct, readerCount: ded.reader_count }
  }

  // ── Reading signals (sessions + drop rate + dedication) ──
  const sessionCount = Number(signalsRes.data?.total_sessions ?? 0)
  const hasSessions  = sessionCount > 0
  const totalHours   = hasSessions && hoursRes?.data != null && Number(hoursRes.data) > 0 ? Number(hoursRes.data) : null
  let signals: SignalsData | null = null
  if (hasSessions || dropRate || dedication) {
    signals = {
      avgSessionHours: hasSessions && signalsRes.data?.avg_session_hours != null
        ? Number(signalsRes.data.avg_session_hours) : null,
      peakHour: hasSessions && signalsRes.data?.peak_hour != null
        ? Number(signalsRes.data.peak_hour) : null,
      totalSessions: sessionCount,
      totalHours,
      dropRate,
      dedication,
    }
  }

  // ── Journal ──
  const journal: JournalItem[] = ((journalRes.data ?? []) as any[]).map(j => {
    const rec = one<any>(j.recommendations)
    return {
      id:           j.id,
      content:      j.content,
      chapterLabel: j.chapter_label ?? null,
      moodEmoji:    j.mood_emoji ?? null,
      isSpoiler:    !!j.is_spoiler,
      likeCount:    j.like_count ?? 0,
      replyCount:   j.reply_count ?? 0,
      createdAt:    j.created_at,
      comicId:      rec?.id ?? null,
      comicTitle:   rec?.title ?? null,
      coverUrl:     rec?.cover_url ?? null,
    }
  })

  return { obsessed, quote, signals, totalHours, totalChaptersRead, journal, genreProfile }
}