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

  // ── Allow blocked/suspended pages through without any checks ────
  // Otherwise we'd get an infinite redirect loop
  const isBypassPath =
    pathname.startsWith('/blocked') ||
    pathname.startsWith('/suspended') ||
    pathname.startsWith('/login') ||
    pathname.startsWith('/api/auth') ||
    pathname.startsWith('/_next') ||
    pathname.startsWith('/favicon')

  if (isBypassPath) return supabaseResponse

  // ── Check ban + suspension for logged-in users ───────────────────
  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role, is_banned, ban_reason, is_suspended, suspended_until, suspension_reason')
      .eq('id', user.id)
      .single()

    if (profile) {
      // Permanent ban — redirect to /blocked
      if (profile.is_banned) {
        const url = request.nextUrl.clone()
        url.pathname = '/blocked'
        url.searchParams.set('reason', profile.ban_reason ?? 'Violation of community guidelines')
        return NextResponse.redirect(url)
      }

      // Suspension — check if still active (suspended_until in the future)
      if (profile.is_suspended) {
        const suspendedUntil = profile.suspended_until
          ? new Date(profile.suspended_until)
          : null

        const isStillSuspended = !suspendedUntil || suspendedUntil > new Date()

        if (isStillSuspended) {
          const url = request.nextUrl.clone()
          url.pathname = '/suspended'
          url.searchParams.set('reason', profile.suspension_reason ?? 'Temporary suspension')
          if (suspendedUntil) {
            url.searchParams.set('until', suspendedUntil.toISOString())
          }
          return NextResponse.redirect(url)
        } else {
          // Suspension expired — auto-lift it in the background
          // Fire and forget, don't await so we don't slow down the request
          (supabase as any)
            .from('profiles')
            .update({
              is_suspended:      false,
              suspended_until:   null,
              suspension_reason: null,
            })
            .eq('id', user.id)
            .then(() => {})
            .catch(() => {})
        }
      }

      // Admin route guard
      if (pathname.startsWith('/admin')) {
        if (!['admin', 'moderator'].includes(profile.role)) {
          const url = request.nextUrl.clone()
          url.pathname = '/dashboard'
          return NextResponse.redirect(url)
        }
      }
    }
  }

  // ── Protected route guard (unauthenticated) ──────────────────────
  const protectedPaths = ['/dashboard', '/admin']
  const isProtectedPath = protectedPaths.some((path) =>
    pathname.startsWith(path)
  )

  if (isProtectedPath && !user) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  return supabaseResponse
}