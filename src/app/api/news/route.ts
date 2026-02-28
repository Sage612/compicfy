import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { newsSchema } from '@/lib/utils/validators'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '12')
    const category = searchParams.get('category')
    const q = searchParams.get('q')
    const offset = (page - 1) * limit

    let query = supabase
      .from('news')
      .select('*', { count: 'exact' })
      .eq('is_published', true)
      .order('published_at', { ascending: false })

    if (category) query = query.eq('category', category)
    if (q) query = query.ilike('title', `%${q}%`)

    query = query.range(offset, offset + limit - 1)

    const { data, error, count } = await query
    if (error) throw error

    return NextResponse.json({
      news: data,
      total: count,
      page,
      hasMore: (count ?? 0) > offset + limit,
    })
  } catch {
    return NextResponse.json({ error: 'Failed to fetch news' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase
  .from('profiles')
  .select('role')
  .eq('id', user.id)
  .single()

const profile = profileData as { role: string } | null

if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = newsSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: parsed.error.flatten() },
        { status: 400 }
      )
    }

    // Generate slug from title
    const slug = parsed.data.title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') +
      '-' + Date.now()

    const { data: news, error } = await (supabase as any)
  .from('news')
  .insert({
        ...parsed.data,
        slug,
        published_by: user.id,
        is_published: body.is_published ?? false,
        published_at: body.is_published ? new Date().toISOString() : null,
        is_ai_generated: body.is_ai_generated ?? false,
        ai_model: body.ai_model ?? null,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ news }, { status: 201 })
  } catch {
    return NextResponse.json({ error: 'Failed to create news' }, { status: 500 })
  }
}