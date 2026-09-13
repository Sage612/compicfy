'use client'

import React, { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { toast } from 'sonner'

interface Recommendation {
  id: string
  title: string
  content: string
  status: string
  appeal_status?: string | null
  created_at: string
}

interface RecsClientProps {
  userId: string
  initialRecs: Recommendation[]
}

export default function RecsClient({ userId, initialRecs }: RecsClientProps) {
  const [recs, setRecs] = useState<Recommendation[]>(initialRecs)
  const [searchQuery, setSearchQuery] = useState('')
  const [pinnedId, setPinnedId] = useState<string | null>(null)
  const [submittingId, setSubmittingId] = useState<string | null>(null)

  // Fetch pinned recommendation on mount or when userId changes
  useEffect(() => {
    if (!userId) return

    const fetchPinned = async () => {
      const supabase = createClient()
      const { data } = (await supabase
        .from('profiles')
        .select('pinned_recommendation_id')
        .eq('id', userId)
        .single()) as { data: { pinned_recommendation_id: string | null } | null }

      setPinnedId(data?.pinned_recommendation_id ?? null)
    }

    fetchPinned()
  }, [userId])

  const handleTogglePin = async (recId: string) => {
    const nextPinnedId = pinnedId === recId ? null : recId
    setPinnedId(nextPinnedId)

    const supabase = createClient()
    const { error } = await supabase
      .from('profiles')
      .update({ pinned_recommendation_id: nextPinnedId })
      .eq('id', userId)

    if (error) {
      toast.error('Failed to update pinned recommendation')
      setPinnedId(pinnedId) // Revert state on failure
    } else {
      toast.success(nextPinnedId ? 'Recommendation pinned' : 'Recommendation unpinned')
    }
  }

  const handleSubmitDraft = async (recId: string) => {
    setSubmittingId(recId)
    try {
      const res = await fetch(`/api/recommendations/${recId}/submit`, {
        method: 'POST',
      })
      const json = await res.json()

      if (!res.ok) {
        throw new Error(json?.error || 'Failed to submit recommendation')
      }

      setRecs((prev) =>
        prev.map((rec) =>
          rec.id === recId ? { ...rec, status: 'published' } : rec
        )
      )
      toast.success('Draft published successfully!')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to submit draft')
    } finally {
      setSubmittingId(null)
    }
  }

  const filteredRecs = recs.filter(
    (rec) =>
      rec.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      rec.content.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <input
          type="text"
          placeholder="Search your recommendations…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="w-full max-w-md rounded-md border border-gray-300 px-4 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        />
        {searchQuery && (
          <button
            onClick={() => setSearchQuery('')}
            className="text-sm text-gray-500 hover:text-gray-700"
          >
            ✕ Clear
          </button>
        )}
      </div>

      <div className="grid gap-4">
        {filteredRecs.length === 0 ? (
          <p className="text-sm text-gray-500">No recommendations found.</p>
        ) : (
          filteredRecs.map((rec) => {
            const isPinned = pinnedId === rec.id
            const isSubmitting = submittingId === rec.id

            return (
              <div
                key={rec.id}
                className={`relative rounded-lg border p-4 shadow-sm transition-all ${
                  isPinned ? 'border-blue-500 bg-blue-50/20' : 'border-gray-200 bg-white'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-semibold text-gray-900">{rec.title}</h3>
                    <p className="mt-1 text-sm text-gray-600">{rec.content}</p>
                  </div>

                  <button
                    onClick={() => handleTogglePin(rec.id)}
                    className={`text-sm font-medium ${
                      isPinned ? 'text-blue-600' : 'text-gray-400 hover:text-gray-600'
                    }`}
                  >
                    {isPinned ? 'Pinned ★' : 'Pin ☆'}
                  </button>
                </div>

                <div className="mt-4 flex items-center justify-between text-xs text-gray-500">
                  <span>Status: {rec.status}</span>

                  {rec.appeal_status === 'pending' && (
                    <span className="text-amber-600 font-medium">
                      🚩 Appeal pending review
                    </span>
                  )}
                  {rec.appeal_status === 'approved' && (
                    <span className="text-green-600 font-medium">
                      ✅ Appeal approved
                    </span>
                  )}

                  {rec.status === 'draft' && (
                    <button
                      disabled={isSubmitting}
                      onClick={() => handleSubmitDraft(rec.id)}
                      className="rounded bg-blue-600 px-3 py-1 text-xs font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      {isSubmitting ? 'Submitting…' : 'Publish Draft'}
                    </button>
                  )}
                </div>
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}