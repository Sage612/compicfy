import { resend, FROM, SITE_NAME } from './resend'
import { templates } from './templates'
import { createClient } from '@supabase/supabase-js'

// Admin client to look up user emails — bypasses RLS
function getAdminClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
}

async function sendEmail(to: string, subject: string, html: string) {
  try {
    await resend.emails.send({ from: `${SITE_NAME} <${FROM}>`, to, subject, html })
  } catch (error) {
    console.error('Email send failed:', error)
  }
}

// Get a user's email by their profile ID
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

// ── Existing emails ──────────────────────────────────────────────────────────

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

// ── New notification emails ──────────────────────────────────────────────────

// Send when someone follows a user
export async function sendFollowNotificationEmail(
  followedUserId: string,
  followerUsername: string,
  followerDisplayName: string
) {
  const admin = getAdminClient()

  // Get followed user's profile to check notification preferences
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', followedUserId)
    .single()

  if (!profile?.email_notifications) return // User opted out
  if (!profile?.username) return

  const email = await getUserEmail(followedUserId)
  if (!email) return

  await sendEmail(
    email,
    `@${followerUsername} is now following you on Compicfy!`,
    templates.newFollower(profile.username, followerUsername, followerDisplayName)
  )
}

// Send when someone votes on a recommendation
export async function sendVoteNotificationEmail(
  recOwnerId: string,
  voterUsername: string,
  recTitle: string,
  recId: string,
  voteType: 'up' | 'down'
) {
  // Only send for upvotes — downvote notifications feel bad
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

  await sendEmail(
    email,
    `Your recommendation "${recTitle}" got an upvote! 👍`,
    templates.newVote(profile.username, voterUsername, recTitle, recId, voteType)
  )
}

// Send when someone reviews a recommendation
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

  // Snippet — first 120 chars of review
  const snippet = reviewContent.slice(0, 120)

  await sendEmail(
    email,
    `@${reviewerUsername} reviewed your recommendation "${recTitle}"`,
    templates.newReview(profile.username, reviewerUsername, recTitle, recId, snippet)
  )
}