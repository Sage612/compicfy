import { SITE_NAME, SITE_URL } from './mailer'

// ── Brand colors — updated to Compicfy teal ──────────────────────
const BRAND     = '#0ea5b0'   // teal primary
const BRAND_DIM = '#0ea5b01a' // teal 10% opacity for badge backgrounds
const BRAND_BRD = '#0ea5b033' // teal 20% opacity for badge borders

const base = (content: string) => `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#0f0f0f;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <div style="max-width:600px;margin:0 auto;padding:40px 20px;">
    <div style="text-align:center;margin-bottom:32px;">
      <h1 style="color:${BRAND};font-size:24px;font-weight:800;margin:0;letter-spacing:-0.5px;">
         ${SITE_NAME}
      </h1>
    </div>

    <div style="background:#1a1d27;border:1px solid #2a2d3a;border-radius:16px;padding:32px;">
      ${content}
    </div>

    <div style="text-align:center;margin-top:24px;">
      <p style="color:#6b7280;font-size:12px;margin:0;">
        © ${new Date().getFullYear()} ${SITE_NAME} ·
        <a href="${SITE_URL}/dashboard/notifications" style="color:${BRAND};text-decoration:none;">
          Manage notifications
        </a>
      </p>
    </div>
  </div>
</body>
</html>
`

const h1 = (text: string) =>
  `<h2 style="color:#f9fafb;font-size:22px;font-weight:700;margin:0 0 12px;">${text}</h2>`

const p = (text: string) =>
  `<p style="color:#9ca3af;font-size:15px;line-height:1.6;margin:0 0 20px;">${text}</p>`

const btn = (text: string, href: string) =>
  `<a href="${href}" style="display:inline-block;background:${BRAND};color:#fff;text-decoration:none;padding:12px 24px;border-radius:8px;font-weight:600;font-size:14px;">${text}</a>`

const divider = () =>
  `<hr style="border:none;border-top:1px solid #2a2d3a;margin:24px 0;">`

export const templates = {
  welcome: (username: string) => base(`
    ${h1(`Welcome to ${SITE_NAME}, @${username}! 🎉`)}
    ${p(`We're thrilled to have you in the community. Start discovering manga, manhwa, manhua, and webtoons recommended by real readers like you.`)}
    ${divider()}
    <div style="margin-bottom:20px;">
      ${btn('Browse Comics', `${SITE_URL}/browse`)}
      <a href="${SITE_URL}/dashboard/recommendations/new" style="display:inline-block;margin-left:12px;color:${BRAND};text-decoration:none;font-size:14px;font-weight:600;">Submit a Recommendation →</a>
    </div>
    ${p(`If you have any questions, join our Discord community we'd love to chat.`)}
  `),

  recommendationApproved: (username: string, title: string, recId: string) => base(`
    <div style="display:inline-block;background:#16a34a1a;border:1px solid #16a34a33;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#16a34a;font-size:13px;font-weight:600;">✅ Recommendation Approved</span>
    </div>
    ${h1(`Great news, @${username}!`)}
    ${p(`Your recommendation for <strong style="color:#f9fafb;">"${title}"</strong> has been approved and is now live on Compicfy. The community can now discover, vote, and review it!`)}
    ${divider()}
    ${btn('View Your Recommendation', `${SITE_URL}/comic/${recId}`)}
  `),

  recommendationRejected: (username: string, title: string, reason: string, recId: string) => base(`
    <div style="display:inline-block;background:#dc26261a;border:1px solid #dc262633;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#dc2626;font-size:13px;font-weight:600;">❌ Recommendation Not Approved</span>
    </div>
    ${h1(`Hi @${username},`)}
    ${p(`Your recommendation for <strong style="color:#f9fafb;">"${title}"</strong> was not approved.`)}
    <div style="background:#2a2d3a;border-left:3px solid #dc2626;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="color:#9ca3af;font-size:13px;margin:0;"><strong style="color:#f9fafb;">Reason:</strong> ${reason}</p>
    </div>
    ${p(`You can submit an appeal if you believe this decision should be reconsidered.`)}
    ${divider()}
    ${btn('Submit an Appeal', `${SITE_URL}/dashboard/recommendations`)}
  `),

  accountBanned: (username: string, reason: string) => base(`
    <div style="display:inline-block;background:#dc26261a;border:1px solid #dc262633;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#dc2626;font-size:13px;font-weight:600;">🚫 Account Banned</span>
    </div>
    ${h1(`Hi @${username},`)}
    ${p(`Your ${SITE_NAME} account has been Banned.`)}
    <div style="background:#2a2d3a;border-left:3px solid #dc2626;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="color:#9ca3af;font-size:13px;margin:0;"><strong style="color:#f9fafb;">Reason:</strong> ${reason}</p>
    </div>
    ${p(`If you believe this was a mistake, you can submit a ban appeal from your dashboard.`)}
    ${divider()}
    ${btn('Submit a Ban Appeal', `${SITE_URL}/dashboard`)}
  `),

  accountUnbanned: (username: string) => base(`
    <div style="display:inline-block;background:#16a34a1a;border:1px solid #16a34a33;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#16a34a;font-size:13px;font-weight:600;">✅ Account Reinstated</span>
    </div>
    ${h1(`Welcome back, @${username}!`)}
    ${p(`Your ${SITE_NAME} account suspension has been lifted. You can now log in and continue using the platform.`)}
    ${divider()}
    ${btn('Go to Dashboard', `${SITE_URL}/dashboard`)}
  `),

  accountSuspended: (username: string, reason: string, duration_hours: number) => base(`
    <div style="display:inline-block;background:#f59e0b1a;border:1px solid #f59e0b33;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#f59e0b;font-size:13px;font-weight:600;">⚠️ Temporary Suspension</span>
    </div>
    ${h1(`Hi @${username},`)}
    ${p(`Your account has been temporarily suspended for <strong>${duration_hours} hours</strong>.`)}
    <div style="background:#2a2d3a;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="color:#9ca3af;font-size:13px;margin:0;"><strong style="color:#f9fafb;">Reason:</strong> ${reason}</p>
    </div>
    ${p(`If you believe this was an error, please reach out to our support team.`)}
    ${divider()}
    ${btn('View Dashboard', `${SITE_URL}/dashboard`)}
  `),

  accountUnsuspended: (username: string) => base(`
    <div style="display:inline-block;background:#16a34a1a;border:1px solid #16a34a33;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#16a34a;font-size:13px;font-weight:600;">✅ Access Restored</span>
    </div>
    ${h1(`Good news, @${username}!`)}
    ${p(`Your account suspension has been lifted. You now have full access to ${SITE_NAME} again. Welcome back!`)}
    ${divider()}
    ${btn('Go to Dashboard', `${SITE_URL}/dashboard`)}
  `),

  appealResolved: (username: string, type: string, outcome: string, title?: string) => base(`
    <div style="display:inline-block;background:${outcome === 'approved' ? '#16a34a1a' : '#dc26261a'};border:1px solid ${outcome === 'approved' ? '#16a34a33' : '#dc262633'};border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:${outcome === 'approved' ? '#16a34a' : '#dc2626'};font-size:13px;font-weight:600;">
        ${outcome === 'approved' ? '✅' : '❌'} Appeal ${outcome === 'approved' ? 'Approved' : 'Rejected'}
      </span>
    </div>
    ${h1(`Hi @${username},`)}
    ${p(`Your ${type} appeal${title ? ` for <strong style="color:#f9fafb;">"${title}"</strong>` : ''} has been <strong style="color:#f9fafb;">${outcome}</strong>.`)}
    ${outcome === 'approved'
      ? p(`The decision has been reversed. ${type === 'ban' ? 'Your account is now active.' : 'Your recommendation is now live.'}`)
      : p(`After review, our team has decided to uphold the original decision.`)
    }
    ${divider()}
    ${btn('Go to Dashboard', `${SITE_URL}/dashboard`)}
  `),

  newFollower: (username: string, followerUsername: string, followerDisplayName: string) => base(`
    <div style="display:inline-block;background:${BRAND_DIM};border:1px solid ${BRAND_BRD};border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:${BRAND};font-size:13px;font-weight:600;">👤 New Follower</span>
    </div>
    ${h1(`@${followerUsername} is now following you!`)}
    ${p(`<strong style="color:#f9fafb;">${followerDisplayName}</strong> just followed you on ${SITE_NAME}. They'll see your recommendations in their feed.`)}
    ${divider()}
    ${btn('View Their Profile', `${SITE_URL}/profile/${followerUsername}`)}
  `),

  newVote: (username: string, voterUsername: string, title: string, recId: string, voteType: 'up' | 'down') => base(`
    <div style="display:inline-block;background:${voteType === 'up' ? '#16a34a1a' : '#dc26261a'};border:1px solid ${voteType === 'up' ? '#16a34a33' : '#dc262633'};border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:${voteType === 'up' ? '#16a34a' : '#dc2626'};font-size:13px;font-weight:600;">
        ${voteType === 'up' ? '👍 New Upvote' : '👎 New Downvote'}
      </span>
    </div>
    ${h1(`Your recommendation got a ${voteType === 'up' ? 'thumbs up' : 'thumbs down'}!`)}
    ${p(`<strong style="color:#f9fafb;">@${voterUsername}</strong> ${voteType === 'up' ? 'upvoted' : 'downvoted'} your recommendation for <strong style="color:#f9fafb;">"${title}"</strong>.`)}
    ${divider()}
    ${btn('View Recommendation', `${SITE_URL}/comic/${recId}`)}
  `),

  newReview: (username: string, reviewerUsername: string, title: string, recId: string, reviewSnippet: string) => base(`
    <div style="display:inline-block;background:#f59e0b1a;border:1px solid #f59e0b33;border-radius:8px;padding:6px 12px;margin-bottom:20px;">
      <span style="color:#f59e0b;font-size:13px;font-weight:600;">⭐ New Review</span>
    </div>
    ${h1(`@${reviewerUsername} reviewed your recommendation!`)}
    ${p(`Someone left a review on your recommendation for <strong style="color:#f9fafb;">"${title}"</strong>.`)}
    <div style="background:#2a2d3a;border-left:3px solid #f59e0b;padding:12px 16px;border-radius:0 8px 8px 0;margin-bottom:20px;">
      <p style="color:#9ca3af;font-size:13px;margin:0;font-style:italic;">"${reviewSnippet}${reviewSnippet.length >= 120 ? '…' : ''}"</p>
    </div>
    ${divider()}
    ${btn('Read Full Review', `${SITE_URL}/comic/${recId}`)}
  `),
}