import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DELETED_USER_ID = '00000000-0000-0000-0000-000000000000'

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Detect auth provider
    const provider = user.identities?.[0]?.provider ?? 'email'
    const isOAuth  = provider !== 'email'

    const body = await req.json().catch(() => ({}))

    if (!isOAuth) {
      // Email users must provide password
      const { password } = body
      if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

      const { error: authError } = await supabase.auth.signInWithPassword({
        email:    user.email!,
        password,
      })
      if (authError) return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }
    // OAuth users (Google etc.) — no password check needed, they already proved identity via OAuth

    // Reassign recommendations to ghost
    await (supabase as any)
      .from('recommendations')
      .update({ user_id: DELETED_USER_ID })
      .eq('user_id', user.id)

    // Best-effort storage cleanup
    try {
      await supabase.storage.from('avatars').remove([`${user.id}/avatar`])
      const { data: covers } = await supabase.storage.from('covers').list(user.id)
      if (covers?.length) {
        await supabase.storage.from('covers').remove(covers.map(f => `${user.id}/${f.name}`))
      }
    } catch { /* non-critical */ }

    // Delete profile
    await supabase.from('profiles').delete().eq('id', user.id)

    // Delete auth user via admin client
    const adminClient = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(user.id)
    if (deleteError) throw deleteError

    await supabase.auth.signOut()
    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[DELETE /api/account]', err)
    return NextResponse.json({ error: err.message ?? 'Failed to delete account' }, { status: 500 })
  }
}