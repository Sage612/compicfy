import { SITE_NAME, SITE_URL } from './mailer'

// ── Brand tokens (Light, professional template 1 schemas) ───────────────────
const C = {
  bg:          '#f6f7f8',   // outer page background
  card:        '#ffffff',   // card background
  border:      '#e7e9ec',
  border2:     '#eceef0',
  text:        '#1a1a1a',
  muted:       '#5f6368',
  muted2:      '#9aa0a6',
  teal:        '#0ea5b0',
  tealDark:    '#0b8489',
  tealTint:    '#f0fafa',
  amber:       '#b45309',
  amberTint:   '#fdf6ec',
  emerald:     '#0f7a4f',
  emeraldTint: '#effaf4',
  red:         '#b3261e',
  redTint:     '#fdf1f0',
}

const font = `font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;`

// ── Logo (Template 1 clean typography as-is) ─────────────────────────────────
const makeLogo = () => {
  const prefix = SITE_NAME.slice(0, -2)
  const suffix = SITE_NAME.slice(-2)
  const nameStyle = `${font}font-size:18px;font-weight:700;letter-spacing:-0.3px;`

  return `
<table cellpadding="0" cellspacing="0" border="0" role="presentation">
  <tr>
    <td style="vertical-align:middle;padding-right:8px;">
      <svg width="32" height="32" viewBox="0 0 44 44" fill="none"
           xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <rect x="2" y="2" width="36" height="30" rx="8" fill="${C.teal}"/>
        <path d="M9 32 L5 43 L20 33.5" fill="${C.teal}"/>
        <path d="M28 11.5 C25 9 19.5 9 16.5 12 C13.5 15 13.5 20.5 16.5 23.5 C19.5 26.5 25 26.5 28 24"
              stroke="${C.text}" stroke-width="3.5" stroke-linecap="round" fill="none"/>
        <circle cx="30" cy="24.5" r="2.2" fill="${C.text}"/>
      </svg>
    </td>
    <td style="vertical-align:middle;white-space:nowrap;">
      <span style="${nameStyle}color:${C.text};">${prefix}</span><span style="${nameStyle}color:${C.teal};">${suffix}</span>
    </td>
  </tr>
</table>`
}

// ── Shell ─────────────────────────────────────────────────────────────────────
const shell = (content: string, dashboardPath = '/reader/dashboard') => `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="color-scheme" content="light">
  <title>${SITE_NAME}</title>
</head>
<body style="margin:0;padding:0;background:${C.bg};-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">
<table width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${C.bg};">
  <tr><td align="center" style="padding:48px 16px;">
    <table width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:480px;">

      <!-- Logo -->
      <tr>
        <td style="padding:0 0 32px;text-align:center;">
          <a href="${SITE_URL}" style="text-decoration:none;display:inline-block;">
            ${makeLogo()}
          </a>
        </td>
      </tr>

      <!-- Card -->
      <tr>
        <td style="background:${C.card};border:1px solid ${C.border};border-radius:12px;padding:40px 40px 32px;">
          ${content}
        </td>
      </tr>

      <!-- Footer -->
      <tr>
        <td style="padding:32px 8px 0;text-align:center;">
          <p style="color:${C.muted2};font-size:12px;line-height:1.6;margin:0 0 4px;${font}">
            © ${new Date().getFullYear()} ${SITE_NAME}, Inc. · Comic discovery for real readers
          </p>
          <p style="margin:0;${font}">
            <a href="${SITE_URL}${dashboardPath}/settings" style="color:${C.muted2};font-size:12px;text-decoration:none;">
              Notification settings
            </a>
            <span style="color:${C.border};margin:0 8px;">·</span>
            <a href="${SITE_URL}" style="color:${C.muted2};font-size:12px;text-decoration:none;">
              ${SITE_URL.replace(/https?:\/\//, '')}
            </a>
          </p>
        </td>
      </tr>

    </table>
  </td></tr>
</table>
</body>
</html>`

// ── Primitives ────────────────────────────────────────────────────────────────
const eyebrow = (text: string, color = C.teal) => `
<p style="color:${color};font-size:12px;font-weight:700;letter-spacing:0.4px;
          text-transform:uppercase;margin:0 0 12px;${font}">
  ${text}
</p>`

const h1 = (text: string) => `
<h1 style="color:${C.text};font-size:20px;font-weight:600;margin:0 0 12px;line-height:1.4;${font}">
  ${text}
</h1>`

const p = (text: string) => `
<p style="color:${C.muted};font-size:14px;line-height:1.65;margin:0 0 24px;${font}">
  ${text}
</p>`

const strong = (text: string) =>
  `<strong style="color:${C.text};font-weight:600;">${text}</strong>`

const cta = (text: string, href: string, color = C.teal) => `
<table cellpadding="0" cellspacing="0" border="0" style="margin:0 0 28px;width:100%;">
  <tr>
    <td align="center" style="background:${color};border-radius:8px;">
      <a href="${href}" target="_blank"
         style="display:block;color:#ffffff;text-decoration:none;padding:12px 24px;
                font-size:14px;font-weight:600;text-align:center;${font}">
        ${text}
      </a>
    </td>
  </tr>
</table>`

const fineLink = (text: string, href: string) => `
<p style="color:${C.muted2};font-size:12px;line-height:1.6;margin:0 0 24px;word-break:break-all;${font}">
  ${text} <a href="${href}" style="color:${C.teal};text-decoration:none;">${href}</a>
</p>`

const divider = () => `<div style="border-top:1px solid ${C.border};margin:0 0 24px;"></div>`

const infoBox = (content: string) => `
<div style="background:${C.bg};border:1px solid ${C.border2};border-radius:8px;padding:16px 20px;margin:0 0 24px;">
  ${content}
</div>`

const reasonBox = (reason: string, color = C.amber, tint = C.amberTint) => `
<div style="background:${tint};border-left:3px solid ${color};border-radius:0 6px 6px 0;padding:14px 18px;margin:0 0 24px;">
  <p style="color:${C.text};font-size:13px;line-height:1.6;margin:0;${font}">
    <strong style="font-weight:600;">Reason:</strong> ${reason}
  </p>
</div>`

const label = (text: string) => `
<p style="color:${C.muted2};font-size:11px;font-weight:600;text-transform:uppercase;
          letter-spacing:0.5px;margin:0 0 4px;${font}">
  ${text}
</p>`

const val = (text: string) => `
<p style="color:${C.text};font-size:14px;font-weight:600;margin:0;${font}">
  ${text}
</p>`

const checklist = (items: string[]) =>
  items.map(item => `
<div style="margin:0 0 10px;">
  <table cellpadding="0" cellspacing="0" border="0"><tr>
    <td style="vertical-align:top;padding-right:10px;width:16px;">
      <span style="color:${C.teal};font-size:13px;font-weight:700;">✓</span>
    </td>
    <td>
      <p style="color:${C.muted};font-size:13px;line-height:1.55;margin:0;${font}">${item}</p>
    </td>
  </tr></table>
</div>`).join('')

// ── Templates (Audited, Compiled, & Formatted) ───────────────────────────────
export const templates = {

  confirmEmail: (username: string, confirmUrl: string, dashboardPath = '/reader/dashboard') => shell(`
    ${h1(`Confirm your email`)}
    ${p(`Hi ${username}, thanks for signing up for ${SITE_NAME}. Click below to confirm your email address and activate your account.`)}
    ${cta('Confirm email address', confirmUrl)}
    ${divider()}
    ${fineLink('Or paste this link into your browser:', confirmUrl)}
    ${p(`If you didn't create an account, you can safely ignore this email.`)}
  `, dashboardPath),

  welcome: (username: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Welcome')}
    ${h1(`Hey ${username}, welcome aboard`)}
    ${p(`You've joined the community where real readers discover manga, manhwa, manhua, and webtoons  no algorithms, just genuine picks from people who actually read.`)}

    ${infoBox(`
      ${label('Get started')}
      <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:10px;">
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid ${C.border2};">
            <a href="${SITE_URL}/browse" style="color:${C.text};font-size:13px;text-decoration:none;${font}">
              Browse community recommendations
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;border-bottom:1px solid ${C.border2};">
            <a href="${SITE_URL}${dashboardPath}/recommendations/new" style="color:${C.text};font-size:13px;text-decoration:none;${font}">
              Submit your first recommendation
            </a>
          </td>
        </tr>
        <tr>
          <td style="padding:8px 0;">
            <a href="${SITE_URL}${dashboardPath}/lists" style="color:${C.text};font-size:13px;text-decoration:none;${font}">
              Create your first reading list
            </a>
          </td>
        </tr>
      </table>
    `)}

    ${cta('Start exploring', `${SITE_URL}/browse`)}
    ${p(`Questions? Just reply to this email — we read every one.`)}
  `, dashboardPath),

  recommendationApproved: (username: string, title: string, recId: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Recommendation approved', C.emerald)}
    ${h1(`Your rec is live, ${username}`)}
    ${p(`${strong(`"${title}"`)} has been approved and is now discoverable by the entire ${SITE_NAME} community. Readers can vote, review, and save it.`)}
    ${infoBox(`${label('Your recommendation')}${val(title)}`)}
    ${cta('View your recommendation', `${SITE_URL}/comic/${recId}`, C.emerald)}
    ${p(`Keep submitting — the more recs you share, the more the community discovers you.`)}
  `, dashboardPath),

  recommendationRejected: (username: string, title: string, reason: string, recId: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Recommendation not approved', C.red)}
    ${h1(`Hi ${username},`)}
    ${p(`Your recommendation for ${strong(`"${title}"`)} was reviewed but couldn't be approved this time.`)}
    ${reasonBox(reason, C.red, C.redTint)}
    ${p(`You can edit your submission and resubmit, or appeal if you think this was a mistake.`)}
    ${divider()}
    ${cta('Edit & resubmit', `${SITE_URL}${dashboardPath}/recommendations`, C.red)}
  `, dashboardPath),

  accountBanned: (username: string, reason: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Account suspended', C.red)}
    ${h1(`Hi ${username},`)}
    ${p(`Your ${SITE_NAME} account has been permanently suspended following a review.`)}
    ${reasonBox(reason, C.red, C.redTint)}
    ${p(`If you believe this was a mistake, you can submit a ban appeal and our team will review it.`)}
    ${divider()}
    ${cta('Submit a ban appeal', `${SITE_URL}${dashboardPath}`, C.red)}
  `, dashboardPath),

  accountUnbanned: (username: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Account reinstated', C.emerald)}
    ${h1(`Welcome back, ${username}`)}
    ${p(`Your ${SITE_NAME} account restriction has been lifted. You have full access again.`)}
    ${p(`Please review our community guidelines to help keep things smooth for everyone.`)}
    ${divider()}
    ${cta('Go to dashboard', `${SITE_URL}${dashboardPath}`, C.emerald)}
  `, dashboardPath),

  accountSuspended: (username: string, reason: string, duration_hours: number, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Temporary suspension', C.amber)}
    ${h1(`Hi ${username},`)}
    ${p(`Your account has been temporarily suspended for ${strong(`${duration_hours} hours`)}.`)}
    ${reasonBox(reason, C.amber, C.amberTint)}
    ${p(`Your account will be automatically reinstated once the suspension period ends.`)}
    ${divider()}
    ${cta('View guidelines', `${SITE_URL}/guidelines`, C.amber)}
  `, dashboardPath),

  accountUnsuspended: (username: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('Access restored', C.emerald)}
    ${h1(`Good news, ${username}`)}
    ${p(`Your suspension has been lifted. You have full access to ${SITE_NAME} again.`)}
    ${p(`Thank you for your patience — we're glad to have you back.`)}
    ${divider()}
    ${cta('Go to dashboard', `${SITE_URL}${dashboardPath}`, C.emerald)}
  `, dashboardPath),

  appealResolved: (username: string, type: string, outcome: string, title?: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow(outcome === 'approved' ? 'Appeal approved' : 'Appeal rejected', outcome === 'approved' ? C.emerald : C.red)}
    ${h1(`Hi ${username},`)}
    ${p(`Your ${type} appeal${title ? ` for ${strong(`"${title}"`)}` : ''} has been reviewed.`)}
    ${infoBox(
      outcome === 'approved'
        ? `<p style="color:${C.emerald};font-size:13px;font-weight:600;margin:0;${font}">
            ${type === 'ban' ? 'Your account has been reinstated and is fully active.' : `Your recommendation is now live on ${SITE_NAME}.`}
           </p>`
        : `<p style="color:${C.red};font-size:13px;font-weight:600;margin:0;${font}">
            After careful review, our team has upheld the original decision.
           </p>`
    )}
    ${cta('Go to dashboard', `${SITE_URL}${dashboardPath}`, outcome === 'approved' ? C.emerald : C.teal)}
  `, dashboardPath),

  newFollower: (username: string, followerUsername: string, followerDisplayName: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('New follower')}
    ${h1(`You have a new follower`)}
    ${p(`${strong(followerDisplayName)} (${strong(`@${followerUsername}`)}) just followed you on ${SITE_NAME}. Your recommendations will now show up in their feed.`)}
    ${infoBox(`
      <table cellpadding="0" cellspacing="0" border="0">
        <tr>
          <td width="36" height="36" style="vertical-align:middle;padding-right:12px;">
            <table cellpadding="0" cellspacing="0" border="0"><tr>
              <td width="36" height="36"
                style="width:36px;height:36px;background:${C.tealTint};border:1px solid ${C.border2};
                       border-radius:50%;text-align:center;vertical-align:middle;">
                <span style="color:${C.teal};font-size:14px;font-weight:700;">
                  ${followerDisplayName[0].toUpperCase()}
                </span>
              </td>
            </tr></table>
          </td>
          <td style="vertical-align:middle;">
            ${val(followerDisplayName)}
            <p style="color:${C.muted2};font-size:12px;margin:2px 0 0;${font}">@${followerUsername}</p>
          </td>
        </tr>
      </table>
    `)}
    ${cta('View their profile', `${SITE_URL}/profile/${followerUsername}`)}
  `, dashboardPath),

  newVote: (username: string, voterUsername: string, title: string, recId: string, voteType: 'up' | 'down', dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow(voteType === 'up' ? 'New upvote' : 'New downvote', voteType === 'up' ? C.emerald : C.red)}
    ${h1(voteType === 'up' ? 'Someone liked your rec' : 'New vote on your recommendation')}
    ${p(`${strong(`@${voterUsername}`)} ${voteType === 'up' ? 'upvoted' : 'downvoted'} your recommendation for ${strong(`"${title}"`)}.`)}
    ${infoBox(`${label('Recommendation')}${val(title)}`)}
    ${cta('View recommendation', `${SITE_URL}/comic/${recId}`, voteType === 'up' ? C.emerald : C.teal)}
  `, dashboardPath),

  newReview: (username: string, reviewerUsername: string, title: string, recId: string, reviewSnippet: string, dashboardPath = '/reader/dashboard') => shell(`
    ${eyebrow('New review', C.amber)}
    ${h1(`@${reviewerUsername} reviewed your rec`)}
    ${p(`Someone left a review on your recommendation for ${strong(`"${title}"`)}.`)}
    ${reasonBox(`"${reviewSnippet}${reviewSnippet.length >= 120 ? '…' : ''}"`, C.amber, C.amberTint)}
    ${cta('Read full review', `${SITE_URL}/comic/${recId}`, C.amber)}
  `, dashboardPath),

  proWaitlist: (email: string) => shell(`
    ${eyebrow(`You're on the list`)}
    ${h1(`Pro is coming, you'll be first to know`)}
    ${p(`We've added ${strong(email)} to the ${SITE_NAME} Pro waitlist. When Pro launches, you'll get an email before anyone else.`)}
    ${infoBox(`
      ${label(`What you'll get with Pro`)}
      <div style="margin-top:10px;">
        ${checklist([
          'Unlimited recommendations every month',
          'Full recommendation analytics dashboard',
          'Export reading lists as CSV or PDF',
          'Leaderboard access and rank tracking',
          'Exclusive Pro badge on your profile',
          'Priority review queue for submissions',
          'And more to come',
        ])}
      </div>
    `)}
    ${p(`While you wait, browse the community, submit recommendations, and build your reading lists. The platform is live and free right now.`)}
    ${cta('Start exploring', `${SITE_URL}/browse`)}
  `, '/reader/dashboard'),

}