import { sendMail, SITE_NAME } from './mailer'
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

/** Resolve the correct dashboard base path for a user */
async function getDashboardPath(userId: string, isPro?: boolean): Promise<string> {
  try {
    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type, is_pro, pro_expires_at, role')
      .eq('id', userId)
      .single() as { data: any }

    if (!profile) return '/reader/dashboard'

    const isAdmin   = ['admin', 'moderator'].includes(profile.role ?? '')
    const proActive = isAdmin || (profile.is_pro &&
      (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
    const isCreator = profile.user_type === 'creator'

    if (isCreator) return proActive ? '/pro/creator/dashboard' : '/creator/dashboard'
    return proActive ? '/pro/reader/dashboard' : '/reader/dashboard'
  } catch {
    return '/reader/dashboard'
  }
}

// ── Transactional emails ──────────────────────────────────────────────────────

export const sendWelcomeEmail = async (to: string, username: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Welcome to ${SITE_NAME}, @${username}! 🎉`, templates.welcome(username, dashboardPath))
}

export const sendApprovedEmail = async (to: string, username: string, title: string, recId: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your recommendation "${title}" was approved!`, templates.recommendationApproved(username, title, recId, dashboardPath))
}

export const sendRejectedEmail = async (to: string, username: string, title: string, reason: string, recId: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your recommendation "${title}" was not approved`, templates.recommendationRejected(username, title, reason, recId, dashboardPath))
}

export const sendBannedEmail = async (to: string, username: string, reason: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your ${SITE_NAME} account has been suspended`, templates.accountBanned(username, reason, dashboardPath))
}

export const sendUnbannedEmail = async (to: string, username: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your ${SITE_NAME} account has been reinstated`, templates.accountUnbanned(username, dashboardPath))
}

export const sendAppealResolvedEmail = async (to: string, username: string, type: string, outcome: string, title?: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your ${type} appeal has been ${outcome}`, templates.appealResolved(username, type, outcome, title, dashboardPath))
}

export const sendSuspendedEmail = async (to: string, username: string, reason: string, duration_hours: number, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your ${SITE_NAME} account has been temporarily suspended`, templates.accountSuspended(username, reason, duration_hours, dashboardPath))
}

export const sendUnsuspendedEmail = async (to: string, username: string, userId?: string) => {
  const dashboardPath = userId ? await getDashboardPath(userId) : '/reader/dashboard'
  return sendMail(to, `Your ${SITE_NAME} account access has been restored`, templates.accountUnsuspended(username, dashboardPath))
}

// ── Notification emails ───────────────────────────────────────────────────────

export async function sendFollowNotificationEmail(
  followedUserId:      string,
  followerUsername:    string,
  followerDisplayName: string
) {
  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', followedUserId)
    .single()

  if (!profile?.email_notifications || !profile?.username) return

  const [email, dashboardPath] = await Promise.all([
    getUserEmail(followedUserId),
    getDashboardPath(followedUserId),
  ])
  if (!email) return

  await sendMail(
    email,
    `@${followerUsername} is now following you on ${SITE_NAME}!`,
    templates.newFollower(profile.username, followerUsername, followerDisplayName, dashboardPath)
  )
}

export async function sendVoteNotificationEmail(
  recOwnerId:    string,
  voterUsername: string,
  recTitle:      string,
  recId:         string,
  voteType:      'up' | 'down'
) {
  if (voteType === 'down') return

  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', recOwnerId)
    .single()

  if (!profile?.email_notifications || !profile?.username) return

  const [email, dashboardPath] = await Promise.all([
    getUserEmail(recOwnerId),
    getDashboardPath(recOwnerId),
  ])
  if (!email) return

  await sendMail(
    email,
    `Your recommendation "${recTitle}" got an upvote! 👍`,
    templates.newVote(profile.username, voterUsername, recTitle, recId, voteType, dashboardPath)
  )
}

export async function sendReviewNotificationEmail(
  recOwnerId:       string,
  reviewerUsername: string,
  recTitle:         string,
  recId:            string,
  reviewContent:    string
) {
  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications')
    .eq('id', recOwnerId)
    .single()

  if (!profile?.email_notifications || !profile?.username) return

  const [email, dashboardPath] = await Promise.all([
    getUserEmail(recOwnerId),
    getDashboardPath(recOwnerId),
  ])
  if (!email) return

  await sendMail(
    email,
    `@${reviewerUsername} reviewed your recommendation "${recTitle}"`,
    templates.newReview(profile.username, reviewerUsername, recTitle, recId, reviewContent.slice(0, 120), dashboardPath)
  )
}