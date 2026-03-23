import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendVoteNotificationEmail } from '@/lib/email/send'

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()

    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { vote_type } = await request.json()
    if (!['up', 'down'].includes(vote_type)) {
      return NextResponse.json({ error: 'Invalid vote type' }, { status: 400 })
    }

    // Check existing vote
    const { data: existing } = await (supabase as any)  
      .from('votes')
      .select('*')
      .eq('user_id', user.id)
      .eq('recommendation_id', id)
      .maybeSingle()

    if (existing) {
      if (existing.vote_type === vote_type) {
        // Remove vote
        await supabase.from('votes').delete().eq('id', existing.id)
        return NextResponse.json({ action: 'removed', vote_type: null })
      } else {
        // Update vote
        await (supabase as any).from('votes').update({ vote_type }).eq('id', existing.id)
        return NextResponse.json({ action: 'updated', vote_type })
      }
    }

    // Insert new vote
    await (supabase as any).from('votes').insert({
      user_id: user.id,
      recommendation_id: id,
      vote_type,
    })

    // Get recommendation owner and voter info for notification
    const [{ data: rec }, { data: voter }] = await Promise.all([
      (supabase as any).from('recommendations').select('user_id, title').eq('id', id).single(),
      (supabase as any).from('profiles').select('username, display_name').eq('id', user.id).single(),
    ])

    // Don't notify yourself
    if (rec && rec.user_id !== user.id) {
      const voterName = (voter as any)?.username ?? 'someone'

      // In-app notification
      await (supabase as any).from('notifications').insert({
        user_id: rec.user_id,
        type: 'vote',
        title: `@${voterName} ${vote_type === 'up' ? 'upvoted' : 'downvoted'} your recommendation "${(rec as any).title}"`,
        data: { recommendation_id: id, voter_id: user.id, vote_type },
      })

      // Email notification — fire and forget
      sendVoteNotificationEmail(
        rec.user_id,
        voterName,
        (rec as any).title,
        id,
        vote_type
      ).catch(console.error)
    }

    return NextResponse.json({ action: 'created', vote_type })
  } catch {
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}