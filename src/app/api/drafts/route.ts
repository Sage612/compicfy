import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

type Recommendation = {
  id: string
  title: string
  is_approved: boolean
  why_recommend: string | null
}

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ drafts: [] })

    
    const { data } = await supabase
      .from('recommendations')
      .select('id, title, is_approved, why_recommend')
      .eq('user_id', user.id)
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
      .limit(10) as { data: Recommendation[] | null }

    // Only surface ones that are actually incomplete
    // (missing why_recommend = likely a draft)
    const drafts = (data ?? []).filter(r =>
      !r.why_recommend || (r.why_recommend ?? '').trim().length === 0
    )

    return NextResponse.json({ drafts })
  } catch {
    return NextResponse.json({ drafts: [] })
  }
}