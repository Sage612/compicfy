import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextResponse } from 'next/server'

const DELETED_USER_ID = '00000000-0000-0000-0000-000000000000'

type RecommendationUpdate = {
  user_id: string
}

export async function DELETE(req: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { password } = await req.json()
    if (!password) return NextResponse.json({ error: 'Password required' }, { status: 400 })

    // Verify password by re-authenticating
    const { error: authError } = await supabase.auth.signInWithPassword({
      email:    user.email!,
      password: password,
    })
    if (authError) {
      return NextResponse.json({ error: 'Incorrect password' }, { status: 401 })
    }

    const updateData: RecommendationUpdate = { user_id: DELETED_USER_ID }
    await (supabase as any)
      .from('recommendations')
      .update(updateData)
      .eq('user_id', user.id)

    try {
      // Delete avatar
      await supabase.storage.from('avatars').remove([`${user.id}/avatar`])

      // Delete all their cover images
      const { data: covers } = await supabase.storage.from('covers').list(user.id)
      if (covers?.length) {
        await supabase.storage.from('covers').remove(covers.map(f => `${user.id}/${f.name}`))
      }
    } catch {
      // Storage cleanup is best-effort — don't fail the whole deletion
    }

      await supabase.from('profiles').delete().eq('id', user.id)
      
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