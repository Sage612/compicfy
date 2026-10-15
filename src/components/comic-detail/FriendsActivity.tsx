// src/components/comic-detail/FriendsActivity.tsx
//
// "Friends on this comic": what the people you follow have logged here.
// Server component. A friend's note is blurred when it is flagged as a spoiler
// or when they are further along than you are (Buddy Binge, simple version).

import Link from 'next/link'
import { timeAgo } from '@/lib/utils/format'
import { TRACKING_STATUS_META, resolveSubStatusLabel, type TrackingStatusValue } from '@/lib/utils/constants'
import type { FriendEvent } from '@/lib/tracking/types'
import { FriendNote } from './FriendNote'

interface Props {
  events:        FriendEvent[]
  followsAnyone: boolean
  /** The viewer's own chapter, used to decide what is a spoiler. */
  myChapter:     number | null
}

function describe(e: FriendEvent): string {
  if (e.eventType === 'progress' && e.chapter !== null) {
    return e.subStatus === 'spite' ? `spite-read up to Ch. ${e.chapter}` : `reached Ch. ${e.chapter}`
  }
  if (e.eventType === 'status' && e.status) {
    const meta = TRACKING_STATUS_META[e.status as TrackingStatusValue]
    const sub  = resolveSubStatusLabel(e.status, e.subStatus)
    if (e.status === 'dropped') return `dropped it${sub ? ` (${sub.toLowerCase()})` : ''}`
    if (e.status === 'completed') return 'finished it'
    if (e.status === 'reading') return e.subStatus === 'spite' ? 'started a spite read' : 'started reading'
    if (e.status === 'plan_to_read') return 'added it to plan to read'
    return `marked it ${meta ? meta.label.toLowerCase() : e.status}`
  }
  if (e.chapter !== null) return `left a note at Ch. ${e.chapter}`
  return 'left a note'
}

export function FriendsActivity({ events, followsAnyone, myChapter }: Props) {
  return (
    <section id="friends" className="scroll-mt-20 space-y-3">
      <h2 className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-[0.2em] text-dossier-foreground/40">
        Friends on this comic
      </h2>

      {events.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-dossier-foreground/15 bg-dossier-panel/20 p-4 text-sm text-dossier-foreground/55">
          {followsAnyone
            ? 'Nobody you follow has logged this one yet.'
            : 'Follow readers to see how they get through the comics you read.'}
        </p>
      ) : (
        <ul className="rounded-2xl border border-dossier-foreground/10 bg-dossier-panel/30 divide-y divide-dossier-foreground/10">
          {events.map(e => {
            const ahead = (e.chapter ?? 0) > (myChapter ?? 0)
            return (
              <li key={e.id} className="flex gap-3 p-3.5">
                {e.avatarUrl ? (
                  <img src={e.avatarUrl} alt="" className="h-9 w-9 rounded-full border border-dossier-foreground/10 object-cover shrink-0" />
                ) : (
                  <div className="h-9 w-9 rounded-full border border-dossier-foreground/10 bg-dossier flex items-center justify-center text-xs font-bold text-dossier-foreground/40 shrink-0">
                    {e.displayName.slice(0, 1).toUpperCase()}
                  </div>
                )}
                <div className="min-w-0 flex-1 text-sm">
                  <p className="text-dossier-foreground/80">
                    <Link href={`/profile/${e.username}`} className="font-semibold text-dossier-foreground hover:underline">
                      {e.displayName}
                    </Link>{' '}
                    {describe(e)}
                    {e.mood ? <span className="ml-1.5">{e.mood}</span> : null}
                  </p>
                  {e.note && (
                    <p className="mt-1 text-[13px] leading-snug">
                      <FriendNote note={e.note} hidden={e.isSpoiler || ahead} />
                    </p>
                  )}
                  <p className="mt-1 font-[family-name:var(--font-mono)] text-[10px] text-dossier-foreground/35">
                    {timeAgo(e.createdAt)}
                  </p>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}