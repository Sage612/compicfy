import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { templates } from '@/lib/email/templates'
import { sendMail } from '@/lib/email/mailer'

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    const supabase = await createClient()

    const { error } = await (supabase as any)
      .from('pro_waitlist')
      .upsert({ email }, { onConflict: 'email', ignoreDuplicates: true })

    if (error) {
      console.error('[pro-waitlist]', error)
      // Don't fail — still send email even if DB insert fails
    }

    // Send confirmation email
    await sendMail(
      email,
      "You're on the ComPicfy Pro waitlist 🎉",
      templates.proWaitlist(email)
    )

    return NextResponse.json({ ok: true })
  } catch (err) {
    console.error('[pro-waitlist]', err)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}