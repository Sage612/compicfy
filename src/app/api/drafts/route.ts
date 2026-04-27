import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type DraftRecommendation = {
  id: string
  title: string
  why_recommend: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      // Return empty instead of 401 — component handles gracefully
      return NextResponse.json({ drafts: [] })
    }

    const { data, error } = (await supabase
      .from('recommendations')
      .select('id, title, why_recommend')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(50)) as { data: DraftRecommendation[] | null; error: any }

    if (error) {
      console.error('[/api/recommendations/drafts]', error)
      return NextResponse.json({ drafts: [] })
    }

    const drafts = (data ?? [])
      .filter(r => {
        const why = (r.why_recommend ?? '').toString().trim()
        return why.length === 0
      })
      .slice(0, 10)
      .map(r => ({ id: r.id, title: r.title }))

    return NextResponse.json({ drafts })
  } catch (err) {
    console.error('[/api/recommendations/drafts] unexpected:', err)
    return NextResponse.json({ drafts: [] })
  }
}