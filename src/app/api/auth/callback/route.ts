import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { sendWelcomeEmail } from '@/lib/email/send'

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
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
        await new Promise(r => setTimeout(r, 500))
      }

      const isNew = profile?.member_since &&
        (Date.now() - new Date(profile.member_since).getTime()) < 5 * 60 * 1000

      if (isNew && user.email && profile?.username) {
        await sendWelcomeEmail(user.email, profile.username)
      }

      if (profile?.onboarding_completed === false) {
        return NextResponse.redirect(`${SITE_URL}/onboarding`)
      }

      // Always use SITE_URL — never trust `origin` from request.url
      // because on some hosts/proxies it resolves to localhost
      return NextResponse.redirect(`${SITE_URL}${next}`)
    }
  }

  return NextResponse.redirect(`${SITE_URL}/login?error=auth_failed`)
}