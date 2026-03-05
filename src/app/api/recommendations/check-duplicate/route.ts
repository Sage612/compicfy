import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const title = searchParams.get('title')?.trim()

  if (!title || title.length < 2) {
    return NextResponse.json({ duplicate: null })
  }

  const supabase = await createClient()

  const { data } = await (supabase as any)
    .from('recommendations')
    .select('id, title, is_approved')
    .ilike('title', title)
    .single()

  if (!data) {
    return NextResponse.json({ duplicate: null })
  }

  return NextResponse.json({
    duplicate: {
      id: data.id,
      title: data.title,
      is_approved: data.is_approved,
    },
  })
}