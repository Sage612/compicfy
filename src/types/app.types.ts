// Hand-maintained convenience aliases for row types.
//
// database.types.ts is fully overwritten every time you run
// `supabase gen types typescript`. It only ever exports `Database`,
// `Tables<>`, `TablesInsert<>`, `TablesUpdate<>`, `Enums<>`,
// `CompositeTypes<>`, and `Constants` — never per-table aliases.
//
// Keep all app-level row aliases here instead of in database.types.ts
// so a regen can never delete them again.

import type { Tables } from './database.types'

export type Recommendation = Tables<'recommendations'>
export type Profile = Tables<'profiles'>
export type News = Tables<'news'>
export type Notification = Tables<'notifications'>
export type DailySubmissionCount = Tables<'daily_submission_counts'>
export type GlobalDailyStats = Tables<'global_daily_stats'>
export type ReadingProgress = Tables<'reading_progress'>
export type ReadingSession = Tables<'reading_sessions'>
export type PinnedQuote = Tables<'pinned_quotes'>
export type JournalEntry = Tables<'journal_entries'>
