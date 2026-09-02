import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()
  const limit = Math.min(parseInt(searchParams.get('limit') ?? '12', 10) || 12, 25)

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  const supabase = await createClient()

  const { data, error } = await supabase.rpc('search_profiles', {
    search_query: query,
    similarity_threshold: 0.2,
    match_limit: limit,
  })

  if (error) {
    console.error('User search error:', error)
    return NextResponse.json({ results: [] })
  }

  const results = (data ?? []).map((p: any) => ({
    id: p.id,
    username: p.username,
    displayName: p.display_name,
    avatarUrl: p.avatar_url,
    bio: p.bio,
    isPro: p.is_pro || p.is_patron,
    isPatron: p.is_patron,
    isAdmin: p.role === 'admin',
  }))

  return NextResponse.json({ results })
}