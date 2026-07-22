import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFollowNotificationEmail } from '@/lib/email/send'

const FREE_FOLLOW_LIMIT = 50

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json()
    const { following_id } = body

    if (!following_id) return NextResponse.json({ error: 'following_id required' }, { status: 400 })
    if (following_id === user.id) return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_pro, pro_expires_at, role')
      .eq('id', user.id)
      .single() as { data: any }

    const isAdmin = ['admin', 'moderator'].includes(profile?.role ?? '')
    const isPro   = isAdmin || (profile?.is_pro &&
      (!profile?.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))

    if (!isPro) {
      const { count } = await supabase
        .from('follows')
        .select('*', { count: 'exact', head: true })
        .eq('follower_id', user.id)

      if ((count ?? 0) >= FREE_FOLLOW_LIMIT) {
        return NextResponse.json({
          error:   'follow_limit_reached',
          message: `Free accounts can follow up to ${FREE_FOLLOW_LIMIT} people. Upgrade to Pro for unlimited follows.`,
          limit:   FREE_FOLLOW_LIMIT,
          current: count,
        }, { status: 403 })
      }
    }

    // â”€â”€ Insert follow â”€â”€
    const { error: followError } = await (supabase as any)
      .from('follows')
      .insert({ follower_id: user.id, following_id })

    if (followError) {
      console.error('[follows/POST] insert error:', followError)
      if (followError.code === '23505') {
        return NextResponse.json({ following: true })
      }
      return NextResponse.json({ error: followError.message }, { status: 500 })
    }


    const { data: followerProfile } = await supabase
      .from('profiles')
      .select('username, display_name, user_type')
      .eq('id', user.id)
      .single()

    const followerUsername    = (followerProfile as any)?.username    ?? 'someone'
    const followerDisplayName = (followerProfile as any)?.display_name ?? followerUsername
    const followerUserType    = (followerProfile as any)?.user_type   ?? 'reader'
    const name = followerDisplayName || followerUsername

    const notifTitle = `${name} started following you`

    try {
      await (supabase as any)
        .from('notifications')
        .insert({
          user_id: following_id,
          type:    'follow',
          title:   notifTitle,
          content: `@${followerUsername} is now following you.`,
          should_push: true,
          data: {
            follower_id:       user.id,
            follower_username: followerUsername,   // â†  used by NotificationsClient for routing
            follower_type:     followerUserType,   // â†  so we build /reader/ vs /creator/ correctly
          },
        })
    } catch (notifErr) {
      console.error('[follows/POST] notification error (non-fatal):', notifErr)
    }

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

    const { searchParams } = new URL(request.url)
    let following_id = searchParams.get('following_id')

    if (!following_id) {
      try {
        const body = await request.json()
        following_id = body?.following_id ?? null
      } catch { /* ignore */ }
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
