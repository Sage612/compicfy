import { SITE_NAME, SITE_URL } from './mailer'

const BRAND      = '#1dc9a0'
const BRAND_DARK = '#0ea5b0'
const BRAND_DIM  = '#1dc9a015'
const BRAND_BRD  = '#1dc9a030'

// ── SVG Logo inline ──────────────────────────────────────────────────────────
const LOGO = `
  <div style="display:inline-flex;align-items:center;gap:10px;">
    <!-- Speech bubble icon -->
    <svg width="36" height="36" viewBox="0 0 36 36" fill="none" xmlns="http://www.w3.org/2000/svg">
      <rect width="36" height="36" rx="10" fill="${BRAND}"/>
      <!-- C letterform cutout -->
      <path d="M22 13C20.6 11.8 18.9 11 17 11C13.1 11 10 14.1 10 18C10 21.9 13.1 25 17 25C18.9 25 20.6 24.2 22 23" stroke="white" stroke-width="2.5" stroke-linecap="round" fill="none"/>
      <!-- period dot -->
      <circle cx="25" cy="23" r="2" fill="white"/>
    </svg>
    <span style="color:#f9fafb;font-size:22px;font-weight:800;letter-spacing:-0.5px;">Com<span style="color:${BRAND};">Pic</span>fy</span>
  </div>
`

// ── Base shell ────────────────────────────────────────────────────────────────
const base = (content: string, badgeHtml = '') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Helvetica,Arial,sans-serif;">

  <!-- Outer wrapper -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;">

        <!-- ── Header: Logo ── -->
        <tr>
          <td style="padding:0 0 28px;text-align:center;">
            <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
              ${LOGO}
            </a>
          </td>
        </tr>

        <!-- ── Badge (optional) ── -->
        ${badgeHtml ? `<tr><td style="padding:0 0 20px;text-align:center;">${badgeHtml}</td></tr>` : ''}

        <!-- ── Card ── -->
        <tr>
          <td style="background:#111113;border:1px solid #27272a;border-radius:20px;padding:36px 32px;">
            ${content}
          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="padding:24px 0 0;text-align:center;">
            <p style="color:#52525b;font-size:12px;margin:0 0 6px;">
              © ${new Date().getFullYear()} ${SITE_NAME} · Comic discovery for real readers
            </p>
            <p style="margin:0;">
              <a href="${SITE_URL}/reader/dashboard/notifications" style="color:#71717a;font-size:12px;text-decoration:none;border-bottom:1px solid #3f3f46;">
                Manage notifications
              </a>
              <span style="color:#3f3f46;margin:0 8px;">·</span>
              <a href="${SITE_URL}" style="color:#71717a;font-size:12px;text-decoration:none;border-bottom:1px solid #3f3f46;">
                Visit ${SITE_NAME}
              </a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>

</body>
</html>
`

// ── Reusable blocks ───────────────────────────────────────────────────────────
const h1 = (text: string) =>
  `<h1 style="color:#fafafa;font-size:24px;font-weight:800;margin:0 0 14px;letter-spacing:-0.3px;line-height:1.3;">${text}</h1>`

const p = (text: string, muted = false) =>
  `<p style="color:${muted ? '#71717a' : '#a1a1aa'};font-size:15px;line-height:1.7;margin:0 0 20px;">${text}</p>`

const btn = (text: string, href: string, variant: 'primary' | 'ghost' = 'primary') =>
  variant === 'primary'
    ? `<a href="${href}" style="display:inline-block;background:linear-gradient(135deg,${BRAND},${BRAND_DARK});color:#fff;text-decoration:none;padding:13px 28px;border-radius:10px;font-weight:700;font-size:14px;letter-spacing:0.1px;">${text} →</a>`
    : `<a href="${href}" style="display:inline-block;color:${BRAND};text-decoration:none;font-size:14px;font-weight:600;padding:13px 0;">${text} →</a>`

const divider = () =>
  `<div style="border-top:1px solid #27272a;margin:28px 0;"></div>`

const quote = (text: string, accentColor = '#f59e0b') =>
  `<div style="background:#18181b;border-left:3px solid ${accentColor};border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 24px;">
    <p style="color:#a1a1aa;font-size:14px;margin:0;line-height:1.6;font-style:italic;">${text}</p>
  </div>`

const badge = (text: string, emoji: string, color: string, bgAlpha = '1a', brdAlpha = '33') =>
  `<div style="display:inline-flex;align-items:center;gap:7px;background:${color}${bgAlpha};border:1px solid ${color}${brdAlpha};border-radius:100px;padding:7px 16px;">
    <span style="font-size:14px;">${emoji}</span>
    <span style="color:${color};font-size:13px;font-weight:700;">${text}</span>
  </div>`

const highlight = (text: string) =>
  `<strong style="color:#fafafa;font-weight:700;">${text}</strong>`

// ── Templates ────────────────────────────────────────────────────────────────
export const templates = {

  welcome: (username: string) => base(`
    ${h1(`Welcome aboard, @${username}! 🎉`)}
    ${p(`You've just joined the best community for discovering manga, manhwa, manhua, and webtoons — recommended by real readers, not algorithms.`)}
    <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:20px 22px;margin:0 0 24px;">
      <p style="color:#fafafa;font-size:13px;font-weight:700;margin:0 0 14px;letter-spacing:0.05em;text-transform:uppercase;">Get started</p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #27272a;">
            <span style="color:${BRAND};font-size:14px;margin-right:10px;">📖</span>
            <a href="${SITE_URL}/browse" style="color:#a1a1aa;font-size:14px;text-decoration:none;">Browse community recommendations</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid #27272a;">
            <span style="color:${BRAND};font-size:14px;margin-right:10px;">✍️</span>
            <a href="${SITE_URL}/reader/dashboard/recommendations/new" style="color:#a1a1aa;font-size:14px;text-decoration:none;">Submit your first recommendation</a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <span style="color:${BRAND};font-size:14px;margin-right:10px;">📚</span>
            <a href="${SITE_URL}/reader/dashboard/lists" style="color:#a1a1aa;font-size:14px;text-decoration:none;">Create a reading list</a>
          </td>
        </tr>
      </table>
    </div>
    ${btn('Start Exploring', `${SITE_URL}/browse`)}
  `, badge('Welcome to Compicfy', '🎌', BRAND)),

  recommendationApproved: (username: string, title: string, recId: string) => base(`
    ${h1(`Your rec is live, @${username}!`)}
    ${p(`${highlight(`"${title}"`)} has been approved and is now discoverable by the entire Compicfy community. The community can vote, review, and save it.`)}
    <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:18px 20px;margin:0 0 24px;display:flex;gap:14px;">
      <div>
        <p style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 4px;">Title</p>
        <p style="color:#fafafa;font-size:15px;font-weight:700;margin:0;">${title}</p>
      </div>
    </div>
    ${btn('View Your Recommendation', `${SITE_URL}/comic/${recId}`)}
  `, badge('Recommendation Approved', '✅', '#16a34a')),

  recommendationRejected: (username: string, title: string, reason: string, recId: string) => base(`
    ${h1(`Hi @${username},`)}
    ${p(`Your recommendation for ${highlight(`"${title}"`)} was reviewed but couldn't be approved at this time.`)}
    ${quote(`<strong style="color:#fafafa;">Reason:</strong> ${reason}`, '#dc2626')}
    ${p(`You can edit your submission and resubmit, or appeal the decision if you believe it was made in error.`)}
    ${divider()}
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:12px;">${btn('Submit an Appeal', `${SITE_URL}/reader/dashboard/recommendations`)}</td>
        <td>${btn('Edit & Resubmit', `${SITE_URL}/reader/dashboard/recommendations`, 'ghost')}</td>
      </tr>
    </table>
  `, badge('Recommendation Not Approved', '❌', '#dc2626')),

  accountBanned: (username: string, reason: string) => base(`
    ${h1(`Hi @${username},`)}
    ${p(`Your ${SITE_NAME} account has been permanently banned following a review of your activity.`)}
    ${quote(`<strong style="color:#fafafa;">Reason:</strong> ${reason}`, '#dc2626')}
    ${p(`If you believe this was a mistake, you can submit a ban appeal and our team will review it.`, true)}
    ${divider()}
    ${btn('Submit a Ban Appeal', `${SITE_URL}/reader/dashboard`)}
  `, badge('Account Banned', '🚫', '#dc2626')),

  accountUnbanned: (username: string) => base(`
    ${h1(`Welcome back, @${username}!`)}
    ${p(`Your ${SITE_NAME} account restriction has been lifted. You now have full access to the platform again.`)}
    ${p(`We ask that you review our community guidelines to ensure a positive experience for everyone.`, true)}
    ${divider()}
    <table cellpadding="0" cellspacing="0">
      <tr>
        <td style="padding-right:12px;">${btn('Go to Dashboard', `${SITE_URL}/reader/dashboard`)}</td>
        <td>${btn('Community Guidelines', `${SITE_URL}/guidelines`, 'ghost')}</td>
      </tr>
    </table>
  `, badge('Account Reinstated', '✅', '#16a34a')),

  accountSuspended: (username: string, reason: string, duration_hours: number) => base(`
    ${h1(`Hi @${username},`)}
    ${p(`Your account has been temporarily suspended for ${highlight(`${duration_hours} hours`)}.`)}
    ${quote(`<strong style="color:#fafafa;">Reason:</strong> ${reason}`, '#f59e0b')}
    ${p(`Your account will be automatically reinstated once the suspension period ends. Please review our community guidelines in the meantime.`, true)}
    ${divider()}
    ${btn('View Community Guidelines', `${SITE_URL}/guidelines`)}
  `, badge('Temporary Suspension', '⚠️', '#f59e0b')),

  accountUnsuspended: (username: string) => base(`
    ${h1(`Good news, @${username}!`)}
    ${p(`Your account suspension has been lifted. You now have full access to ${SITE_NAME} again.`)}
    ${p(`Thank you for your patience. We look forward to seeing your contributions to the community.`, true)}
    ${divider()}
    ${btn('Go to Dashboard', `${SITE_URL}/reader/dashboard`)}
  `, badge('Access Restored', '✅', '#16a34a')),

  appealResolved: (username: string, type: string, outcome: string, title?: string) => base(`
    ${h1(`Hi @${username},`)}
    ${p(`Your ${type} appeal${title ? ` for ${highlight(`"${title}"`)}` : ''} has been reviewed and ${highlight(outcome === 'approved' ? 'approved' : 'rejected')}.`)}
    ${outcome === 'approved'
      ? `<div style="background:#16a34a15;border:1px solid #16a34a30;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
          <p style="color:#16a34a;font-size:14px;font-weight:600;margin:0;">
            ${type === 'ban' ? '🎉 Your account has been reinstated and is now fully active.' : '🎉 Your recommendation is now live on Compicfy.'}
          </p>
        </div>`
      : `<div style="background:#dc262615;border:1px solid #dc262630;border-radius:12px;padding:16px 20px;margin:0 0 24px;">
          <p style="color:#dc2626;font-size:14px;font-weight:600;margin:0;">After careful review, our team has decided to uphold the original decision.</p>
        </div>`
    }
    ${divider()}
    ${btn('Go to Dashboard', `${SITE_URL}/reader/dashboard`)}
  `, badge(`Appeal ${outcome === 'approved' ? 'Approved' : 'Rejected'}`, outcome === 'approved' ? '✅' : '❌', outcome === 'approved' ? '#16a34a' : '#dc2626')),

  newFollower: (username: string, followerUsername: string, followerDisplayName: string) => base(`
    ${h1(`You have a new follower!`)}
    ${p(`${highlight(followerDisplayName)} (${highlight(`@${followerUsername}`)}) just followed you on ${SITE_NAME}. They'll see your recommendations in their discovery feed.`)}
    <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:18px 20px;margin:0 0 24px;">
      <div style="display:flex;align-items:center;gap:12px;">
        <div style="width:42px;height:42px;border-radius:50%;background:${BRAND_DIM};border:2px solid ${BRAND_BRD};display:flex;align-items:center;justify-content:center;">
          <span style="color:${BRAND};font-size:16px;font-weight:800;">${followerDisplayName[0].toUpperCase()}</span>
        </div>
        <div>
          <p style="color:#fafafa;font-size:14px;font-weight:700;margin:0;">${followerDisplayName}</p>
          <p style="color:#71717a;font-size:13px;margin:4px 0 0;">@${followerUsername}</p>
        </div>
      </div>
    </div>
    ${btn('View Their Profile', `${SITE_URL}/profile/${followerUsername}`)}
  `, badge('New Follower', '👤', BRAND)),

  newVote: (username: string, voterUsername: string, title: string, recId: string, voteType: 'up' | 'down') => base(`
    ${h1(voteType === 'up' ? `Someone loves your rec! 👍` : `New vote on your rec`)}
    ${p(`${highlight(`@${voterUsername}`)} ${voteType === 'up' ? 'upvoted' : 'downvoted'} your recommendation for ${highlight(`"${title}"`)}.`)}
    <div style="background:#18181b;border:1px solid #27272a;border-radius:14px;padding:16px 20px;margin:0 0 24px;">
      <p style="color:#71717a;font-size:12px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;margin:0 0 6px;">Recommendation</p>
      <p style="color:#fafafa;font-size:15px;font-weight:700;margin:0;">${title}</p>
    </div>
    ${btn('View Recommendation', `${SITE_URL}/comic/${recId}`)}
  `, badge(voteType === 'up' ? 'New Upvote' : 'New Downvote', voteType === 'up' ? '👍' : '👎', voteType === 'up' ? '#16a34a' : '#dc2626')),

  newReview: (username: string, reviewerUsername: string, title: string, recId: string, reviewSnippet: string) => base(`
    ${h1(`@${reviewerUsername} reviewed your rec!`)}
    ${p(`Someone left a review on your recommendation for ${highlight(`"${title}"`)}.`)}
    ${quote(`"${reviewSnippet}${reviewSnippet.length >= 120 ? '…' : ''}"`, '#f59e0b')}
    ${btn('Read Full Review', `${SITE_URL}/comic/${recId}`)}
  `, badge('New Review', '⭐', '#f59e0b')),

}