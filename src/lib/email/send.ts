import { sendMail, SITE_NAME } from './mailer'
import { templates } from './templates'
import { createClient } from '@supabase/supabase-js'
import { isAdmin as isAdminCheck, isProUser } from '@/lib/access'

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
async function getDashboardPath(userId: string): Promise<string> {
  try {
    const admin = getAdminClient()
    const { data: profile } = await admin
      .from('profiles')
      .select('user_type, is_pro, pro_expires_at, role')
      .eq('id', userId)
      .single() as { data: any }

    if (!profile) return '/reader/dashboard'

    const isAdmin   = isAdminCheck(profile)
    const proActive = isProUser(profile)
    const isCreator = profile.user_type === 'creator'

    if (isCreator) return proActive ? '/pro/creator/dashboard' : '/creator/dashboard'
    return proActive ? '/pro/reader/dashboard' : '/reader/dashboard'
  } catch {
    return '/reader/dashboard'
  }
}

async function getNotifiableEmailContext(
  userId:  string,
  prefKey?: string,
): Promise<{ email: string; username: string; dashboardPath: string } | null> {
  const admin = getAdminClient()
  const { data: profile } = await admin
    .from('profiles')
    .select('username, email_notifications, notification_prefs')
    .eq('id', userId)
    .single() as { data: any }

  if (!profile?.email_notifications || !profile?.username) return null

  if (prefKey) {
    const granular = profile.notification_prefs?.[prefKey]?.email
    if (granular === false) return null
  }

  const [email, dashboardPath] = await Promise.all([
    getUserEmail(userId),
    getDashboardPath(userId),
  ])
  if (!email) return null

  return { email, username: profile.username, dashboardPath }
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

export async function sendFollowNotificationEmail(
  followedUserId:      string,
  followerUsername:    string,
  followerDisplayName: string
) {
  const ctx = await getNotifiableEmailContext(followedUserId, 'followed_user_posted')
  if (!ctx) return

  await sendMail(
    ctx.email,
    `@${followerUsername} is now following you on ${SITE_NAME}!`,
    templates.newFollower(ctx.username, followerUsername, followerDisplayName, ctx.dashboardPath)
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

  const ctx = await getNotifiableEmailContext(recOwnerId)
  if (!ctx) return

  await sendMail(
    ctx.email,
    `Your recommendation "${recTitle}" got an upvote! 👍`,
    templates.newVote(ctx.username, voterUsername, recTitle, recId, voteType, ctx.dashboardPath)
  )
}

export async function sendReviewNotificationEmail(
  recOwnerId:       string,
  reviewerUsername: string,
  recTitle:         string,
  recId:            string,
  reviewContent:    string
) {
  const ctx = await getNotifiableEmailContext(recOwnerId)
  if (!ctx) return

  await sendMail(
    ctx.email,
    `@${reviewerUsername} reviewed your recommendation "${recTitle}"`,
    templates.newReview(ctx.username, reviewerUsername, recTitle, recId, reviewContent.slice(0, 120), ctx.dashboardPath)
  )
}

export interface DigestItem {
  event_type: 'collection_saved' | 'list_starred' | 'followed_user_posted' | 'chapter_update'
  payload:    Record<string, any>
}

export async function sendDigestEmail(userId: string, items: DigestItem[]) {
  if (items.length === 0) return

  const ctx = await getNotifiableEmailContext(userId)
  if (!ctx) return

  await sendMail(
    ctx.email,
    `Your ${SITE_NAME} digest: ${items.length} update${items.length === 1 ? '' : 's'}`,
    templates.digestSummary(ctx.username, items, ctx.dashboardPath)
  )
}