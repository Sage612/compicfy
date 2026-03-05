import { createClient } from '@/lib/supabase/server'
import { ComicCard } from '@/components/recommendations/ComicCard'
import { ShieldAlert, BookOpen } from 'lucide-react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import type { Recommendation } from '@/types/database.types'
import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'Adult Comics' }

export default async function AdultBrowsePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // Not logged in
  if (!user) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Age Restricted</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          You must be logged in with adult content enabled to access this section.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
          <Link href="/login"><Button>Log In</Button></Link>
        </div>
      </div>
    )
  }

  // Logged in — check profile flag
  const { data: profile } = await supabase
    .from('profiles')
    .select('adult_content_enabled')
    .eq('id', user.id)
    .single()

  if (!(profile as any)?.adult_content_enabled) {
    return (
      <div className="max-w-md mx-auto px-4 py-24 text-center space-y-5">
        <div className="w-16 h-16 rounded-2xl bg-destructive/10 flex items-center justify-center mx-auto">
          <ShieldAlert size={32} className="text-destructive" />
        </div>
        <h1 className="text-2xl font-bold">Adult Content Disabled</h1>
        <p className="text-muted-foreground text-sm leading-relaxed">
          Enable adult content in your profile settings to access this section.
        </p>
        <div className="flex justify-center gap-3">
          <Link href="/browse"><Button variant="outline">Back to Browse</Button></Link>
          <Link href="/dashboard/settings"><Button>Go to Settings</Button></Link>
        </div>
      </div>
    )
  }

  // Fetch adult comics
  const { data } = await supabase
    .from('recommendations')
    .select('*')
    .eq('is_approved', true)
    .eq('content_rating', 'adult')
    .order('score', { ascending: false })

  const comics = (data as Recommendation[]) ?? []

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold flex items-center gap-2">
            🔞 Adult Comics
          </h1>
          <p className="text-muted-foreground text-sm mt-0.5">
            18+ content — visible only to opted-in users
          </p>
        </div>
        <Link href="/browse">
          <Button variant="outline" size="sm">← Back to Browse</Button>
        </Link>
      </div>

      <div className="p-3 rounded-lg bg-destructive/5 border border-destructive/20">
        <p className="text-xs text-muted-foreground">
          🔞 This section contains adult-rated content. All titles have been manually approved by admins.
          To disable adult content, go to{' '}
          <Link href="/dashboard/settings" className="underline hover:text-foreground">Settings</Link>.
        </p>
      </div>

      {comics.length === 0 ? (
        <div className="text-center py-20">
          <BookOpen size={48} className="mx-auto mb-4 text-muted-foreground opacity-30" />
          <h3 className="text-lg font-semibold mb-1">No adult comics yet</h3>
          <p className="text-muted-foreground text-sm">Be the first to submit one.</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
          {comics.map((rec) => (
            <ComicCard key={rec.id} recommendation={rec} />
          ))}
        </div>
      )}
    </div>
  )
}