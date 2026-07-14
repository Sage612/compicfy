import { sendPushForUser } from '@/lib/utils/pushHelper'
 
export async function notifyFollowersOfNewPost(
  supabase: any,
  recId:    string,
  recTitle: string,
  submitterId:       string,
  submitterUsername: string,
) {
  try {
    const { data: followRows } = await supabase
      .from('follows')
      .select('follower_id')
      .eq('following_id', submitterId)

    if (!followRows || followRows.length === 0) return

    const followerIds = followRows.map((f: any) => f.follower_id)

    const { data: followers } = await supabase
      .from('profiles')
      .select('id, notification_prefs')
      .in('id', followerIds)

    if (!followers || followers.length === 0) return

    const notifTitle = `@${submitterUsername} posted a new recommendation`
    const notifBody  = `"${recTitle}" check it out.`

    await Promise.allSettled(
      followers.map(async (follower: any) => {
        const prefs = follower.notification_prefs?.followed_user_posted ?? {
          in_app: true, push: true, email: true,
        }

        if (prefs.in_app !== false) {
          await supabase.from('notifications').insert({
            user_id: follower.id,
            type:    'followed_user_posted',
            title:   notifTitle,
            data:    { recommendation_id: recId, submitter_id: submitterId, submitter_username: submitterUsername },
          })
        }

        if (prefs.push !== false) {
          await sendPushForUser(follower.id, notifTitle, notifBody, `/comic/${recId}`)
        }

        if (prefs.email !== false) {
          await supabase.from('notification_digest_queue').insert({
            user_id:    follower.id,
            event_type: 'followed_user_posted',
            payload:    { recommendation_id: recId, recommendation_title: recTitle, submitter_username: submitterUsername },
          })
        }
      })
    )
  } catch (err) {
    console.error('[notifyFollowersOfNewPost] error (non-fatal):', err)
  }
}