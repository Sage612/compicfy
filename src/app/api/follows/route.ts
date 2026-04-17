import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendFollowNotificationEmail } from '@/lib/email/send'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { following_id } = body

    if (!following_id) {
      return NextResponse.json({ error: 'following_id required' }, { status: 400 })
    }

    if (following_id === user.id) {
      return NextResponse.json({ error: 'Cannot follow yourself' }, { status: 400 })
    }

    // Use insert with ignore on conflict instead of upsert
    const { error: followError } = await (supabase as any)
      .from('follows')
      .insert({ 
        follower_id: user.id, 
        following_id: following_id 
      })
      .select()
      .maybeSingle()

    if (followError) {
      // If it's a unique violation, they're already following - that's fine
      if (followError.code === '23505') {
        return NextResponse.json({ following: true })
      }
      
      console.error('FOLLOW_DEBUG: Follow Insert Error:', followError)
      return NextResponse.json({ 
        error: 'Database rejection', 
        message: followError.message,
        code: followError.code 
      }, { status: 400 })
    }

    // Get follower profile details for the notification content
    const { data: followerProfile } = await (supabase as any)
      .from('profiles')
      .select('username, display_name')
      .eq('id', user.id)
      .single()

    const followerUsername = followerProfile?.username ?? 'someone'
    const followerDisplayName = followerProfile?.display_name ?? followerUsername
    const name = followerDisplayName || followerUsername

    // In-app notification 
    const { error: notifError } = await (supabase as any)
      .from('notifications').insert({
      user_id: following_id,
      type: 'system', 
      title: `${name} followed you`,
      content: `@${followerUsername} is now following you.`,
      data: { follower_id: user.id, username: followerUsername },
    })

    if (notifError) {
      console.error('FOLLOW_DEBUG: Notification Error:', notifError)
      // Don't fail the whole request if notification fails
    }

    // Email notification — fire and forget
    sendFollowNotificationEmail(
      following_id,
      followerUsername,
      followerDisplayName
    ).catch(err => console.error('FOLLOW_DEBUG: Email failed:', err))

    return NextResponse.json({ following: true })

  } catch (err: any) {
    console.error('FOLLOW_DEBUG: Unexpected Route Crash:', err)
    return NextResponse.json({ 
      error: 'Internal Server Error', 
      details: err.message || 'Unknown error' 
    }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { following_id } = await request.json()

    if (!following_id) {
      return NextResponse.json({ error: 'following_id required' }, { status: 400 })
    }

    const { error: deleteError } = await supabase
      .from('follows')
      .delete()
      .eq('follower_id', user.id)
      .eq('following_id', following_id)

    if (deleteError) {
      console.error('FOLLOW_DEBUG: Delete Error:', deleteError)
      throw deleteError
    }

    return NextResponse.json({ following: false })

  } catch (err: any) {
    console.error('FOLLOW_DEBUG: Unexpected Delete Crash:', err)
    return NextResponse.json({ 
      error: 'Failed to unfollow', 
      details: err.message 
    }, { status: 500 })
  }
}