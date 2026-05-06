import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const limit = parseInt(searchParams.get('limit') ?? '12')
    const excludeId = searchParams.get('exclude') ?? null
    const mode = searchParams.get('mode') ?? 'personalized' // 'personalized' | 'similar'
    const comicId = searchParams.get('comic_id') ?? null

    const { data: { user } } = await supabase.auth.getUser()

    // Determine allowed content ratings
    const ratingsParam = searchParams.get('content_ratings')
    const contentRatings = ratingsParam
      ? ratingsParam.split(',')
      : ['all_ages', 'teen']

    if (mode === 'similar' && comicId) {
      // Similar comics for detail page
      const { data, error } = await (supabase as any).rpc('get_similar_comics', {
        p_comic_id: comicId,
        p_limit: limit,
        p_content_ratings: contentRatings,
      })

      if (error) {
        console.error('Similar comics error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json({ recommendations: data ?? [] })
    }

    // Personalized recommendations
    const { data, error } = await (supabase as any).rpc('get_personalized_recommendations', {
      p_user_id: user?.id ?? null,
      p_exclude_id: excludeId,
      p_limit: limit,
      p_content_ratings: contentRatings,
    })

    if (error) {
      console.error('Personalized recs error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ recommendations: data ?? [] })
  } catch (error) {
    console.error('Algorithm API error:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}