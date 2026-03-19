import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/send'

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/browse'

  if (code) {
    const supabase = await createClient()
    const { data, error } = await supabase.auth.exchangeCodeForSession(code)

    if (!error && data.session?.user) {
      const user = data.session.user

      // Retry up to 3 times — profile trigger can be slightly delayed
      let profile = null
      for (let i = 0; i < 3; i++) {
        const { data: p } = await (supabase as any)
          .from('profiles')
          .select('username, member_since, onboarding_completed')
          .eq('id', user.id)
          .single()

        if (p) { profile = p; break }

        // Wait 500ms before retry
        await new Promise(r => setTimeout(r, 500))
      }

      const isNew = profile?.member_since &&
        (Date.now() - new Date(profile.member_since).getTime()) < 5 * 60 * 1000

      // Send welcome email for new users
      if (isNew && user.email && profile?.username) {
        await sendWelcomeEmail(user.email, profile.username)
      }

      // Only redirect to onboarding if explicitly false (new user)
      // NULL means existing user before this feature — send to browse
      if (profile?.onboarding_completed === false) {
        return NextResponse.redirect(`${origin}/onboarding`)
      }

      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  return NextResponse.redirect(`${origin}/login?error=auth_failed`)
}