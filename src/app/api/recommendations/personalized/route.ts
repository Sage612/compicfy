import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  try {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    
    const mode = searchParams.get('mode') || 'grid'
    const comicId = searchParams.get('comic_id')
    const page = parseInt(searchParams.get('page') ?? '1')
    const limit = parseInt(searchParams.get('limit') ?? '24')
    const adult = searchParams.get('adult') === 'true'
    const offset = (page - 1) * limit

    const { data: { user } } = await supabase.auth.getUser()
    
    if (mode === 'similar' && comicId) {
      const { data: sourceComic } = await (supabase as any)
        .from('recommendations')
        .select('genres, type, author, artist, content_rating')
        .eq('id', comicId)
        .single()

      if (!sourceComic) {
        return NextResponse.json({ error: 'Source comic not found' }, { status: 404 })
      }

      if (user) {
        const { data: tasteProfile } = await (supabase as any)
          .from('user_taste_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single()

        if (tasteProfile && Object.keys(tasteProfile.genre_weights || {}).length > 0) {
          const { data: similarComics } = await (supabase as any).rpc('get_similar_comics_personalized', {
            p_source_comic_id: comicId,
            p_user_id: user.id,
            p_limit: limit,
            p_adult: adult
          } as any)

          const sharedGenres = (sourceComic.genres || []).filter((g: string) => 
            (tasteProfile.genre_weights || {})[g] > 0.3
          ) || []
          
          const explanation = sharedGenres.length > 0 
            ? `Because you like ${sharedGenres[0]}`
            : 'Similar to this'

          return NextResponse.json({
            recommendations: (similarComics || []).map((c: any) => ({
              ...c,
              isPersonalized: c.is_personalized,
              isWildcard: false
            })),
            personalized: true,
            explanation,
            source: 'hybrid_similarity'
          } as any)
        }
      }

      const { data: similarComics } = await (supabase as any).rpc('get_similar_comics_content_only', {
        p_source_comic_id: comicId,
        p_limit: limit,
        p_adult: adult
      } as any)

      const explanation = (sourceComic.genres || [])[0]
        ? `More ${sourceComic.genres[0]}`
        : 'Similar comics'

      return NextResponse.json({
        recommendations: (similarComics || []).map((c: any) => ({
          ...c,
          isPersonalized: false,
          isWildcard: false
        })),
        personalized: false,
        explanation,
        source: 'content_similarity'
      } as any)
    }

    if (!user) {
      const { data, count } = await (supabase as any)
        .from('recommendations')
        .select('*', { count: 'exact' })
        .eq('is_approved', true)
        .not('content_rating', 'in', '("adult","mature")')
        .order('score', { ascending: false })
        .range(offset, offset + limit - 1)
      
      return NextResponse.json({
        recommendations: data,
        total: count,
        personalized: false,
        explanation: 'Popular picks'
      } as any)
    }

    const { data: tasteProfile } = await (supabase as any)
      .from('user_taste_profiles')
      .select('*')
      .eq('user_id', user.id)
      .single()

    if (!tasteProfile || Object.keys(tasteProfile.genre_weights || {}).length === 0) {
      const { data, count } = await (supabase as any).rpc('get_diverse_recommendations', {
        p_user_id: user.id,
        p_limit: limit,
        p_offset: offset
      } as any)
      
      return NextResponse.json({
        recommendations: data,
        total: count,
        personalized: true,
        explanation: 'Discovering your taste...',
        isOnboarding: true
      } as any)
    }

    const wildcardCount = Math.floor(limit * 0.1)
    const personalizedCount = limit - wildcardCount

    const { data: personalized } = await (supabase as any)
      .from('personalized_recommendations')
      .select('recommendation_id, personalization_score, recommendations(*)')
      .eq('user_id', user.id)
      .order('personalization_score', { ascending: false })
      .range(offset, offset + personalizedCount - 1)

    let wildcards: any[] = []
    if (wildcardCount > 0 && page === 1) {
      const { data } = await (supabase as any).rpc('get_wildcard_recommendations', {
        p_user_id: user.id,
        p_limit: wildcardCount,
        p_exclude_ids: personalized?.map((p: any) => p.recommendation_id) ?? []
      } as any)
      wildcards = data ?? []
    }

    const combined = [
      ...(personalized?.map((p: any) => ({ 
        ...p.recommendations, 
        score: p.personalization_score, 
        isPersonalized: true 
      })) ?? []),
      ...(wildcards.map((w: any) => ({ ...w, isWildcard: true })))
    ]

    const { count } = await (supabase as any)
      .from('personalized_recommendations')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', user.id)

    const topGenre = Object.entries(tasteProfile.genre_weights || {})
      .sort((a: any, b: any) => b[1] - a[1])[0]?.[0]

    return NextResponse.json({
      recommendations: combined,
      total: count,
      personalized: true,
      explanation: topGenre ? `Because you love ${topGenre}` : 'Recommended for you',
      tasteProfile: {
        topGenres: Object.entries(tasteProfile.genre_weights || {})
          .sort((a: any, b: any) => b[1] - a[1])
          .slice(0, 3)
          .map(([g]: any) => g)
      }
    } as any)

  } catch (error) {
    console.error('Personalization error:', error)
    return NextResponse.json(
      { error: 'Failed to get recommendations' },
      { status: 500 }
    )
  }
}