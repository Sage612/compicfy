import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    const { data: proUsers } = await (supabase as any)
      .from('profiles')
      .select('id, username, display_name, pro_digest_enabled, pro_digest_last_sent')
      .eq('is_pro', true)
      .eq('pro_digest_enabled', true)

    if (!proUsers || proUsers.length === 0) {
      return NextResponse.json({ message: 'No Pro users to digest' })
    }

    const thisMonth = new Date()
    thisMonth.setDate(1)
    thisMonth.setHours(0, 0, 0, 0)

    let sent = 0

    for (const user of proUsers as any) {
      if (user.pro_digest_last_sent) {
        const lastSent = new Date(user.pro_digest_last_sent)
        if (lastSent >= thisMonth) continue
      }

      const lastMonth = new Date(thisMonth)
      lastMonth.setMonth(lastMonth.getMonth() - 1)

      const [recsRes, topRecRes, followersRes] = await Promise.all([
        (supabase as any)
          .from('recommendations')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', user.id)
          .gte('created_at', lastMonth.toISOString()),
        (supabase as any)
          .from('recommendations')
          .select('title, upvotes, save_count, view_count')
          .eq('user_id', user.id)
          .eq('is_approved', true)
          .order('score', { ascending: false })
          .limit(1)
          .maybeSingle(),
        (supabase as any)
          .from('follows')
          .select('*', { count: 'exact', head: true })
          .eq('following_id', user.id)
          .gte('created_at', lastMonth.toISOString()),
      ])

      const topRecData = topRecRes.data as any

      const stats = {
        new_recommendations: recsRes.count ?? 0,
        top_recommendation: topRecData?.title ?? null,
        top_rec_upvotes: topRecData?.upvotes ?? 0,
        top_rec_saves: topRecData?.save_count ?? 0,
        new_followers: followersRes.count ?? 0,
      }

      await (supabase as any).from('digest_logs').insert({
        user_id: user.id,
        month: thisMonth.toISOString().split('T')[0],
        stats: stats as any,
      })

      await (supabase as any)
        .from('profiles')
        .update({ pro_digest_last_sent: new Date().toISOString().split('T')[0] })
        .eq('id', user.id)

      console.log(`Digest queued for ${user.username}:`, stats)
      sent++
    }

    return NextResponse.json({ message: `Digest sent to ${sent} users` })
  } catch (error) {
    console.error('Digest error:', error)
    return NextResponse.json({ error: 'Digest failed' }, { status: 500 })
  }
}