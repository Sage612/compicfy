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
    if (!user) return NextResponse.json({ drafts: [] })

    const { data } = (await supabase
      .from('recommendations')
      .select('id, title, why_recommend')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
      .limit(20)) as { data: DraftRecommendation[] | null }

    const drafts = (data ?? [])
      .filter(r => !r.why_recommend || r.why_recommend.trim().length === 0)
      .slice(0, 10)
      .map(r => ({ id: r.id, title: r.title }))

    return NextResponse.json({ drafts })
  } catch {
    return NextResponse.json({ drafts: [] })
  }
}