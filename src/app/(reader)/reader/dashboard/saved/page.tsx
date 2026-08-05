import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { Bookmark, Radar } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { UpgradeBanner } from '@/components/pro/UpgradeBanner'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'
import { hasUnlimitedPerks } from '@/lib/access'
import { FREE_LIMITS } from '@/lib/utils/constants'

export const metadata: Metadata = { title: 'Saved Comics' }

export default async function ReaderSavedPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  // Check pro status
  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_pro, pro_expires_at, is_patron, patron_expires_at')
    .eq('id', user.id)
    .single() as { data: any }

  const isPro = profile ? hasUnlimitedPerks(profile) : false

  const { data: saves } = await supabase
    .from('saves')
    .select('recommendation_id, created_at, recommendations(*)')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  const comics = (saves ?? [])
    .map((s: any) => Array.isArray(s.recommendations) ? s.recommendations[0] : s.recommendations)
    .filter(Boolean) as Recommendation[]

  const saveCount      = comics.length
  const showBanner     = !isPro && saveCount >= Math.floor(FREE_LIMITS.saves * 0.8) // show at 80%
  const atLimit        = !isPro && saveCount >= FREE_LIMITS.saves
  const savePercentage = Math.min(100, Math.round((saveCount / FREE_LIMITS.saves) * 100))

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">
      <div className="flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl font-black tracking-tight truncate">Saved Comics</h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {isPro
              ? `${saveCount} saved`
              : `${saveCount} / ${FREE_LIMITS.saves} saved`
            }
          </p>
        </div>
        <Link href="/browse" className="shrink-0">
          <Button size="sm" className="gap-1.5">
            <Radar size={13} />Browse
          </Button>
        </Link>
      </div>

      {/* Save limit banner — show at 80% capacity */}
      {showBanner && (
        <UpgradeBanner
          current={saveCount}
          limit={FREE_LIMITS.saves}
          feature="saved comics"
          message={
            atLimit
              ? `You've reached your save limit`
              : `You're approaching your save limit`
          }
          dismissible
        />
      )}

      {!comics.length ? (
        <div className="flex flex-col items-center justify-center py-20 rounded-2xl border border-dashed border-border space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center">
            <Bookmark size={24} className="text-primary" />
          </div>
          <div className="text-center">
            <p className="font-black text-sm">Nothing saved yet</p>
            <p className="text-xs text-muted-foreground mt-1">Save comics you want to read later.</p>
          </div>
          <Link href="/browse"><Button size="sm" className="gap-1.5"><Radar size={13} />Browse Comics</Button></Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {comics.map(rec => <ComicCard key={rec.id} recommendation={rec} />)}
        </div>
      )}
    </div>
  )
}