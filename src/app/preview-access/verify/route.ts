import { NextResponse } from 'next/server'

export async function POST(req: Request) {
  const { code } = await req.json()

  if (!process.env.PREVIEW_ACCESS_SECRET || code !== process.env.PREVIEW_ACCESS_SECRET) {
    return NextResponse.json({ error: 'Invalid code' }, { status: 401 })
  }

  const res = NextResponse.json({ success: true })
  res.cookies.set('vercel_preview_access', code, {
    httpOnly: true,
    secure: true,
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: '/',
    sameSite: 'lax',
  })
  return res
}
