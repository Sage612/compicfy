import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import { sendPushForUser } from '@/lib/utils/pushHelper'

// POST — save a collection
// DELETE — unsave a collection

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Upsert so duplicate saves never 409
    const { error: insertError } = await (supabase as any)
      .from('collection_saves')
      .upsert(
        { user_id: user.id, collection_id: id },
        { onConflict: 'user_id,collection_id', ignoreDuplicates: true }
      )

    if (insertError) throw insertError

    // Recalculate save_count from actual rows — source of truth
    const { count } = await (supabase as any)
      .from('collection_saves')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', id)

    await (supabase as any)
      .from('collections')
      .update({ save_count: count ?? 0 })
      .eq('id', id)

    // ── Notify collection owner — don't notify yourself ──────────────────
    try {
      const [{ data: collection }, { data: saver }] = await Promise.all([
        (supabase as any).from('collections').select('user_id, title').eq('id', id).single(),
        (supabase as any).from('profiles').select('username, display_name').eq('id', user.id).single(),
      ])

      if (collection && collection.user_id !== user.id) {
        const { data: ownerProfile } = await (supabase as any)
          .from('profiles')
          .select('notification_prefs')
          .eq('id', collection.user_id)
          .single()

        const prefs = ownerProfile?.notification_prefs?.collection_saved ?? {
          in_app: true, push: true, email: true,
        }

        const saverUsername = saver?.username ?? 'someone'
        const saverName     = saver?.display_name || saverUsername
        const notifTitle    = `${saverName} saved your collection "${collection.title}"`

        if (prefs.in_app !== false) {
          await (supabase as any).from('notifications').insert({
            user_id: collection.user_id,
            type:    'collection_saved',
            title:   notifTitle,
            data:    { collection_id: id, saver_id: user.id, saver_username: saverUsername },
          })
        }

        if (prefs.push !== false) {
          sendPushForUser(
            collection.user_id,
            notifTitle,
            `@${saverUsername} just saved your collection.`,
            `/collections/${id}`
          ).catch(console.error)
        }

        if (prefs.email !== false) {
          await (supabase as any).from('notification_digest_queue').insert({
            user_id:    collection.user_id,
            event_type: 'collection_saved',
            payload:    { collection_id: id, collection_title: collection.title, saver_username: saverUsername },
          })
        }
      }
    } catch (notifErr) {
      console.error('[collection save] notification error (non-fatal):', notifErr)
    }

    return NextResponse.json({ saved: true, save_count: count ?? 0 }, { status: 201 })
  } catch (err) {
    console.error('Save POST error:', err)
    return NextResponse.json({ error: 'Failed to save' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    await (supabase as any)
      .from('collection_saves')
      .delete()
      .eq('user_id', user.id)
      .eq('collection_id', id)

    // Recalculate save_count from actual rows — source of truth
    const { count } = await (supabase as any)
      .from('collection_saves')
      .select('*', { count: 'exact', head: true })
      .eq('collection_id', id)

    await (supabase as any)
      .from('collections')
      .update({ save_count: count ?? 0 })
      .eq('id', id)

    return NextResponse.json({ saved: false, save_count: count ?? 0 })
  } catch (err) {
    console.error('Save DELETE error:', err)
    return NextResponse.json({ error: 'Failed to unsave' }, { status: 500 })
  }
}