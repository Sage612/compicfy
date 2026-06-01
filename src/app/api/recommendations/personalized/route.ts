import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const limit    = parseInt(searchParams.get('limit') ?? '12')
    const excludeId = searchParams.get('exclude') ?? null
    const mode     = searchParams.get('mode') ?? 'personalized'
    const comicId  = searchParams.get('comic_id') ?? null

    const { data: { user } } = await supabase.auth.getUser()

    // Determine allowed content ratings
    const ratingsParam   = searchParams.get('content_ratings')
    const contentRatings = ratingsParam ? ratingsParam.split(',') : ['all_ages', 'teen']

    if (mode === 'similar' && comicId) {
      // Fetch more than needed so we have room after filtering
      const { data, error } = await (supabase as any).rpc('get_similar_comics', {
        p_comic_id:        comicId,
        p_limit:           limit + 20, // fetch extra to cover filtered-out items
        p_content_ratings: contentRatings,
      })

      if (error) {
        console.error('Similar comics error:', error)
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      let results = (data ?? []) as any[]

      // Exclude the current comic itself
      results = results.filter((r: any) => r.id !== comicId)

      // Exclude current user's own submissions
      if (user?.id) {
        results = results.filter((r: any) => r.user_id !== user.id)
      }

      // Trim back to requested limit
      results = results.slice(0, limit)

      return NextResponse.json({ recommendations: results })
    }

    // Personalized recommendations — fetch extra to cover filtered-out items
    const { data, error } = await (supabase as any).rpc('get_personalized_recommendations', {
      p_user_id:         user?.id ?? null,
      p_exclude_id:      excludeId,
      p_limit:           limit + 20,
      p_content_ratings: contentRatings,
    })

    if (error) {
      console.error('Personalized recs error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    let results = (data ?? []) as any[]

    // Exclude current user's own submissions from their personalised feed
    if (user?.id) {
      results = results.filter((r: any) => r.user_id !== user.id)
    }

    // Trim back to requested limit
    results = results.slice(0, limit)

    return NextResponse.json({ recommendations: results })
  } catch (error) {
    console.error('Algorithm API error:', error)
    return NextResponse.json({ error: 'Failed to fetch recommendations' }, { status: 500 })
  }
}