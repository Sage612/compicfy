import { resend, FROM, SITE_NAME } from './resend'
import { templates } from './templates'

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: `${SITE_NAME} <${FROM}>`, to, subject, html })
  } catch (error) {
    console.error('Email send failed:', error)
  }
}

export const sendWelcomeEmail = (to: string, username: string) =>
  sendEmail(to, `Welcome to Compicfy, @${username}! 🎉`, templates.welcome(username))

export const sendApprovedEmail = (to: string, username: string, title: string, recId: string) =>
  sendEmail(to, `✅ Your recommendation "${title}" was approved!`, templates.recommendationApproved(username, title, recId))

export const sendRejectedEmail = (to: string, username: string, title: string, reason: string, recId: string) =>
  sendEmail(to, `Your recommendation "${title}" was not approved`, templates.recommendationRejected(username, title, reason, recId))

export const sendBannedEmail = (to: string, username: string, reason: string) =>
  sendEmail(to, `Your ${SITE_NAME} account has been suspended`, templates.accountBanned(username, reason))

export const sendUnbannedEmail = (to: string, username: string) =>
  sendEmail(to, `Your ${SITE_NAME} account has been reinstated ✅`, templates.accountUnbanned(username))

export const sendAppealResolvedEmail = (to: string, username: string, type: string, outcome: string, title?: string) =>
  sendEmail(to, `Your ${type} appeal has been ${outcome}`, templates.appealResolved(username, type, outcome, title))