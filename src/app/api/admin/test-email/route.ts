import { NextResponse } from 'next/server'
import { requireAdmin } from '@/lib/utils/admin'
import {
  sendWelcomeEmail,
  sendApprovedEmail,
  sendRejectedEmail,
  sendBannedEmail,
  sendUnbannedEmail,
  sendAppealResolvedEmail,
} from '@/lib/email/send'

export async function POST(request: Request) {
  // Admin only
  const { error, status, user } = await requireAdmin()
  if (error) return NextResponse.json({ error }, { status })

  const { type, to } = await request.json()

  if (!to) {
    return NextResponse.json({ error: 'Missing "to" email address' }, { status: 400 })
  }

  try {
    switch (type) {
      case 'welcome':
        await sendWelcomeEmail(to, 'testuser')
        break
      case 'approved':
        await sendApprovedEmail(to, 'testuser', 'Solo Leveling', 'test-rec-id-123')
        break
      case 'rejected':
        await sendRejectedEmail(to, 'testuser', 'Some Comic', 'Does not meet community guidelines.', 'test-rec-id-123')
        break
      case 'banned':
        await sendBannedEmail(to, 'testuser', 'Violation of community rules.')
        break
      case 'unbanned':
        await sendUnbannedEmail(to, 'testuser')
        break
      case 'appeal_approved':
        await sendAppealResolvedEmail(to, 'testuser', 'ban', 'approved')
        break
      case 'appeal_rejected':
        await sendAppealResolvedEmail(to, 'testuser', 'recommendation', 'rejected', 'Solo Leveling')
        break
      default:
        return NextResponse.json({ error: `Unknown email type: ${type}` }, { status: 400 })
    }

    return NextResponse.json({ success: true, message: `${type} email sent to ${to}` })
  } catch (err: any) {
    console.error('Test email error:', err)
    return NextResponse.json({ error: err.message ?? 'Failed to send email' }, { status: 500 })
  }
}