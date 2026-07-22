import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ id: string }>
}

// POST â€” star a list
export async function POST(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { error: insertError } = await (supabase as any)
      .from('list_stars')
      .upsert(
        { user_id: user.id, list_id: id },
        { onConflict: 'user_id,list_id', ignoreDuplicates: true }
      )
    if (insertError) throw insertError

    const { count } = await (supabase as any)
      .from('list_stars')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id)

    await (supabase as any)
      .from('reading_lists')
      .update({ star_count: count ?? 0 })
      .eq('id', id)

    // â”€â”€ Notify list owner â€” don't notify yourself â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
    try {
      const [{ data: list }, { data: starrer }] = await Promise.all([
        (supabase as any).from('reading_lists').select('user_id, name').eq('id', id).single(),
        (supabase as any).from('profiles').select('username, display_name').eq('id', user.id).single(),
      ])

      if (list && list.user_id !== user.id) {
        const { data: ownerProfile } = await (supabase as any)
          .from('profiles')
          .select('notification_prefs')
          .eq('id', list.user_id)
          .single()

        const prefs = ownerProfile?.notification_prefs?.list_starred ?? {
          in_app: true, push: true, email: true,
        }

        const starrerUsername = starrer?.username ?? 'someone'
        const starrerName     = starrer?.display_name || starrerUsername
        const notifTitle      = `${starrerName} starred your list "${list.name}"`

        if (prefs.in_app !== false) {
          await (supabase as any).from('notifications').insert({
            user_id: list.user_id,
            type:    'list_starred',
            title:   notifTitle,
            content: `@${starrerUsername} just starred your list.`,
            should_push: prefs.push !== false,
            data:    { list_id: id, starrer_id: user.id, starrer_username: starrerUsername },
          })
        }

        if (prefs.email !== false) {
          await (supabase as any).from('notification_digest_queue').insert({
            user_id:    list.user_id,
            event_type: 'list_starred',
            payload:    { list_id: id, list_name: list.name, starrer_username: starrerUsername },
          })
        }
      }
    } catch (notifErr) {
      console.error('[list star] notification error (non-fatal):', notifErr)
    }

    return NextResponse.json({ starred: true, star_count: count ?? 0 }, { status: 201 })
  } catch (err) {
    console.error('Star POST error:', err)
    return NextResponse.json({ error: 'Failed to star' }, { status: 500 })
  }
}

// DELETE â€” unstar a list
export async function DELETE(_req: Request, { params }: RouteContext) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await (supabase as any)
      .from('list_stars')
      .delete()
      .eq('user_id', user.id)
      .eq('list_id', id)

    const { count } = await (supabase as any)
      .from('list_stars')
      .select('*', { count: 'exact', head: true })
      .eq('list_id', id)

    await (supabase as any)
      .from('reading_lists')
      .update({ star_count: count ?? 0 })
      .eq('id', id)

    return NextResponse.json({ starred: false, star_count: count ?? 0 })
  } catch (err) {
    console.error('Star DELETE error:', err)
    return NextResponse.json({ error: 'Failed to unstar' }, { status: 500 })
  }
}
