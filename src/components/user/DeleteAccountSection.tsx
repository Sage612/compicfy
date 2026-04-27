'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { Trash2, AlertTriangle, Loader2, Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export function DeleteAccountSection() {
  const router = useRouter()

  const [open,          setOpen]          = useState(false)
  const [confirmed,     setConfirmed]     = useState(false)
  const [password,      setPassword]      = useState('')
  const [showPassword,  setShowPassword]  = useState(false)
  const [loading,       setLoading]       = useState(false)
  const [typedConfirm,  setTypedConfirm]  = useState('')

  // User must type "delete my account" exactly to enable the button
  const CONFIRM_PHRASE   = 'delete my account'
  const phraseMatches    = typedConfirm.toLowerCase() === CONFIRM_PHRASE
  const canSubmit        = phraseMatches && password.length >= 6 && !loading

  const handleDelete = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const res  = await fetch('/api/account', {
        method:  'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ password }),
      })
      const data = await res.json()

      if (!res.ok) {
        toast.error(data.error ?? 'Failed to delete account')
        return
      }

      toast.success('Account deleted. Goodbye ')
      router.push('/')
      router.refresh()
    } catch {
      toast.error('Something went wrong — try again')
    } finally {
      setLoading(false)
    }
  }

  if (!open) {
    return (
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-destructive">Delete Account</p>
          <p className="text-xs text-muted-foreground mt-0.5">
            Permanently removes your account and all data. Cannot be undone.
          </p>
        </div>
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => setOpen(true)}
          className="gap-1.5 border-destructive/30 text-destructive hover:bg-destructive/5 hover:border-destructive/60 shrink-0"
        >
          <Trash2 size={13} />
          Delete Account
        </Button>
      </div>
    )
  }

  return (
    <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-4">

      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-xl bg-destructive/15 flex items-center justify-center shrink-0">
          <AlertTriangle size={16} className="text-destructive" />
        </div>
        <div>
          <p className="text-sm font-black text-destructive">This cannot be undone</p>
          <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
            Your profile, votes, saves, reading lists, and all activity will be permanently deleted.
          </p>
        </div>
      </div>

      {/* Step 1: typed confirmation */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">
          Type <span className="font-black text-foreground">delete my account</span> to confirm
        </Label>
        <Input
          value={typedConfirm}
          onChange={e => setTypedConfirm(e.target.value)}
          placeholder="delete my account"
          className={cn(
            'h-10 text-sm transition-colors',
            typedConfirm.length > 0 && !phraseMatches && 'border-destructive/50 focus:border-destructive',
            phraseMatches && 'border-emerald-500/50 focus:border-emerald-500'
          )}
          autoComplete="off"
          spellCheck={false}
        />
      </div>

      {/* Step 2: password */}
      <div className="space-y-1.5">
        <Label className="text-xs font-semibold text-muted-foreground">Confirm your password</Label>
        <div className="relative">
          <Input
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={e => setPassword(e.target.value)}
            placeholder="Your current password"
            className="h-10 pr-10 text-sm"
            autoComplete="current-password"
          />
          <button
            type="button"
            onClick={() => setShowPassword(v => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
          >
            {showPassword ? <EyeOff size={14} /> : <Eye size={14} />}
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-2 pt-1">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => { setOpen(false); setTypedConfirm(''); setPassword('') }}
          disabled={loading}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          size="sm"
          onClick={handleDelete}
          disabled={!canSubmit}
          className="flex-1 gap-1.5 bg-destructive hover:bg-destructive/90 text-destructive-foreground border-0 shadow-sm shadow-destructive/20"
        >
          {loading
            ? <><Loader2 size={13} className="animate-spin" /> Deleting…</>
            : <><Trash2 size={13} /> Delete Forever</>
          }
        </Button>
      </div>
    </div>
  )
}