import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const {
      favorite_genres,
      comic_url,
      patreon_url,
      kickstarter_url,
    } = await request.json()

    const updateData: Record<string, any> = {
      favorite_genres:      favorite_genres ?? [],
      onboarding_completed: true,
      updated_at:           new Date().toISOString(),
    }

    // Creator links — only write if provided
    if (comic_url       !== undefined) updateData.comic_url       = comic_url       || null
    if (patreon_url     !== undefined) updateData.patreon_url     = patreon_url     || null
    if (kickstarter_url !== undefined) updateData.kickstarter_url = kickstarter_url || null

    const { error } = await (supabase as any)
      .from('profiles')
      .update(updateData)
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch {
    return NextResponse.json({ error: 'Failed to complete onboarding' }, { status: 500 })
  }
}