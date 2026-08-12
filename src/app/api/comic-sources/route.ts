import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { isProUser } from '@/lib/access'

// Soft cap on personal sources per comic — prevents unbounded rows from a
// single user/comic pair without needing a hard product decision on the
// "right" number. Easy to bump if it turns out too tight in practice.
const MAX_SOURCES_PER_COMIC = 5

export async function GET(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const recommendationId = req.nextUrl.searchParams.get('recommendation_id')
  if (!recommendationId) return NextResponse.json({ error: 'recommendation_id required' }, { status: 400 })

  const { data, error } = await supabase
    .from('user_comic_sources')
    .select('*')
    .eq('user_id', user.id)
    .eq('recommendation_id', recommendationId)
    .order('created_at', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ sources: data ?? [] })
}

export async function POST(req: NextRequest) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single()

  if (!profile || !isProUser(profile as any)) {
    return NextResponse.json(
      { error: 'Pro required', message: 'Upgrade to Pro to save your own reading sources' },
      { status: 403 }
    )
  }

  const body = await req.json()
  const { recommendation_id, url, label, chapter_range } = body ?? {}

  if (!recommendation_id || !url?.trim() || !label?.trim()) {
    return NextResponse.json({ error: 'recommendation_id, url, and label are required' }, { status: 400 })
  }

  try {
    // eslint-disable-next-line no-new
    new URL(url)
  } catch {
    return NextResponse.json({ error: 'url must be a valid URL' }, { status: 400 })
  }

  const { count } = await supabase
    .from('user_comic_sources')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', user.id)
    .eq('recommendation_id', recommendation_id)

  if ((count ?? 0) >= MAX_SOURCES_PER_COMIC) {
    return NextResponse.json(
      { error: 'Limit reached', message: `You can save up to ${MAX_SOURCES_PER_COMIC} sources per comic` },
      { status: 403 }
    )
  }

  const { data, error } = await (supabase as any)
    .from('user_comic_sources')
    .insert({
      user_id: user.id,
      recommendation_id,
      url: url.trim(),
      label: label.trim(),
      chapter_range: chapter_range?.trim() || null,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ source: data })
}