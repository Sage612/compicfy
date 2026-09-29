import { NextRequest, NextResponse } from 'next/server'
import { sendMail } from '@/lib/email/mailer'
import { createClient } from '@/lib/supabase/server'

// FIX: user-supplied fields were previously interpolated directly into an
// HTML email with no escaping — a submitter could put HTML/markup in
// `description`, `infringing_url`, `signature`, etc. that would render
// (and could visually spoof or otherwise manipulate) when your team opens
// the notification email. Escape everything before it goes into the
// template.
function escapeHtml(input: string): string {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

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

    // Only allow http(s) URLs in the infringing_url field — blocks
    // javascript: and other schemes from ending up in an <a href>.
    let safeInfringingUrl = ''
    try {
      const parsed = new URL(infringing_url.trim())
      if (['http:', 'https:'].includes(parsed.protocol)) {
        safeInfringingUrl = parsed.toString()
      }
    } catch {
      // leave safeInfringingUrl empty — invalid URL
    }
    if (!safeInfringingUrl) {
      return NextResponse.json({ error: 'infringing_url must be a valid http(s) URL' }, { status: 400 })
    }

    // ── 1. Store in DB ─────────────────────────────────────────────
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
        infringing_url:   safeInfringingUrl,
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

    // Escape everything that goes into the HTML templates below
    const safe = {
      claimant_name:    escapeHtml(claimant_name),
      claimant_email:   escapeHtml(claimant_email),
      company:          company ? escapeHtml(company) : '',
      copyrighted_work: escapeHtml(copyrighted_work),
      content_type:     escapeHtml(content_type),
      description:      escapeHtml(description),
      signature:        escapeHtml(signature),
    }

    // ── 2. Email admin ─────────────────────────────────────────────
    await sendMail(
      'support@compicfy.com',
      `🚨 DMCA Takedown Notice — ${safe.claimant_name}`,
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
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Name</td><td><strong>${safe.claimant_name}</strong></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Email</td><td><a href="mailto:${safe.claimant_email}">${safe.claimant_email}</a></td></tr>
            ${safe.company ? `<tr><td style="padding: 6px 0; color: #6b7280;">Company</td><td>${safe.company}</td></tr>` : ''}
          </table>

          <h3 style="margin-top: 20px; margin-bottom: 4px;">Infringing Content</h3>
          <table style="width: 100%; font-size: 14px; border-collapse: collapse;">
            <tr><td style="padding: 6px 0; color: #6b7280; width: 160px;">Copyrighted Work</td><td>${safe.copyrighted_work}</td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Infringing URL</td><td><a href="${safeInfringingUrl}">${escapeHtml(safeInfringingUrl)}</a></td></tr>
            <tr><td style="padding: 6px 0; color: #6b7280;">Content Type</td><td>${safe.content_type}</td></tr>
          </table>

          <h3 style="margin-top: 20px; margin-bottom: 4px;">Details</h3>
          <p style="font-size: 14px; background: #f9fafb; border: 1px solid #e5e7eb; padding: 12px; border-radius: 8px;">${safe.description}</p>

          <h3 style="margin-top: 20px; margin-bottom: 4px;">Electronic Signature</h3>
          <p style="font-size: 14px;"><em>${safe.signature}</em></p>

          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">
            All three required declarations were checked by the submitter.
            Respond within 72 hours.
            ${submissionId ? `<br/>Admin ref: ${submissionId}` : ''}
          </p>
        </div>
      `
    )

    // ── 3. Confirmation to claimant ────────────────────────────
    await sendMail(
      claimant_email,
      'DMCA Notice Received — ComPicfy',
      `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>DMCA Notice Received</h2>
          <p>Hi ${safe.claimant_name},</p>
          <p>We have received your DMCA takedown notice regarding <strong>${safe.copyrighted_work}</strong>.</p>
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
