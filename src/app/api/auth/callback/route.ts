import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/send'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/dashboard'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)
    if (!error) {
      if (data.session?.user) {
        const user = data.session.user
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, member_since')
          .eq('id', user.id)
          .single() as { data: { username: string; member_since: string } | null }

        const isNew = profile?.member_since &&
          (Date.now() - new Date(profile.member_since).getTime()) < 5 * 60 * 1000

        if (isNew && user.email && profile?.username) {
          await sendWelcomeEmail(user.email, profile.username)
        }
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}