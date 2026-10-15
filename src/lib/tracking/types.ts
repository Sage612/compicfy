// src/lib/tracking/types.ts

/** What a caller can ask the tracking write path to do. Every field is optional
 *  except the comic, so one call can be as small as { recommendationId, delta: 1 }. */
export interface TrackInput {
  recommendationId: string
  /** Which reading list. Omit and the app picks (existing entry, else the list
   *  you used last, else it creates "My Library"). */
  listId?: string | null
  /** Set the chapter to this number. null clears it. */
  chapter?: number | null
  /** Move the chapter by this much (+1 is the one-tap log). Ignored if `chapter` is set. */
  delta?: number
  status?: string
  /** Status to give the comic only if it is not tracked yet (the "add to my
   *  tracker" case). Ignored when the comic already has an entry. */
  statusIfNew?: string
  /** Preset key or short custom text. null clears. */
  subStatus?: string | null
  /** Private "why I stopped" text, stored on the list item. */
  privateNote?: string | null
  mood?: string | null
  /** The one-liner. Also lands on the profile memory wall unless private. */
  note?: string | null
  isSpoiler?: boolean
  visibility?: 'public' | 'private'
}

export type TrackActionResult =
  | {
      ok:             true
      listId:         string
      createdList:    boolean
      eventId:        string | null
      journalEntryId: string | null
      chapter:        number | null
      status:         string | null
      subStatus:      string | null
      lastReadAt:     string | null
      /** false when the call changed nothing (e.g. tapping the current status) */
      changed:        boolean
    }
  | { ok: false; error: string }

export type UndoActionResult =
  | { ok: true; chapter: number | null; status: string | null; subStatus: string | null; removedItem: boolean }
  | { ok: false; error: string }

export type MomentActionResult =
  | { ok: true; eventId: string | null; journalEntryId: string | null }
  | { ok: false; error: string }

/** The viewer's own tracking state for one comic. */
export interface MyTracking {
  listId:     string | null
  status:     string | null
  subStatus:  string | null
  chapter:    number | null
  lastReadAt: string | null
}

/** A mood dot on the progress ribbon. */
export interface MomentPoint {
  id:        string
  chapter:   number | null
  mood:      string
  createdAt: string
}

export interface RatingBreakdown {
  /** index 0 = 1 star ... index 4 = 5 stars */
  counts:  number[]
  total:   number
  average: number | null
}

export interface FriendEvent {
  id:          string
  userId:      string
  username:    string
  displayName: string
  avatarUrl:   string | null
  eventType:   'progress' | 'status' | 'moment'
  chapter:     number | null
  status:      string | null
  subStatus:   string | null
  mood:        string | null
  note:        string | null
  isSpoiler:   boolean
  createdAt:   string
}