'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import { Loader2, MessageSquare } from 'lucide-react'

interface Props {
  recommendationId?: string
  type?: 'recommendation' | 'ban'
}

export function AppealButton({ recommendationId, type = 'recommendation' }: Props) {
  const [open, setOpen] = useState(false)
  const [text, setText] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const handleSubmit = async () => {
    if (!text.trim()) return
    setSubmitting(true)
    try {
      const res = await fetch('/api/appeals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type,
          target_id: recommendationId,
          appeal_text: text,
        }),
      })
      if (!res.ok) throw new Error()
      toast.success('Appeal submitted! We\'ll review it soon.')
      setOpen(false)
      setText('')
    } catch {
      toast.error('Failed to submit appeal')
    } finally {
      setSubmitting(false)
    }
  }

  if (!open) {
    return (
      <Button
        variant="outline"
        size="sm"
        onClick={() => setOpen(true)}
        className="h-7 text-xs gap-1.5"
      >
        <MessageSquare size={11} />
        Appeal Decision
      </Button>
    )
  }

  return (
    <div className="space-y-2 p-3 rounded-lg border border-border bg-card/50">
      <p className="text-xs font-medium">Write your appeal</p>
      <Textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="Explain why you think this decision should be reconsidered..."
        rows={3}
        className="resize-none text-xs"
      />
      <div className="flex gap-2">
        <Button
          size="sm"
          onClick={handleSubmit}
          disabled={!text.trim() || submitting}
          className="h-7 text-xs gap-1.5"
        >
          {submitting ? <Loader2 size={11} className="animate-spin" /> : null}
          Submit Appeal
        </Button>
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setOpen(false)}
          className="h-7 text-xs"
        >
          Cancel
        </Button>
      </div>
    </div>
  )
}