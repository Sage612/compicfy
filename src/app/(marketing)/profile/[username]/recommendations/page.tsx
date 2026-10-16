import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft } from 'lucide-react'
import type { Recommendation } from '@/types/app.types'
import type { Metadata } from 'next'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { ProfileRecsClient } from '@/components/profile/ProfileRecsClient'
import { isProUser, isAdmin as isAdminCheck } from '@/lib/access'

interface Props {
  params: Promise<{ username: string }>
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return {
    title:       `@${username}'s Recommendations · ComPicfy`,
    description: `All comic recommendations shared by @${username} on ComPicfy`,
  }
}

const PAGE_SIZE = 24

export default async function ProfileRecsPage({ params }: Props) {
  const { username } = await params
  const supabase     = await createClient()

  const { data: profileData } = await supabase
    .from('profiles')
    .select('id, username, display_name, avatar_url, bio, is_pro, pro_expires_at, is_patron, patron_expires_at, role, verified_recommender')
    .eq('username', username.toLowerCase())
    .single()

  if (!profileData) notFound()

  const profile     = profileData as any
  const isPro       = isProUser(profile)
  const isAdmin     = isAdminCheck(profile)
  const displayName = profile.display_name || profile.username
  const initials    = displayName.slice(0, 2).toUpperCase()
  const showGold    = isPro && !isAdmin
  const ring        = isAdmin ? 'admin' : showGold ? 'gold' : 'default'

  const { count: totalCount } = await supabase
    .from('recommendations')
    .select('*', { count: 'exact', head: true })
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')

  const { data: recData } = await supabase
    .from('recommendations')
    .select('*')
    .eq('user_id', profile.id)
    .eq('is_approved', true)
    .not('content_rating', 'in', '("adult","mature")')
    .order('created_at', { ascending: false })
    .range(0, PAGE_SIZE - 1)

  const items = (recData ?? []) as Recommendation[]
  const total = totalCount ?? 0

  return (
    <div className="sh-page">
      <div className="sh-root" data-tier={showGold ? 'gold' : 'default'}>
        <div className="sh-body sh-recs-head">
          <Link href={`/profile/${profile.username}`} className="sh-back">
            <ArrowLeft size={14} /> Back to @{profile.username}
          </Link>

          <div className="sh-hero-top" style={{ marginTop: 18 }}>
            <div className="sh-avatar" data-ring={ring}>
              <ProAvatar
                src={profile.avatar_url}
                fallback={initials}
                size="lg"
                isPro={isPro}
                isAdmin={isAdmin}
              />
            </div>
            <div className="sh-id">
              <div className="sh-name-row">
                <h1 className="sh-name sh-display">{displayName}</h1>
                <ProBadge role={profile.role} isPro={isPro} />
                {profile.verified_recommender && <VerifiedBadge />}
              </div>
              <p className="sh-handle">@{profile.username}</p>
            </div>
          </div>

          <p className="sh-eyebrow" style={{ marginTop: 26 }}>Recommendations</p>
          <h2 className="sh-h2 sh-display" style={{ marginBottom: 4 }}>
            {total} {total === 1 ? 'pick' : 'picks'} shared
          </h2>
        </div>

        <div className="sh-body">
          <ProfileRecsClient
            username={profile.username}
            userId={profile.id}
            initialItems={items}
            initialTotal={total}
          />
        </div>
      </div>
    </div>
  )
}