'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Palette, Check, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'

const THEMES = [
  {
    id: 'default',
    name: 'Default',
    description: 'Classic Compicfy purple',
    preview: 'from-primary to-violet-500',
    border: 'border-primary/30',
    free: true,
  },
  {
    id: 'gold',
    name: 'Gold',
    description: 'Exclusive Pro golden theme',
    preview: 'from-amber-400 to-orange-500',
    border: 'border-amber-500/30',
    free: false,
    exclusive: true,
  },
  {
    id: 'rose',
    name: 'Rose',
    description: 'Warm rose pink',
    preview: 'from-rose-500 to-pink-600',
    border: 'border-rose-500/30',
    free: false,
  },
  {
    id: 'teal',
    name: 'Teal',
    description: 'Cool ocean teal',
    preview: 'from-teal-500 to-cyan-600',
    border: 'border-teal-500/30',
    free: false,
  },
  {
    id: 'violet',
    name: 'Violet',
    description: 'Deep cosmic violet',
    preview: 'from-violet-600 to-purple-700',
    border: 'border-violet-500/30',
    free: false,
  },
  {
    id: 'amber',
    name: 'Amber',
    description: 'Warm amber glow',
    preview: 'from-amber-500 to-yellow-500',
    border: 'border-amber-500/30',
    free: false,
  },
  {
    id: 'midnight',
    name: 'Midnight',
    description: 'Dark midnight blue',
    preview: 'from-slate-700 to-blue-900',
    border: 'border-slate-500/30',
    free: false,
  },
]

interface Props {
  currentTheme: string
  userId: string
}

export function ThemesClient({ currentTheme, userId }: Props) {
  const [selected, setSelected] = useState(currentTheme)
  const [saving, setSaving] = useState(false)

  const handleSave = async () => {
    setSaving(true)
    try {
      const res = await fetch('/api/pro/themes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      toast.success('Theme updated!')
    } catch {
      toast.error('Failed to update theme')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-2xl mx-auto px-4 py-8 space-y-6">

      {/* Header */}
      <div className="space-y-1">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-lg shadow-violet-500/20">
            <Palette size={16} className="text-white" />
          </div>
          <h1 className="text-2xl font-black tracking-tight">Profile Themes</h1>
        </div>
        <p className="text-muted-foreground text-sm pl-0.5">
          Customise how your profile looks to others
        </p>
      </div>

      {/* Theme grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {THEMES.map((theme) => (
          <button
            key={theme.id}
            onClick={() => setSelected(theme.id)}
            className={cn(
              'relative p-4 rounded-2xl border-2 text-left transition-all duration-150 space-y-3',
              selected === theme.id
                ? `${theme.border} bg-card shadow-md`
                : 'border-border bg-card hover:border-primary/30'
            )}
          >
            {/* Preview gradient */}
            <div className={cn('h-12 rounded-xl bg-gradient-to-br', theme.preview)} />

            <div>
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-black">{theme.name}</p>
                {theme.exclusive && (
                  <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-amber-500/10 text-amber-600 border border-amber-500/20 font-bold">
                    Exclusive
                  </span>
                )}
              </div>
              <p className="text-[10px] text-muted-foreground mt-0.5">{theme.description}</p>
            </div>

            {selected === theme.id && (
              <div className="absolute top-2 right-2 w-5 h-5 rounded-full bg-primary flex items-center justify-center">
                <Check size={11} className="text-white" strokeWidth={3} />
              </div>
            )}
          </button>
        ))}
      </div>

      <Button
        onClick={handleSave}
        disabled={saving || selected === currentTheme}
        className="w-full gap-2 bg-gradient-to-r from-amber-400 to-orange-500 hover:opacity-90 border-0 text-white shadow-md shadow-amber-500/20"
      >
        {saving ? <Loader2 size={14} className="animate-spin" /> : <Palette size={14} />}
        {saving ? 'Saving...' : 'Save Theme'}
      </Button>
    </div>
  )
}