import { type NextRequest, NextResponse } from 'next/server'
import { updateSession } from '@/lib/supabase/middleware'

export async function middleware(request: NextRequest) {
  const host = request.headers.get('host') ?? ''

  // Lock down the public Vercel preview domain only — never compicfy.com or dev.compicfy.cloud
  if (host.includes('vercel.app')) {
    const { pathname } = request.nextUrl

    // Always allow cron routes through — they authenticate via x-cron-secret already
    // Always allow the access-gate route itself, or nobody could ever unlock it
    // Always allow the manga-details API — called server-side by the external detail page
    const isCron = pathname.startsWith('/api/cron')
    const isGate = pathname.startsWith('/preview-access')
    const isMangaDetails = pathname.startsWith('/api/manga-details')

    if (!isCron && !isGate && !isMangaDetails) {
      const bypass = request.cookies.get('vercel_preview_access')?.value
      if (!process.env.PREVIEW_ACCESS_SECRET || bypass !== process.env.PREVIEW_ACCESS_SECRET) {
        return NextResponse.redirect('https://compicfy.com' + pathname)
      }
    }
  }

  return await updateSession(request)
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}