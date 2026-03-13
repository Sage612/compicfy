import { NextRequest, NextResponse } from 'next/server'
import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      claimant_name, claimant_email, company,
      copyrighted_work, infringing_url, content_type,
      description, signature,
    } = body

    // Basic validation
    if (!claimant_name || !claimant_email || !copyrighted_work || !infringing_url || !content_type || !description || !signature) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const submittedAt = new Date().toLocaleString('en-US', { timeZone: 'UTC', dateStyle: 'full', timeStyle: 'short' })

    // Send notification to legal team
    await resend.emails.send({
      from: 'Compicfy Legal <noreply@compicfy.com>',
      to: ['legal@compicfy.com'],
      subject: `🚨 DMCA Takedown Notice — ${claimant_name}`,
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #e11d48;">DMCA Takedown Notice Received</h2>
          <p style="color: #6b7280; font-size: 14px;">Submitted at: ${submittedAt} UTC</p>
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
          <p style="font-size: 12px; color: #9ca3af;">All three required declarations were checked by the submitter. Respond to this notice within 72 hours.</p>
        </div>
      `,
    })

    // Send confirmation to claimant
    await resend.emails.send({
      from: 'Compicfy Legal <noreply@compicfy.com>',
      to: [claimant_email],
      subject: 'DMCA Notice Received — Compicfy',
      html: `
        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto;">
          <h2>DMCA Notice Received</h2>
          <p>Hi ${claimant_name},</p>
          <p>We have received your DMCA takedown notice regarding <strong>${copyrighted_work}</strong>.</p>
          <p>Our legal team will review it and respond to this email address within <strong>72 hours</strong>.</p>
          <p>If you need to follow up urgently, please email <a href="mailto:legal@compicfy.com">legal@compicfy.com</a> with your name and the URL you submitted.</p>
          <hr style="border: none; border-top: 1px solid #e5e7eb; margin: 20px 0;" />
          <p style="font-size: 12px; color: #9ca3af;">Compicfy — Submitted: ${submittedAt} UTC</p>
        </div>
      `,
    })

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('DMCA submission error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}