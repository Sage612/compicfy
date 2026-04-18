import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFollowNotificationEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { following_id } = await request.json()
    if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })
    if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const { error } = await (supabase as any)
      .from('follows')
      .insert({ follower_id: user.id, following_id })

    if (error) throw error

    const { data: followerProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()

    const followerUsername    = (followerProfile as any)?.username    ?? 'someone'
    const followerDisplayName = (followerProfile as any)?.display_name ?? followerUsername
    const name = followerDisplayName || followerUsername

    await (supabase as any).from('notifications').insert({
      user_id: following_id,
      type: 'system',
      title: `${name} followed you`,
      content: `@${followerUsername} is now following you.`,
      data: { follower_id: user.id, username: followerUsername },
    })

    sendFollowNotificationEmail(
      following_id,
      followerUsername,
      followerDisplayName
    ).catch(console.error)

    return NextResponse.json({ following: true })
  } catch {
    return NextResponse.json({ error: 'Failed to follow' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read from URL search params — DELETE bodies are unreliable across browsers/fetch
    const { searchParams } = new URL(request.url)
    let following_id = searchParams.get('following_id')

    // Fallback: try body if param not present (some clients may still send body)
    if (!following_id) {
      try {
        const body = await request.json()
        following_id = body?.following_id ?? null
      } catch {
        // ignore parse errors
      }
    }

    if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id)

    if (error) throw error

    return NextResponse.json({ following: false })
  } catch {
    return NextResponse.json({ error: 'Failed to unfollow' }, { status: 500 })
  }
}