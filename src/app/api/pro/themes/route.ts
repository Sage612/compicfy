import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { enforceProFeature } from '@/lib/utils/proEnforce'

const VALID_THEMES = ['default', 'gold', 'rose', 'teal', 'violet', 'amber', 'midnight']

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { theme } = await req.json()

    if (!VALID_THEMES.includes(theme)) {
      return NextResponse.json({ error: 'Invalid theme' }, { status: 400 })
    }

    // Default theme is free for everyone
    if (theme !== 'default') {
      const { allowed, error: proError } = await enforceProFeature(user.id, 'custom_themes')
      if (!allowed) return proError!
    }

    await (supabase as any)
      .from('profiles')
      .update({ profile_theme: theme, updated_at: new Date().toISOString() })
      .eq('id', user.id)

    return NextResponse.json({ success: true, theme })
  } catch (error) {
    console.error('Theme update error:', error)
    return NextResponse.json({ error: 'Failed to update theme' }, { status: 500 })
  }
}