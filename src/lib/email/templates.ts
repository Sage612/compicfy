import { SITE_NAME, SITE_URL } from './mailer'

// ── Brand tokens ─────────────────────────────────────────────────────────────
const C = {
  bg:       '#080808',
  card:     '#0f0f0f',
  border:   '#1a1a1a',
  border2:  '#222222',
  text:     '#f0f0f0',
  muted:    '#888888',
  muted2:   '#555555',
  teal:     '#0ea5b0',
  tealDim:  '#0ea5b015',
  tealBrd:  '#0ea5b030',
  amber:    '#f59e0b',
  emerald:  '#10b981',
  red:      '#ef4444',
}

// ── Email-safe logo ───────────────────────────────────────────────────────────
// Uses table layout for max email client compatibility
const LOGO = `
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 auto;">
  <tr>
    <td style="vertical-align:middle;padding-right:10px;">
      <!-- Speech bubble icon -->
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="40" height="40"
            style="width:40px;height:40px;background:${C.teal};border-radius:10px;
                   text-align:center;vertical-align:middle;">
            <svg width="26" height="26" viewBox="0 0 44 44" fill="none"
                 xmlns="http://www.w3.org/2000/svg"
                 style="display:block;margin:7px auto;">
              <rect x="2" y="2" width="36" height="30" rx="8" fill="${C.teal}"/>
              <path d="M9 32 L5 43 L20 33.5" fill="${C.teal}"/>
              <path d="M28 11.5 C25 9 19.5 9 16.5 12 C13.5 15 13.5 20.5 16.5 23.5 C19.5 26.5 25 26.5 28 24"
                    stroke="#080808" stroke-width="3.5" stroke-linecap="round" fill="none"/>
              <circle cx="30" cy="24.5" r="2.2" fill="#080808"/>
            </svg>
          </td>
        </tr>
      </table>
    </td>
    <td style="vertical-align:middle;">
      <span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                   font-size:22px;font-weight:900;letter-spacing:-0.8px;color:${C.text};">
        Compic</span><span style="font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                   font-size:22px;font-weight:900;letter-spacing:-0.8px;color:${C.teal};">fy</span>
    </td>
  </tr>
</table>`

// ── Base shell ────────────────────────────────────────────────────────────────
const shell = (content: string) => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="dark">
  <title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0"
       style="background:${C.bg};min-height:100vh;">
  <tr><td align="center" style="padding:40px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0"
           style="max-width:560px;">

      <!-- ── Logo header ── -->
      <tr>
        <td style="padding:0 0 32px;text-align:center;">
          <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
            ${LOGO}
          </a>
        </td>
      </tr>

      <!-- ── Card ── -->
      <tr>
        <td style="background:${C.card};border:1px solid ${C.border};
                   border-radius:20px;padding:40px 36px;">
          ${content}
        </td>
      </tr>

      <!-- ── Footer ── -->
      <tr>
        <td style="padding:28px 0 0;text-align:center;">
          <p style="color:${C.muted2};font-size:12px;margin:0 0 8px;
                    font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            © ${new Date().getFullYear()} ${SITE_NAME} · Comic discovery for real readers
          </p>
          <p style="margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            <a href="${SITE_URL}/reader/dashboard/settings"
               style="color:${C.muted};font-size:12px;text-decoration:none;">
              Notification settings
            </a>
            <span style="color:${C.border2};margin:0 8px;">·</span>
            <a href="${SITE_URL}"
               style="color:${C.muted};font-size:12px;text-decoration:none;">
              ${SITE_URL.replace('https://', '')}
            </a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

// ── Component primitives ──────────────────────────────────────────────────────

const badge = (text: string, color: string) => `
<div style="display:inline-block;background:${color}18;border:1px solid ${color}35;
            border-radius:100px;padding:6px 16px;margin:0 0 24px;">
  <span style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.3px;
               font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    ${text}
  </span>
</div>`

const h1 = (text: string) => `
<h1 style="color:${C.text};font-size:26px;font-weight:800;margin:0 0 16px;
           letter-spacing:-0.5px;line-height:1.25;
           font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  ${text}
</h1>`

const p = (text: string) => `
<p style="color:${C.muted};font-size:15px;line-height:1.75;margin:0 0 20px;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  ${text}
</p>`

const strong = (text: string) =>
  `<strong style="color:${C.text};font-weight:700;">${text}</strong>`

const cta = (text: string, href: string, color = C.teal) => `
<table cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 24px;">
  <tr>
    <td style="background:${color};border-radius:10px;">
      <a href="${href}"
         style="display:inline-block;color:#fff;text-decoration:none;
                padding:13px 28px;font-size:14px;font-weight:700;
                font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;
                letter-spacing:0.1px;">
        ${text} →
      </a>
    </td>
  </tr>
</table>`

const divider = () => `
<div style="border-top:1px solid ${C.border};margin:28px 0;"></div>`

const infoBox = (content: string, borderColor = C.border2) => `
<div style="background:#131313;border:1px solid ${borderColor};
            border-radius:12px;padding:18px 20px;margin:0 0 24px;">
  ${content}
</div>`

const reasonBox = (reason: string, color = C.amber) => `
<div style="background:${color}0d;border-left:3px solid ${color};
            border-radius:0 10px 10px 0;padding:14px 18px;margin:0 0 24px;">
  <p style="color:${C.muted};font-size:14px;margin:0;line-height:1.6;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    <strong style="color:${C.text};">Reason:</strong> ${reason}
  </p>
</div>`

const label = (text: string) => `
<p style="color:${C.muted2};font-size:11px;font-weight:700;text-transform:uppercase;
          letter-spacing:0.8px;margin:0 0 6px;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  ${text}
</p>`

const value = (text: string) => `
<p style="color:${C.text};font-size:15px;font-weight:700;margin:0;
          font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
  ${text}
</p>`

const checklist = (items: string[], color = C.teal) =>
  items.map(item => `
<div style="display:flex;align-items:center;gap:10px;margin:0 0 10px;">
  <div style="width:18px;height:18px;background:${color}20;border-radius:50%;
              text-align:center;line-height:18px;flex-shrink:0;">
    <span style="color:${color};font-size:11px;font-weight:800;">✓</span>
  </div>
  <p style="color:${C.muted};font-size:14px;margin:0;
             font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
    ${item}
  </p>
</div>`).join('')

// ── Templates ────────────────────────────────────────────────────────────────
export const templates = {

  // ── Welcome ──
  welcome: (username: string) => shell(`
    ${badge('Welcome to Compicfy 🎌', C.teal)}
    ${h1(`Hey @${username}, welcome aboard! 👋`)}
    ${p(`You've just joined the community where real readers discover manga, manhwa, manhua, and webtoons, no algorithms, just genuine picks from people who actually read.`)}

    ${infoBox(`
      ${label('Get started')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:12px;">
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${C.border};">
            <a href="${SITE_URL}/browse"
               style="color:${C.muted};font-size:14px;text-decoration:none;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <span style="color:${C.teal};margin-right:10px;">📖</span>Browse community recommendations
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;border-bottom:1px solid ${C.border};">
            <a href="${SITE_URL}/reader/dashboard/recommendations/new"
               style="color:${C.muted};font-size:14px;text-decoration:none;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <span style="color:${C.teal};margin-right:10px;">✍️</span>Submit your first recommendation
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:10px 0;">
            <a href="${SITE_URL}/reader/dashboard/lists"
               style="color:${C.muted};font-size:14px;text-decoration:none;
                      font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              <span style="color:${C.teal};margin-right:10px;">📚</span>Create your first reading list
            </a>
          </td>
        </tr>
      </table>
    `)}

    ${cta('Start Exploring', `${SITE_URL}/browse`)}
    ${p(`If you have any questions, just reply to this email. We read every one.`)}
  `),

  // ── Rec Approved ──
  recommendationApproved: (username: string, title: string, recId: string) => shell(`
    ${badge('✅ Recommendation Approved', C.emerald)}
    ${h1(`Your rec is live, @${username}!`)}
    ${p(`${strong(`"${title}"`)} has been approved and is now discoverable by the entire Compicfy community. Readers can now vote, review, and save it.`)}

    ${infoBox(`
      ${label('Your recommendation')}
      ${value(title)}
    `, C.emerald + '30')}

    ${cta('View Your Recommendation', `${SITE_URL}/comic/${recId}`, C.emerald)}
    ${p(`Keep submitting — the more recs you share, the more the community discovers you.`)}
  `),

  // ── Rec Rejected ──
  recommendationRejected: (username: string, title: string, reason: string, recId: string) => shell(`
    ${badge('❌ Recommendation Not Approved', C.red)}
    ${h1(`Hi @${username},`)}
    ${p(`Your recommendation for ${strong(`"${title}"`)} was reviewed but couldn't be approved this time.`)}
    ${reasonBox(reason, C.red)}
    ${p(`You can edit your submission and resubmit, or appeal if you think this was a mistake.`)}
    ${divider()}
    ${cta('Edit & Resubmit', `${SITE_URL}/reader/dashboard/recommendations`, C.red)}
  `),

  // ── Account Banned ──
  accountBanned: (username: string, reason: string) => shell(`
    ${badge('🚫 Account Suspended', C.red)}
    ${h1(`Hi @${username},`)}
    ${p(`Your ${SITE_NAME} account has been permanently suspended following a review.`)}
    ${reasonBox(reason, C.red)}
    ${p(`If you believe this was a mistake you can submit a ban appeal and our team will review it.`)}
    ${divider()}
    ${cta('Submit a Ban Appeal', `${SITE_URL}/reader/dashboard`, C.red)}
  `),

  // ── Account Unbanned ──
  accountUnbanned: (username: string) => shell(`
    ${badge('✅ Account Reinstated', C.emerald)}
    ${h1(`Welcome back, @${username}!`)}
    ${p(`Your ${SITE_NAME} account restriction has been lifted. You have full access again.`)}
    ${p(`Please review our community guidelines to ensure a smooth experience for everyone.`)}
    ${divider()}
    ${cta('Go to Dashboard', `${SITE_URL}/reader/dashboard`, C.emerald)}
  `),

  // ── Account Suspended ──
  accountSuspended: (username: string, reason: string, duration_hours: number) => shell(`
    ${badge('⚠️ Temporary Suspension', C.amber)}
    ${h1(`Hi @${username},`)}
    ${p(`Your account has been temporarily suspended for ${strong(`${duration_hours} hours`)}.`)}
    ${reasonBox(reason, C.amber)}
    ${p(`Your account will be automatically reinstated once the suspension period ends.`)}
    ${divider()}
    ${cta('View Guidelines', `${SITE_URL}/guidelines`, C.amber)}
  `),

  // ── Account Unsuspended ──
  accountUnsuspended: (username: string) => shell(`
    ${badge('✅ Access Restored', C.emerald)}
    ${h1(`Good news, @${username}!`)}
    ${p(`Your suspension has been lifted. You have full access to ${SITE_NAME} again.`)}
    ${p(`Thank you for your patience. We're glad to have you back.`)}
    ${divider()}
    ${cta('Go to Dashboard', `${SITE_URL}/reader/dashboard`, C.emerald)}
  `),

  // ── Appeal Resolved ──
  appealResolved: (username: string, type: string, outcome: string, title?: string) => shell(`
    ${badge(
      outcome === 'approved' ? '✅ Appeal Approved' : '❌ Appeal Rejected',
      outcome === 'approved' ? C.emerald : C.red
    )}
    ${h1(`Hi @${username},`)}
    ${p(`Your ${type} appeal${title ? ` for ${strong(`"${title}"`)}` : ''} has been reviewed.`)}

    ${infoBox(
      outcome === 'approved'
        ? `<p style="color:${C.emerald};font-size:14px;font-weight:600;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            ${type === 'ban' ? '🎉 Your account has been reinstated and is fully active.' : '🎉 Your recommendation is now live on Compicfy.'}
           </p>`
        : `<p style="color:${C.red};font-size:14px;font-weight:600;margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
            After careful review, our team has upheld the original decision.
           </p>`,
      outcome === 'approved' ? C.emerald + '30' : C.red + '30'
    )}

    ${cta('Go to Dashboard', `${SITE_URL}/reader/dashboard`,
      outcome === 'approved' ? C.emerald : C.teal
    )}
  `),

  // ── New Follower ──
  newFollower: (username: string, followerUsername: string, followerDisplayName: string) => shell(`
    ${badge('👤 New Follower', C.teal)}
    ${h1(`You have a new follower!`)}
    ${p(`${strong(followerDisplayName)} (${strong(`@${followerUsername}`)}) just followed you on ${SITE_NAME}. Their feed will now feature your recommendations.`)}

    ${infoBox(`
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="44" height="44" style="width:44px;height:44px;vertical-align:middle;padding-right:14px;">
            <table cellpadding="0" cellspacing="0" border="0">
              <tr>
                <td width="44" height="44"
                  style="width:44px;height:44px;background:${C.tealDim};border:2px solid ${C.tealBrd};
                         border-radius:50%;text-align:center;vertical-align:middle;">
                  <span style="color:${C.teal};font-size:18px;font-weight:800;">
                    ${followerDisplayName[0].toUpperCase()}
                  </span>
                </td>
              </tr>
            </table>
          </td>
          <td style="vertical-align:middle;">
            ${value(followerDisplayName)}
            <p style="color:${C.muted};font-size:13px;margin:4px 0 0;
                       font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Arial,sans-serif;">
              @${followerUsername}
            </p>
          </td>
        </tr>
      </table>
    `)}

    ${cta('View Their Profile', `${SITE_URL}/profile/${followerUsername}`)}
  `),

  // ── New Vote ──
  newVote: (username: string, voterUsername: string, title: string, recId: string, voteType: 'up' | 'down') => shell(`
    ${badge(
      voteType === 'up' ? '👍 New Upvote' : '👎 New Downvote',
      voteType === 'up' ? C.emerald : C.red
    )}
    ${h1(voteType === 'up' ? 'Someone loves your rec!' : 'New vote on your recommendation')}
    ${p(`${strong(`@${voterUsername}`)} ${voteType === 'up' ? 'upvoted' : 'downvoted'} your recommendation for ${strong(`"${title}"`)}.`)}

    ${infoBox(`
      ${label('Recommendation')}
      ${value(title)}
    `, voteType === 'up' ? C.emerald + '30' : C.red + '30')}

    ${cta('View Recommendation', `${SITE_URL}/comic/${recId}`,
      voteType === 'up' ? C.emerald : C.teal
    )}
  `),

  // ── New Review ──
  newReview: (username: string, reviewerUsername: string, title: string, recId: string, reviewSnippet: string) => shell(`
    ${badge('⭐ New Review', C.amber)}
    ${h1(`@${reviewerUsername} reviewed your rec!`)}
    ${p(`Someone left a review on your recommendation for ${strong(`"${title}"`)}.`)}

    ${reasonBox(
      `"${reviewSnippet}${reviewSnippet.length >= 120 ? '…' : ''}"`,
      C.amber
    )}

    ${cta('Read Full Review', `${SITE_URL}/comic/${recId}`, C.amber)}
  `),

  // ── Pro Waitlist Confirmation ──
  proWaitlist: (email: string) => shell(`
    ${badge('🎉 You\'re on the list!', C.teal)}
    ${h1(`Pro is coming, you'll be first to know.`)}
    ${p(`We've added ${strong(email)} to the Compicfy Pro waitlist. When Pro launches, you'll get an email before anyone else.`)}

    ${infoBox(`
      ${label("What you'll get with Pro")}
      <div style="margin-top:14px;">
        ${checklist([
          'Unlimited recommendations every month',
          'Full recommendation analytics dashboard',
          'Export reading lists as CSV or PDF',
          'Leaderboard access and rank tracking',
          'Exclusive 👑 Pro badge on your profile',
          'Priority review queue for submissions',
        ])}
      </div>
    `)}

    ${p(`While you wait browse the community, submit recommendations, and build your reading lists. The platform is live and free right now.`)}
    ${cta('Start Exploring', `${SITE_URL}/browse`)}
  `),

}