import nodemailer from 'nodemailer'

export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Compicfy'
export const SITE_URL  = process.env.NEXT_PUBLIC_SITE_URL  ?? 'https://compicfy.cloud'
export const FROM      = process.env.SMTP_FROM             ?? 'support@compicfy.cloud'

// Reused across all sends
const transporter = nodemailer.createTransport({
  host:   process.env.SMTP_HOST,
  port:   Number(process.env.SMTP_PORT ?? 587),
  secure: false, // STARTTLS on port 587
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false, // common on shared hosting
  },
})

export async function sendMail(to: string, subject: string, html: string) {
  try {
    await transporter.sendMail({
      from: `${SITE_NAME} (no-reply) <${FROM}>`,
      to,
      subject,
      html,
    })
  } catch (error) {
    console.error('[mailer] Send failed:', error)
  }
}