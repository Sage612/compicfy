import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFollowNotificationEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { following_id } = body

    if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })
    if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

    // ── Step 1: Insert follow ─────────────────────────────────────
    const { error: followError } = await (supabase as any)
      .from('follows')
      .insert({ follower_id: user.id, following_id })

    if (followError) {
      console.error('[follows/POST] insert error:', followError)
      // 23505 = unique_violation — already following, treat as success
      if (followError.code === '23505') {
        return NextResponse.json({ following: true })
      }
      return NextResponse.json({ error: followError.message }, { status: 500 })
    }

    // ── Step 2: Get follower profile ──────────────────────────────
    const { data: followerProfile } = await supabase
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()

    const followerUsername    = (followerProfile as any)?.username    ?? 'someone'
    const followerDisplayName = (followerProfile as any)?.display_name ?? followerUsername
    const name = followerDisplayName || followerUsername
    
    try {
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: following_id,
          type:    'follow',   // ← will work once you update the constraint (see below)
          title:   `${name} started following you`,
          content: `@${followerUsername} is now following you.`,
          data:    { follower_id: user.id, username: followerUsername },
        })
    } catch (notifErr) {
      // Non-fatal — follow already succeeded
      console.error('[follows/POST] notification error (non-fatal):', notifErr)
    }

    // ── Step 4: Email (fire and forget) ──────────────────────────
    sendFollowNotificationEmail(
      following_id,
      followerUsername,
      followerDisplayName
    ).catch((e) => console.error('[follows/POST] email error:', e))

    return NextResponse.json({ following: true })

  } catch (err) {
    console.error('[follows/POST] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to follow' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Read from URL search params — DELETE bodies are unreliable
    const { searchParams } = new URL(request.url)
    let following_id = searchParams.get('following_id')

    // Fallback: try body
    if (!following_id) {
      try {
        const body = await request.json()
        following_id = body?.following_id ?? null
      } catch {
        // ignore
      }
    }

    if (!following_id) {
      return NextResponse.json({ error: 'following_id required' }, { status: 400 })
    }

    const { error } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id)

    if (error) {
      console.error('[follows/DELETE] error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ following: false })

  } catch (err) {
    console.error('[follows/DELETE] unexpected error:', err)
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to unfollow' },
      { status: 500 }
    )
  }
}