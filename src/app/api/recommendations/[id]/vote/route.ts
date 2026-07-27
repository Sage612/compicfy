import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendVoteNotificationEmail } from '@/lib/email/send'

// CRITICAL: this route mutates the database (votes table) on every POST.
// Without an explicit dynamic export, Next.js route handlers can be
// treated as cacheable under certain conditions, which was observed
// causing this exact route to return a synthesized `{"action":"created"}`
// success response without the underlying Supabase insert ever executing
// — the response headers showed `cache-control: public, max-age=0,
// must-revalidate` on a mutating POST, which should never be cacheable.
// `force-dynamic` guarantees this route always executes fresh, end to end,
// on every request.
export const dynamic = 'force-dynamic'
export const revalidate = 0

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
        const { error: deleteError } = await supabase.from('votes').delete().eq('id', existing.id)
        if (deleteError) {
          console.error('Vote delete error:', deleteError)
          return NextResponse.json({ error: 'Failed to remove vote' }, { status: 500 })
        }
        return NextResponse.json({ action: 'removed', vote_type: null })
      } else {
        // Update vote
        const { error: updateError } = await (supabase as any).from('votes').update({ vote_type }).eq('id', existing.id)
        if (updateError) {
          console.error('Vote update error:', updateError)
          return NextResponse.json({ error: 'Failed to update vote' }, { status: 500 })
        }
        return NextResponse.json({ action: 'updated', vote_type })
      }
    }
    // Insert new vote
    const { error: insertError } = await (supabase as any).from('votes').insert({
      user_id: user.id,
      recommendation_id: id,
      vote_type,
    })
    if (insertError) {
      // Previously this error was swallowed silently — the route returned
      // a 500 via the outer catch, but nothing distinguished "insert
      // actually failed" from any other failure mode, making this bug
      // invisible in logs. Now it's explicit.
      console.error('Vote insert error:', insertError)
      return NextResponse.json({ error: 'Failed to save vote', details: insertError.message }, { status: 500 })
    }
    // Get recommendation owner and voter info for notification
    const [{ data: rec }, { data: voter }] = await Promise.all([
      (supabase as any).from('recommendations').select('user_id, title').eq('id', id).single(),
      (supabase as any).from('profiles').select('username, display_name').eq('id', user.id).single(),
    ])
    // Don't notify yourself
    if (rec && rec.user_id !== user.id) {
      const voterName = (voter as any)?.username ?? 'someone'
      const notifTitle = `@${voterName} ${vote_type === 'up' ? 'upvoted' : 'downvoted'} your recommendation "${(rec as any).title}"`

      // In-app + push notification (push only for upvotes, handled by DB webhook via should_push)
      await (supabase as any).from('notifications').insert({
        user_id: rec.user_id,
        type: 'vote',
        title: notifTitle,
        content: 'Tap to view your recommendation.',
        should_push: vote_type === 'up',
        data: { recommendation_id: id, voter_id: user.id, vote_type },
      })

      // Email notification fire and forget
      sendVoteNotificationEmail(
        rec.user_id,
        voterName,
        (rec as any).title,
        id,
        vote_type
      ).catch(console.error)
    }
    return NextResponse.json({ action: 'created', vote_type })
  } catch (err: any) {
    console.error('Vote route unexpected error:', err)
    return NextResponse.json({ error: 'Failed to vote' }, { status: 500 })
  }
}