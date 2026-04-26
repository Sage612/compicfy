import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const { data: { user } } = await supabase.auth.getUser()
  const pathname = request.nextUrl.pathname

  // 1. GUARD: /blocked and /suspended are protected — only real offenders get in
  if (pathname.startsWith('/blocked') || pathname.startsWith('/suspended')) {
    // Not logged in → send to login
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, is_suspended, suspended_until')
      .eq('id', user.id)
      .single()

    if (pathname.startsWith('/blocked')) {
      // Not actually banned → send home
      if (!profile?.is_banned) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    if (pathname.startsWith('/suspended')) {
      const suspendedUntil = profile?.suspended_until
        ? new Date(profile.suspended_until)
        : null
      const isStillSuspended =
        profile?.is_suspended && (!suspendedUntil || suspendedUntil > new Date())

      // Not actually suspended → send home
      if (!isStillSuspended) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    // They ARE banned/suspended — let them through
    return supabaseResponse
  }

  // 2. Logged-in User Checks (Bans, Suspensions, Admin Roles)
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned, ban_reason, is_suspended, suspended_until, suspension_reason')
      .eq('id', user.id)
      .single()

    if (profile) {
      if (profile.is_banned) {
        const url = request.nextUrl.clone()
        url.pathname = '/blocked'
        url.searchParams.set('reason', profile.ban_reason ?? 'Violation of community guidelines')
        return NextResponse.redirect(url)
      }

      if (profile.is_suspended) {
        const suspendedUntil = profile.suspended_until ? new Date(profile.suspended_until) : null
        const isStillSuspended = !suspendedUntil || suspendedUntil > new Date()

        if (isStillSuspended) {
          const url = request.nextUrl.clone()
          url.pathname = '/suspended'
          url.searchParams.set('reason', profile.suspension_reason ?? 'Temporary suspension')
          if (suspendedUntil) url.searchParams.set('until', suspendedUntil.toISOString())
          return NextResponse.redirect(url)
        } else {
          supabase.from('profiles')
            .update({ is_suspended: false, suspended_until: null, suspension_reason: null })
            .eq('id', user.id)
            .then(() => {})
        }
      }

      if (pathname.startsWith('/admin')) {
        if (!['admin', 'moderator'].includes(profile.role)) {
          return NextResponse.redirect(new URL('/dashboard', request.url))
        }
      }
    }
  }

  // 3. Protected Routes
  const protectedPaths = ['/dashboard', '/admin', '/pro', '/feed', '/onboarding']
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtectedPath && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}