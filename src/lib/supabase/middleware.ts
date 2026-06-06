import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import { ROUTE_REDIRECTS } from '@/lib/utils/routes'

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

  if (ROUTE_REDIRECTS[pathname]) {
    const url = request.nextUrl.clone()
    url.pathname = ROUTE_REDIRECTS[pathname]
    return NextResponse.redirect(url, { status: 301 })
  }

  // ── 1. /blocked and /suspended guards ────────────────────────────────────
  if (pathname.startsWith('/blocked') || pathname.startsWith('/suspended')) {
    if (!user) {
      return NextResponse.redirect(new URL('/login', request.url))
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('is_banned, is_suspended, suspended_until')
      .eq('id', user.id)
      .single()

    if (pathname.startsWith('/blocked')) {
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
      if (!isStillSuspended) {
        return NextResponse.redirect(new URL('/', request.url))
      }
    }

    return supabaseResponse
  }

  // ── 2. Logged-in user checks ──────────────────────────────────────────────
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned, ban_reason, is_suspended, suspended_until, suspension_reason, user_type')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Ban check
      if (profile.is_banned) {
        const url = request.nextUrl.clone()
        url.pathname = '/blocked'
        url.searchParams.set('reason', profile.ban_reason ?? 'Violation of community guidelines')
        return NextResponse.redirect(url)
      }

      // Suspension check
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

      // Admin route guard
      if (pathname.startsWith('/admin')) {
        if (!['admin', 'moderator'].includes(profile.role)) {
          return NextResponse.redirect(new URL('/reader/dashboard', request.url))
        }
      }

      // Creator trying to access reader DASHBOARD routes → redirect to creator dashboard
      // Note: /reader/[username] public profiles are NOT dashboard routes, so we scope
      // this guard to /reader/dashboard only to allow public reader profiles through.
      if (pathname.startsWith('/reader/dashboard') && profile.user_type === 'creator') {
        return NextResponse.redirect(new URL('/creator/dashboard', request.url))
      }

      // Reader trying to access creator DASHBOARD routes → redirect to reader dashboard
      // Note: /creator/[username] public profiles must remain accessible to all users,
      // including readers. We scope this guard to /creator/dashboard only.
      if (pathname.startsWith('/creator/dashboard') && profile.user_type === 'reader') {
        return NextResponse.redirect(new URL('/reader/dashboard', request.url))
      }

      // Pro creator trying to access pro reader routes → redirect
      if (pathname.startsWith('/pro/reader/') && profile.user_type === 'creator') {
        return NextResponse.redirect(new URL('/pro/creator/dashboard', request.url))
      }

      // Pro reader trying to access pro creator routes → redirect
      if (pathname.startsWith('/pro/creator/') && profile.user_type === 'reader') {
        return NextResponse.redirect(new URL('/pro/reader/dashboard', request.url))
      }
    }
  }

  // ── 3. Protected route auth check ─────────────────────────────────────────
  // Only protect DASHBOARD routes, not public-facing profile pages.
  // /creator/[username] and /reader/[username] are public profiles — no auth required.
  const protectedPaths = [
    '/reader/dashboard',
    '/creator/dashboard',
    '/admin',
    '/pro',
    '/feed',
    '/onboarding',
  ]
  const isProtectedPath = protectedPaths.some(p => pathname.startsWith(p))

  if (isProtectedPath && !user) {
    const url = new URL('/login', request.url)
    url.searchParams.set('next', pathname)
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}