import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import {
  CalendarDays, BookOpen, Star, ThumbsUp,
  Globe, BookMarked, Users, Pin, ArrowRight,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { FollowButton } from '@/components/user/FollowButton'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ProAvatar } from '@/components/pro/ProAvatar'
import { ProBadge } from '@/components/pro/ProBadge'
import { VerifiedBadge } from '@/components/pro/VerifiedBadge'
import { Button } from '@/components/ui/button'
import { TasteTags } from '@/components/profile/TasteTags'
import { TasteCompatibility } from '@/components/profile/TasteCompatibility'
import { ProfileShelf } from '@/components/profile/ProfileShelf'
import { MangaDNACard } from '@/components/profile/MangaDNACard'
import { ProfileBadges } from '@/components/profile/ProfileBadges'

const GHOST_ID = '00000000-0000-0000-0000-000000000000'

interface Props { params: Promise<{ username: string }> }

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { username } = await params
  return { title: `@${username} • Compicfy`, description: `Check out @${username}'s comic recommendations` }
}

const GENRE_COLORS: Record<string, string> = {
  Action:'bg-red-500/15 text-red-400 border-red-500/30',
  Adventure:'bg-orange-500/15 text-orange-400 border-orange-500/30',
  Comedy:'bg-yellow-500/15 text-yellow-400 border-yellow-500/30',
  Drama:'bg-orange-600/15 text-orange-400 border-orange-600/30',
  Fantasy:'bg-violet-500/15 text-violet-400 border-violet-500/30',
  Horror:'bg-zinc-500/15 text-zinc-300 border-zinc-500/30',
  Mystery:'bg-slate-500/15 text-slate-300 border-slate-500/30',
  Romance:'bg-pink-500/15 text-pink-400 border-pink-500/30',
  'Sci-Fi':'bg-cyan-500/15 text-cyan-400 border-cyan-500/30',
  'Slice of Life':'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  Sports:'bg-amber-500/15 text-amber-400 border-amber-500/30',
  Supernatural:'bg-purple-500/15 text-purple-400 border-purple-500/30',
  Thriller:'bg-red-700/15 text-red-400 border-red-700/30',
  Isekai:'bg-indigo-500/15 text-indigo-400 border-indigo-500/30',
  'Martial Arts':'bg-rose-600/15 text-rose-400 border-rose-600/30',
  'School Life':'bg-sky-500/15 text-sky-400 border-sky-500/30',
  Historical:'bg-stone-500/15 text-stone-300 border-stone-500/30',
  Psychological:'bg-fuchsia-500/15 text-fuchsia-400 border-fuchsia-500/30',
  Shounen:'bg-blue-500/15 text-blue-400 border-blue-500/30',
  Shoujo:'bg-pink-400/15 text-pink-300 border-pink-400/30',
  Seinen:'bg-zinc-600/15 text-zinc-300 border-zinc-600/30',
  Josei:'bg-rose-400/15 text-rose-300 border-rose-400/30',
}

export default async function ProfilePage({ params }: Props) {
  const { username } = await params
  const supabase = await createClient()
  const { data: { user: viewer } } = await supabase.auth.getUser()
  const { data: profileData } = await supabase.from('profiles').select('*').eq('username', username.toLowerCase()).single()
  if (!profileData) notFound()
  if ((profileData as any).user_type === 'creator') { const { redirect } = await import('next/navigation'); redirect(`/creator/${username}`) }

  const profile = {...(profileData as any), is_pro: (profileData as any).is_pro?? false, pro_expires_at: (profileData as any).pro_expires_at?? null, verified_recommender: (profileData as any).verified_recommender?? false, pinned_recommendation_id: (profileData as any).pinned_recommendation_id?? null, favorite_genres: (profileData as any).favorite_genres?? [] }
  const isGhost = profile.id === GHOST_ID
  let viewerGenres: string[] = []
  if (viewer && viewer.id!== profile.id &&!isGhost) { const { data: vp } = await supabase.from('profiles').select('favorite_genres').eq('id', viewer.id).single(); viewerGenres = (vp as any)?.favorite_genres?? [] }
  const isOwner = viewer?.id === profile.id &&!isGhost
  const isPro =!!(profile.is_pro && (!profile.pro_expires_at || new Date(profile.pro_expires_at) > new Date()))
  const isAdmin = profile.role === 'admin'
  const showGold = isPro &&!isAdmin
  if (viewer?.id && viewer.id!== profile.id &&!isGhost) { try { await (supabase as any).rpc('track_profile_view', { p_profile_id: profile.id, p_viewer_id: viewer.id }) } catch {} }

  let pinnedRec: Recommendation | null = null
  if (profile.pinned_recommendation_id) { const { data: pinned } = await (supabase as any).from('recommendations').select('*').eq('id', profile.pinned_recommendation_id).eq('is_approved', true).maybeSingle(); pinnedRec = (pinned as Recommendation)?? null }

  let recQuery = supabase.from('recommendations').select('*').eq('user_id', profile.id).eq('is_approved', true).not('content_rating', 'in', '("adult","mature")').order('created_at', { ascending: false }).limit(18)
  if (profile.pinned_recommendation_id) recQuery = recQuery.neq('id', profile.pinned_recommendation_id)
  const totalRecsQuery = (supabase as any).from('recommendations').select('*', { count: 'exact', head: true }).eq('user_id', profile.id).eq('is_approved', true).not('content_rating', 'in', '("adult","mature")')

  const [{ data: recData }, { count: totalRecsCount }, { data: listsData }, { count: followersCount }, { count: followingCount }, { data: isFollowingData }] = await Promise.all([ recQuery, totalRecsQuery, isGhost? Promise.resolve({ data: [] }) : supabase.from('reading_lists').select('id, name, description, is_public').eq('user_id', profile.id).eq('is_public', true).order('created_at', { ascending: false }).limit(6), supabase.from('follows').select('*', { count: 'exact', head: true }).eq('following_id', profile.id), supabase.from('follows').select('*', { count: 'exact', head: true }).eq('follower_id', profile.id), viewer &&!isOwner &&!isGhost? supabase.from('follows').select('id').eq('follower_id', viewer.id).eq('following_id', profile.id).maybeSingle() : Promise.resolve({ data: null }) ])

  let completedSeriesCount = 0
  if (!isGhost) { const { data: userListIds } = await (supabase as any).from('reading_lists').select('id').eq('user_id', profile.id); if (userListIds?.length) { const { count } = await supabase.from('reading_list_items').select('*', { count: 'exact', head: true }).eq('status', 'completed').in('list_id', userListIds.map((l:any)=>l.id)); completedSeriesCount = count?? 0 } }

  const recommendations = (recData?? []) as Recommendation[]
  const isFollowing =!!isFollowingData
  const totalRecs = totalRecsCount?? 0
  const gridRecs = recommendations.slice(0, 6)
  const hasMore = totalRecs > 6
  const lists = isGhost? [] : await Promise.all((listsData?? []).map(async (list: any) => { const { count } = await supabase.from('reading_list_items').select('*', { count: 'exact', head: true }).eq('list_id', list.id); return {...list, item_count: count?? 0 } }))
  const initials = (profile.display_name || profile.username).slice(0, 2).toUpperCase()
  const favoriteGenres = Array.isArray(profile.favorite_genres)? profile.favorite_genres : []
  const topGenre = favoriteGenres[0]
  const heroCover = pinnedRec?.cover_url || recommendations[0]?.cover_url

  return (
  <div className="min-h-screen bg-[#0a0a0b]">
    {/* Add spacer for fixed header */}
    <div className="h-[48px] md:h-[48px]" />
    {/* HERO - Gen Z full bleed with cover */}
    <div className="relative">
      <div className="h-[24vh] md:h-[32vh] w-full overflow-hidden">
          {heroCover? (
            <>
              <img src={heroCover} alt="" className="absolute inset-0 w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-b from-black/20 via-[#0a0a0b]/60 to-[#0a0a0b]" />
              <div className="absolute inset-0 backdrop-blur-3xl bg-[#0a0a0b]/70" />
            </>
          ) : (
            <div className={`absolute inset-0 ${isGhost? 'bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-900/80 via-slate-900 to-black' : showGold? 'bg-gradient-to-b from-amber-600/30 via-orange-700/20 to-[#0a0a0b]' : 'bg-gradient-to-b from-violet-600/30 via-fuchsia-600/20 to-[#0a0a0b]'}`} />
          )}
          <div className="absolute inset-0 opacity-[0.03]" style={{backgroundImage:'radial-gradient(white 1px, transparent 1px)', backgroundSize:'24px 24px'}} />
        </div>

        <div className="max-w-5xl mx-auto px-4 relative">
          {/* Avatar with genre ring */}
          <div className="relative -mt-14 md:-mt-16 flex items-end justify-between">
            <div className="relative">
              <div className={`absolute -inset-1.5 rounded-full blur-xl opacity-60 ${topGenre? GENRE_COLORS[topGenre]?.split(' ')[0].replace('/15','/40') : 'bg-violet-600/40'}`} />
              <div className="relative rounded-full p-1 bg-[#0a0a0b] ring-2 ring-white/10">
                <ProAvatar
                  src={profile.avatar_url?? undefined}
                  fallback={initials}
                  size="xl"
                  isPro={isPro}
                  isAdmin={isAdmin}
                  className="w-28 h-28 md:w-36 md:h-36 border-0"
                />
              </div>
              {topGenre && (
                <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full text- font-black bg-[#0a0a0b] border border-white/20">
                  {topGenre}
                </div>
              )}
            </div>

            <div className="flex gap-2 pb-4">
              {!isOwner &&!isGhost && viewer && <FollowButton profileId={profile.id} initialFollowing={isFollowing} isLoggedIn={!!viewer} />}
              {isOwner && <Link href="/reader/dashboard/settings"><Button size="sm" className="rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-md border-white/20">Edit profile</Button></Link>}
            </div>
          </div>

          {/* Name + bio - Gen Z style */}
          <div className="mt-5">
            <div className="flex flex-wrap items-center gap-2.5">
              <h1 className="text- md:text- font-black tracking-tight leading-none">{profile.display_name || profile.username}</h1>
              <ProBadge role={profile.role} isPro={isPro} />
              {profile.verified_recommender && <VerifiedBadge />}
              {isGhost && <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">Archivist</span>}
            </div>
            <div className="flex flex-wrap items-center gap-2.5 mt-2.5 text- text-white/50">
              <span>@{profile.username}</span>
              <span className="w-1 h-1 rounded-full bg-white/20" />
              <span className="flex items-center gap-1"><CalendarDays size={12}/> Joined {formatDate(profile.member_since)}</span>
              {profile.website && <><span className="w-1 h-1 rounded-full bg-white/20" /><a href={profile.website} target="_blank" className="flex items-center gap-1 hover:text-white transition-colors"><Globe size={12}/>{profile.website.replace(/^https?:\/\//,'')}</a></>}
            </div>
            {profile.bio && <p className="mt-3 text- leading-snug max-w-2xl text-white/80">{profile.bio}</p>}
          </div>
        </div>
      </div>

      <div className="max-w-5xl mx-auto px-4 mt-8 space-y-10 pb-20">
        {/* GENRE CHIPS - horizontal scroll */}
        {favoriteGenres.length > 0 && (
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-4 px-4 snap-x">
            {favoriteGenres.map((g:string)=>(
              <Link key={g} href={`/browse?genre=${encodeURIComponent(g)}`} className={`snap-start shrink-0 px-3.5 py-2 rounded-full text-xs font-semibold border backdrop-blur-md transition-all hover:scale-105 active:scale-95 ${GENRE_COLORS[g]?? 'bg-white/5 text-white/70 border-white/10 hover:bg-white/10'}`}>{g}</Link>
            ))}
          </div>
        )}

        {/* BENTO STATS - Gen Z glass */}
        {!isGhost && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              {label:'followers', value:followersCount?? 0, icon:Users, color:'text-violet-400', bg:'from-violet-500/20'},
              {label:'recs', value:totalRecs, icon:BookOpen, color:'text-cyan-400', bg:'from-cyan-500/20'},
              {label:'upvotes', value:profile.total_votes_received?? 0, icon:ThumbsUp, color:'text-emerald-400', bg:'from-emerald-500/20'},
              {label:'reviews', value:profile.total_reviews?? 0, icon:Star, color:'text-amber-400', bg:'from-amber-500/20'},
            ].map((s)=>(
              <div key={s.label} className="group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.03] backdrop-blur-2xl p-5 hover:bg-white/[0.06] hover:border-white/15 transition-all">
                <div className={`absolute -top-10 -right-10 w-28 h-28 rounded-full bg-gradient-to-br ${s.bg} to-transparent blur-2xl`} />
                <s.icon size={20} className={`${s.color} mb-3`} />
                <p className="text- font-black tracking-tight leading-none">{s.value.toLocaleString()}</p>
                <p className="text-xs text-white/50 capitalize mt-1">{s.label}</p>
              </div>
            ))}
          </div>
        )}

        {/* TASTE COMPATIBILITY */}
        {!isGhost &&!isOwner && viewer && viewerGenres.length > 0 && favoriteGenres.length > 0 && (
          <TasteCompatibility viewerGenres={viewerGenres} profileGenres={favoriteGenres} profileName={profile.display_name || profile.username} />
        )}

        {/* MANGA DNA + BADGES */}
        <div className="grid lg:grid-cols-5 gap-4">
          <div className="lg:col-span-3 space-y-4">
            <TasteTags genres={favoriteGenres} />
            <ProfileBadges approvedRecs={totalRecs} totalReviews={profile.total_reviews?? 0} totalVotes={profile.total_votes_received?? 0} completedSeries={completedSeriesCount?? 0} verifiedRecommender={profile.verified_recommender?? false} isPro={isPro || isAdmin} isGhost={isGhost} />
          </div>
          <div className="lg:col-span-2">
            {!isGhost && favoriteGenres.length > 0 && <MangaDNACard username={profile.username} displayName={profile.display_name || profile.username} avatarUrl={profile.avatar_url?? undefined} genres={favoriteGenres} isPro={isPro || isAdmin} isOwner={isOwner} />}
          </div>
        </div>

        {/* PINNED - hero */}
        {pinnedRec && (
          <div className="relative overflow-hidden rounded- border border-amber-500/20 bg-gradient-to-br from-amber-500/10 via-orange-500/5 to-transparent p-">
            <div className="rounded- bg-[#0f0f10]/90 backdrop-blur-2xl p-5 md:p-6 flex gap-5">
              <div className="w-24 h-36 md:w-32 md:h-48 rounded-2xl overflow-hidden shrink-0 ring-1 ring-white/10 shadow-2xl">
                <img src={pinnedRec.cover_url || ''} alt={pinnedRec.title} className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0 flex-col">
                <div className="flex items-center gap-1.5 mb-2"><Pin size={14} className="text-amber-400" /><span className="text- font-black uppercase tracking-widest text-amber-400">Pinned rec</span></div>
                <Link href={`/comic/${pinnedRec.id}`} className="text-xl md:text-2xl font-black leading-tight hover:text-white transition-colors line-clamp-2">{pinnedRec.title}</Link>
                <p className="text-sm text-white/60 line-clamp-2 mt-2">{pinnedRec.description}</p>
                <Link href={`/comic/${pinnedRec.id}`} className="inline-flex items-center gap-1.5 mt-auto pt-3 text-sm font-semibold text-amber-400 hover:gap-2 transition-all">Open comic <ArrowRight size={14}/></Link>
              </div>
            </div>
          </div>
        )}

        {/* PROFILE SHELF */}
        <ProfileShelf recommendations={recommendations} totalRecs={totalRecs} isPro={isPro || isAdmin} isGhost={isGhost} username={profile.username} showGold={showGold} />

        {/* RECENT DROPS - bigger */}
        {gridRecs.length > 0 && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text- font-black tracking-tight">Recent drops</h2>
              {hasMore && <Link href={`/profile/${profile.username}/recommendations`} className="text-sm font-semibold text-white/60 hover:text-white">View all →</Link>}
            </div>
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-6 gap-3 md:gap-4">
              {gridRecs.map((rec) => <div key={rec.id} className="group"><ComicCard recommendation={rec} /></div>)}
            </div>
          </div>
        )}

        {/* LISTS */}
        {!isGhost && lists.length > 0 && (
          <div>
            <h2 className="text- font-black tracking-tight mb-4">Curated lists</h2>
            <div className="grid sm:grid-cols-2 gap-3">
              {lists.map((list:any)=>(
                <Link key={list.id} href={`/lists/${list.id}`} className="group p-4 rounded-3xl border border-white/[0.08] bg-white/[0.02] hover:bg-white/[0.05] backdrop-blur-xl transition-all">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3"><div className="w-11 h-11 rounded-2xl bg-white/5 flex items-center justify-center group-hover:bg-white/10 transition-colors"><BookMarked size={18} className="text-white/70"/></div><div><p className="font-bold">{list.name}</p><p className="text-xs text-white/50">{list.item_count} comics</p></div></div><ArrowRight size={16} className="text-white/30 group-hover:text-white/60 group-hover:translate-x-0.5 transition-all"/>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* EMPTY STATE */}
        {totalRecs === 0 &&!isGhost && (
          <div className="text-center py-16 rounded-3xl border border-dashed border-white/10 bg-white/[0.02]">
            <BookOpen size={32} className="mx-auto text-white/20 mb-3" />
            <p className="font-bold">No recs yet</p>
            <p className="text-sm text-white/50 mt-1">{isOwner? "Share your first comic" : `@${username} hasn't recommended anything`}</p>
            {isOwner && <Link href="/recommend/new" className="inline-block mt-4"><Button size="sm" className="rounded-full">Recommend now</Button></Link>}
          </div>
        )}
      </div>
    </div>
  )
}