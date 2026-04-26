import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ drafts: [] })

    
    const { data } = await supabase
      .from('recommendations')
      .select('id, title, is_approved, cover_url, description')
      .eq('user_id', user.id)
      .eq('is_approved', false)
      .order('created_at', { ascending: false })
      .limit(10)

    // Only surface ones that are actually incomplete
    // (missing cover or very short description = likely a draft)
    const drafts = (data ?? []).filter(r =>
      !r.cover_url || (r.description ?? '').length < 30
    )

    return NextResponse.json({ drafts })
  } catch {
    return NextResponse.json({ drafts: [] })
  }
}