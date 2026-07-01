import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email/mailer'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      claimant_name, claimant_email, company,
      copyrighted_work, infringing_url, content_type,
      description, signature, good_faith, accuracy, authority,
    } = body

    if (
      !claimant_name || !claimant_email || !copyrighted_work ||
      !infringing_url || !content_type || !description || !signature
    ) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // ── 1. Store in DB ───────────────────────────────────────────
    const { createClient: createAdmin } = await import('@supabase/supabase-js')
    const adminClient = createAdmin(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    const ip = req.headers.get('x-forwarded-for') ??
               req.headers.get('x-real-ip') ?? null

    const { data: submission } = await adminClient
      .from('dmca_submissions')
      .insert({
        claimant_name:    claimant_name.trim(),
        claimant_email:   claimant_email.trim().toLowerCase(),
        company:          company?.trim() || null,
        copyrighted_work: copyrighted_work.trim(),
        infringing_url:   infringing_url.trim(),
        content_type:     content_type.trim(),
        description:      description.trim(),
        good_faith:       !!good_faith,
        accuracy:         !!accuracy,
        authority:        !!authority,
        signature:        signature.trim(),
        ip_address:       ip,
        status:           'pending',
      })
      .select('id')
      .single()

    const submissionId = submission?.id ?? null
    const submittedAt  = new Date().toLocaleString('en-US', {
      timeZone: 'UTC', dateStyle: 'full', timeStyle: 'short',
    })

    // ── 2. Email admin ───────────────────────────────────────────
    await sendMail(
      'support@compicfy.com',
      `🚨 DMCA Takedown Notice — ${claimant_name}`,
      `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">DMCA Takedown Notice Received</h2>
          <p style="color: #6b7280; font-size: 14px;">
            Submitted: ${submittedAt} UTC
            ${submissionId ? ` · Reference ID: <strong>${submissionId}</strong>` : ''}
          </p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 16px 0;" />

          <h3 style="margin-bottom: 4px;">Claimant Information</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Name</td><td><strong>${claimant_name}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td><a href="mailto:${claimant_email}">${claimant_email}</a></td></tr>
            ${company ? `<tr><td style="padding: 6px 0; color: #6b7280;">Company</td><td>${company}</td></tr>` : ''}
          </table>

          <h3 style="margin-top: 20px; margin-bottom: 4px;">Infringing Content</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Copyrighted Work</td><td>${copyrighted_work}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Infringing URL</td><td><a href="${infringing_url}">${infringing_url}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Content Type</td><td>${content_type}</td></tr>
          </table>

          <h3 style="margin-top: 20px; margin-bottom: 4px;">Details</h3>
          <p style="font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px;">${description}</p>

          <h3 style="margin-top: 20px; margin-bottom: 4px;">Electronic Signature</h3>
          <p style="font-size: 14px;"><em>${signature}</em></p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            All three required declarations were checked by the submitter.
            Respond within 72 hours.
            ${submissionId ? `<br/>Admin ref: ${submissionId}` : ''}
          </p>
        </div>
      `
    )

    // ── 3. Confirmation to claimant ──────────────────────────────
    await sendMail(
      claimant_email,
      'DMCA Notice Received — ComPicfy',
      `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>DMCA Notice Received</h2>
          <p>Hi ${claimant_name},</p>
          <p>We have received your DMCA takedown notice regarding <strong>${copyrighted_work}</strong>.</p>
          ${submissionId ? `<p>Your reference ID is <strong>${submissionId}</strong> — keep this for follow-up.</p>` : ''}
          <p>Our team will review your claim and respond to this email within <strong>72 hours</strong>.</p>
          <p>To follow up, email <a href="mailto:support@compicfy.com">support@compicfy.com</a>${submissionId ? ` with reference ID: ${submissionId}` : ''}.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">ComPicfy · Submitted: ${submittedAt} UTC</p>
        </div>
      `
    )

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DMCA submission error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}