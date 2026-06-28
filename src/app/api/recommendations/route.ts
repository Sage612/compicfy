import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { recommendationSchema } from '@/lib/utils/validators'
import {
  enforceRecLimit,
  enforceDailyRecLimit,
  incrementDailyCount,
  checkGlobalDailyCap,
  incrementGlobalCount,
  getUserContributionScore,
  checkSoftCap,
} from '@/lib/utils/proEnforce'

type ExistingRec = {
  id:          string
  title:       string
  is_approved: boolean
}

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page   = parseInt(searchParams.get('page')  ?? '1')
    const limit  = parseInt(searchParams.get('limit') ?? '24')
    const type   = searchParams.get('type')   ?? ''
    const genre  = searchParams.get('genre')  ?? ''
    const status = searchParams.get('status') ?? ''
    const sort   = searchParams.get('sort')   ?? 'score'
    const q      = searchParams.get('q')      ?? ''
    const adult  = searchParams.get('adult')  === 'true'
    const offset = (page - 1) * limit

    // @ts-expect-error - custom RPC
    const { data, error } = await supabase.rpc('search_recommendations', {
      p_query:  q      || null,
      p_type:   type   || null,
      p_genre:  genre  || null,
      p_status: status || null,
      p_sort:   sort,
      p_adult:  adult,
      p_limit:  limit,
      p_offset: offset,
    })

    if (error) throw error

    let countQuery = supabase
      .from('recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('is_approved', true)
      .eq('is_draft', false)

    if (adult) {
      countQuery = countQuery.in('content_rating', ['adult', 'mature'])
    } else {
      countQuery = countQuery.not('content_rating', 'in', '("adult","mature")')
    }

    if (q)      countQuery = countQuery.or(`title.ilike.%${q}%,author.ilike.%${q}%,artist.ilike.%${q}%,description.ilike.%${q}%`)
    if (type)   countQuery = countQuery.eq('type', type as any)
    if (genre)  countQuery = countQuery.contains('genres', [genre])
    if (status) countQuery = countQuery.eq('status', status)

    const { count } = await countQuery

    return NextResponse.json({
      recommendations: data ?? [],
      total:   count ?? 0,
      page,
      limit,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch (error) {
    console.error('Failed to fetch recommendations:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role, is_banned, is_pro, pro_expires_at')
      .eq('id', user.id)
      .single()

    const profile = profileData as {
      role:           string
      is_banned:      boolean
      is_pro:         boolean
      pro_expires_at: string | null
    } | null

    if (profile?.is_banned) {
      return NextResponse.json({ error: 'Your account has been banned' }, { status: 403 })
    }

    const isAdminOrMod = ['admin', 'moderator'].includes(profile?.role ?? '')

    // ── Monthly limit (free users only) ───────────────────────────────────────
    const { allowed: monthlyOk, error: monthlyError } = await enforceRecLimit(user.id)
    if (!monthlyOk) return monthlyError!

    // ── Daily limit (all non-admin users) ─────────────────────────────────────
    if (!isAdminOrMod) {
      const { allowed: dailyOk, error: dailyError } = await enforceDailyRecLimit(user.id)
      if (!dailyOk) return dailyError!
    }

    const body    = await request.json()
    const asDraft = body.save_as_draft === true

    const parsed = recommendationSchema.safeParse(body)
    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.issues },
        { status: 400 }
      )
    }

    const data = parsed.data

    // ── Skip duplicate check for drafts ───────────────────────────────────────
    if (!asDraft) {
      const { data: existing } = (await supabase
        .from('recommendations')
        .select('id, title, is_approved')
        .ilike('title', data.title.trim())
        .eq('is_draft', false)
        .single()) as { data: ExistingRec | null }

      if (existing) {
        return NextResponse.json(
          {
            error:       'duplicate',
            message:     `"${existing.title}" has already been recommended.`,
            existing_id: existing.id,
            is_approved: existing.is_approved,
          },
          { status: 409 }
        )
      }
    }

    // ── Global daily cap check (non-admin, non-draft) ─────────────────────────
    if (!isAdminOrMod && !asDraft) {
      const { isPeakHour, capReached } = await checkGlobalDailyCap()

      if (isPeakHour) {
        const score     = await getUserContributionScore(user.id)
        const highTrust = score >= 50

        const insertDraft = {
          user_id:            user.id,
          title:              data.title,
          description:        data.description,
          type:               data.type,
          status:             data.status,
          genres:             data.genres,
          official_platforms: data.official_platforms,
          cover_url:          data.cover_url    || null,
          content_rating:     data.content_rating,
          why_recommend:      data.why_recommend || null,
          author:             data.author        || null,
          artist:             data.artist        || null,
          year_released:      data.year_released || null,
          chapter_count:      data.chapter_count || null,
          is_approved:        false,
          is_draft:           true,
          draft_saved_at:     new Date().toISOString(),
          is_pro_submission:  !!(profile?.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())),
          mangaupdates_id:    body.mangaupdates_id || null,
          anilist_id:         body.anilist_id      || null,
          mal_id:             body.mal_id          || null,
          mangadex_id:        body.mangadex_id     || null,
        }

        const { data: draft, error: draftError } = await (supabase as any)
          .from('recommendations')
          .insert(insertDraft as any)
          .select()
          .single()

        if (draftError) {
          return NextResponse.json({ error: draftError.message }, { status: 500 })
        }

        return NextResponse.json(
          {
            peak_hour:  true,
            high_trust: highTrust,
            draft_id:   draft.id,
            message:    capReached ? 'peak_cap' : 'peak_spike',
          },
          { status: 202 }
        )
      }
    }

    const isAutoApproved  = isAdminOrMod
    const isProSubmission = isAdminOrMod || !!(
      profile?.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date())
    )

    const insertData = {
      user_id:            user.id,
      title:              data.title,
      description:        data.description,
      type:               data.type,
      status:             data.status,
      genres:             data.genres,
      official_platforms: data.official_platforms,
      cover_url:          data.cover_url    || null,
      content_rating:     data.content_rating,
      why_recommend:      data.why_recommend || null,
      author:             data.author        || null,
      artist:             data.artist        || null,
      year_released:      data.year_released || null,
      chapter_count:      data.chapter_count || null,
      is_approved:        isAutoApproved,
      is_draft:           asDraft,
      draft_saved_at:     asDraft ? new Date().toISOString() : null,
      is_pro_submission:  isProSubmission,
      mangaupdates_id:    body.mangaupdates_id || null,
      anilist_id:         body.anilist_id      || null,
      mal_id:             body.mal_id          || null,
      mangadex_id:        body.mangadex_id     || null,
    }

    const { data: recommendation, error } = await supabase
      .from('recommendations')
      .insert(insertData as any)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // ── Increment counters only for real submissions ───────────────────────────
    if (!asDraft) {
      await Promise.all([
        incrementDailyCount(user.id),
        incrementGlobalCount(),
      ])

      // ── Soft cap warning for next submission ──────────────────────────────────
      const softCap = await checkSoftCap(user.id)
      return NextResponse.json(
        {
          recommendation,
          ...(softCap.isNearLimit ? {
            soft_cap_warning: true,
            remaining:        softCap.remaining,
            message:          `You have ${softCap.remaining} submission${softCap.remaining === 1 ? '' : 's'} left today.`,
          } : {}),
        },
        { status: 201 }
      )
    }

    return NextResponse.json({ recommendation }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}