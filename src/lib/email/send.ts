import { sendMail, FROM, SITE_NAME } from './mailer'
import { templates } from './templates'
import { createClient } from '@supabase/supabase-js'

function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function getUserEmail(userId: string): Promise<string | null> {
  try {
    const admin = getAdminClient()
    const { data, error } = await admin.auth.admin.getUserById(userId)
    if (error || !data?.user?.email) return null
    return data.user.email
  } catch {
    return null
  }
}

// ── Transactional emails ─────────────────────────────────────────────────────

export const sendWelcomeEmail = (to: string, username: string) =>
  sendMail(to, `Welcome to Compicfy, @${username}! 🎉`, templates.welcome(username))

export const sendApprovedEmail = (to: string, username: string, title: string, recId: string) =>
  sendMail(to, `✅ Your recommendation "${title}" was approved!`, templates.recommendationApproved(username, title, recId))

export const sendRejectedEmail = (to: string, username: string, title: string, reason: string, recId: string) =>
  sendMail(to, `Your recommendation "${title}" was not approved`, templates.recommendationRejected(username, title, reason, recId))

export const sendBannedEmail = (to: string, username: string, reason: string) =>
  sendMail(to, `Your ${SITE_NAME} account has been suspended`, templates.accountBanned(username, reason))

export const sendUnbannedEmail = (to: string, username: string) =>
  sendMail(to, `Your ${SITE_NAME} account has been reinstated ✅`, templates.accountUnbanned(username))

export const sendAppealResolvedEmail = (to: string, username: string, type: string, outcome: string, title?: string) =>
  sendMail(to, `Your ${type} appeal has been ${outcome}`, templates.appealResolved(username, type, outcome, title))

export const sendSuspendedEmail = (to: string, username: string, reason: string, duration_hours: number) =>
  sendMail(
    to,
    `Your ${SITE_NAME} account has been temporarily suspended`,
    templates.accountSuspended(username, reason, duration_hours)
  )

export const sendUnsuspendedEmail = (to: string, username: string) =>
  sendMail(
    to,
    `Your ${SITE_NAME} account access has been restored`,
    templates.accountUnsuspended(username)
  )

// ── Notification emails ──────────────────────────────────────────────────────

export async function sendFollowNotificationEmail(
  followedUserId: string,
  followerUsername: string,
  followerDisplayName: string
) {
  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', followedUserId)
    .single()

  if (!profile?.email_notifications) return
  if (!profile?.username) return

  const email = await getUserEmail(followedUserId)
  if (!email) return

  await sendMail(
    email,
    `@${followerUsername} is now following you on Compicfy!`,
    templates.newFollower(profile.username, followerUsername, followerDisplayName)
  )
}

export async function sendVoteNotificationEmail(
  recOwnerId: string,
  voterUsername: string,
  recTitle: string,
  recId: string,
  voteType: 'up' | 'down'
) {
  if (voteType === 'down') return

  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', recOwnerId)
    .single()

  if (!profile?.email_notifications) return
  if (!profile?.username) return

  const email = await getUserEmail(recOwnerId)
  if (!email) return

  await sendMail(
    email,
    `Your recommendation "${recTitle}" got an upvote! 👍`,
    templates.newVote(profile.username, voterUsername, recTitle, recId, voteType)
  )
}

export async function sendReviewNotificationEmail(
  recOwnerId: string,
  reviewerUsername: string,
  recTitle: string,
  recId: string,
  reviewContent: string
) {
  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', recOwnerId)
    .single()

  if (!profile?.email_notifications) return
  if (!profile?.username) return

  const email = await getUserEmail(recOwnerId)
  if (!email) return

  const snippet = reviewContent.slice(0, 120)

  await sendMail(
    email,
    `@${reviewerUsername} reviewed your recommendation "${recTitle}"`,
    templates.newReview(profile.username, reviewerUsername, recTitle, recId, snippet)
  )
}