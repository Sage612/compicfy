import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { templates } from '@/lib/email/templates'
import { sendMail } from '@/lib/email/mailer'

export async function POST(req: NextRequest) {
  try {
    const { email, tier = 'pro' } = await req.json()

    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email' }, { status: 400 })
    }

    if (!['pro', 'patron'].includes(tier)) {
      return NextResponse.json({ error: 'Invalid tier' }, { status: 400 })
    }

    const supabase = await createClient()

    // One row per email+tier — same email can join both waitlists
    const { error } = await (supabase as any)
      .from('pro_waitlist')
      .upsert(
        { email, tier },
        { onConflict: 'email,tier', ignoreDuplicates: true }
      )

    if (error) {
      console.error('[pro-waitlist]', error)
      // Don't fail — still send email even if DB insert fails
    }

    // Send tier-appropriate confirmation email
    const emailTemplate = tier === 'patron'
      ? templates.patronWaitlist(email)
      : templates.proWaitlist(email)

    const subject = tier === 'patron'
      ? "You're on the ComPicfy Patron waitlist 💎"
      : "You're on the ComPicfy Pro waitlist 🎉"

    await sendMail(email, subject, emailTemplate)

    return NextResponse.json({ ok: true, tier })
  } catch (err) {
    console.error('[pro-waitlist]', err)
    return NextResponse.json({ error: 'Failed to join waitlist' }, { status: 500 })
  }
}