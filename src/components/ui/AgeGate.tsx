'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Shield, AlertTriangle, BookOpen } from 'lucide-react'

const STORAGE_KEY = 'ComPicfy_age_verified'
const STORAGE_DATE_KEY = 'ComPicfy_age_verified_date'
const ONE_YEAR = 365 * 24 * 60 * 60 * 1000

interface AgeGateProps {
  onVerified: () => void
}

export function AgeGate({ onVerified }: AgeGateProps) {
  const [step, setStep] = useState<'gate' | 'dob'>('gate')
  const [dob, setDob] = useState('')
  const [error, setError] = useState('')

  const handleUnder18 = () => {
    localStorage.setItem(STORAGE_KEY, 'under18')
    localStorage.setItem(STORAGE_DATE_KEY, Date.now().toString())
    const expires = new Date(Date.now() + ONE_YEAR).toUTCString()
    document.cookie = `ComPicfy_age=under18; expires=${expires}; path=/; SameSite=Lax`
    onVerified()
  }

  const handleOver18Click = () => {
    setStep('dob')
  }

  const handleDOBSubmit = () => {
    if (!dob) { setError('Please enter your date of birth'); return }

    const birthDate = new Date(dob)
    const today = new Date()
    let age = today.getFullYear() - birthDate.getFullYear()
    const monthDiff = today.getMonth() - birthDate.getMonth()
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--
    }

    if (age < 13) {
      setError('You must be at least 13 to use ComPicfy.')
      return
    }

    const canSeeAdult = age >= 18
    const canSeeMature = age >= 17

    localStorage.setItem(STORAGE_KEY, canSeeAdult ? 'adult' : canSeeMature ? 'mature' : 'teen')
    localStorage.setItem(STORAGE_DATE_KEY, Date.now().toString())

    const expires = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toUTCString()
    const ageValue = canSeeAdult ? 'adult' : canSeeMature ? 'mature' : 'teen'
    document.cookie = `ComPicfy_age=${ageValue}; expires=${expires}; path=/; SameSite=Lax`

    onVerified()
  }

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/95">
      <div className="w-full max-w-sm bg-card border border-border rounded-2xl p-6 space-y-5 shadow-2xl">

        {/* Logo */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <BookOpen size={28} className="text-primary" />
          </div>
          <h1 className="text-xl font-bold">ComPicfy</h1>
        </div>

        {step === 'gate' ? (
          <>
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center gap-2 text-yellow-500">
                <Shield size={18} />
                <span className="text-sm font-semibold">Age Verification</span>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                ComPicfy contains content rated for different age groups including mature (17+) and adult (18+) recommendations. Please confirm your age to continue.
              </p>
            </div>

            <div className="space-y-2">
              <Button className="w-full" onClick={handleOver18Click}>
                I am 18 or older
              </Button>
              <Button variant="outline" className="w-full" onClick={handleUnder18}>
                I am under 18
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              Your choice is remembered for 30 days
            </p>
          </>
        ) : (
          <>
            <div className="text-center space-y-1">
              <p className="text-sm font-semibold">Confirm your date of birth</p>
              <p className="text-xs text-muted-foreground">
                We need to verify your age to show appropriate content
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={dob}
                onChange={(e) => { setDob(e.target.value); setError('') }}
                max={new Date().toISOString().split('T')[0]}
              />
              {error && (
                <p className="text-xs text-destructive flex items-center gap-1">
                  <AlertTriangle size={11} />
                  {error}
                </p>
              )}
            </div>

            <div className="space-y-2">
              <Button className="w-full" onClick={handleDOBSubmit}>
                Confirm Age
              </Button>
              <Button variant="ghost" className="w-full text-sm" onClick={() => setStep('gate')}>
                ← Back
              </Button>
            </div>

            <p className="text-xs text-center text-muted-foreground">
              By confirming, you agree to our{' '}
              <a href="/terms" className="text-primary hover:underline">Terms of Service</a>
            </p>
          </>
        )}
      </div>
    </div>
  )
}