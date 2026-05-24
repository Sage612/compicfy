'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import {
  Palette, BookOpen, Link as LinkIcon, ArrowRight,
  Check, Loader2, Sparkles, Users, BarChart2,
  ExternalLink, Zap,
} from 'lucide-react'

interface Props {
  userId:      string
  username:    string
  displayName: string
  next:        string
}

const COMIC_TYPES = [
  { value: 'manga',   label: 'Manga',   desc: 'Japanese style, right to left' },
  { value: 'manhwa',  label: 'Manhwa',  desc: 'Korean webtoon format'         },
  { value: 'manhua',  label: 'Manhua',  desc: 'Chinese comics'                },
  { value: 'webtoon', label: 'Webtoon', desc: 'Vertical scroll format'        },
  { value: 'comic',   label: 'Comic',   desc: 'Western style'                 },
  { value: 'other',   label: 'Other',   desc: 'Something else entirely'       },
]

const CREATOR_TOUR = [
  {
    icon:     BookOpen,
    color:    'bg-teal-500/10',
    iconColor:'text-teal-500',
    title:    'Submit Your Works',
    desc:     'Add your comics to Compicfy. The community discovers them, votes, and reviews. Go to Creator Dashboard → My Works.',
  },
  {
    icon:     Users,
    color:    'bg-violet-500/10',
    iconColor:'text-violet-500',
    title:    'Build Your Audience',
    desc:     'Readers can follow you directly. Track your follower count and profile views in Audience.',
  },
  {
    icon:     LinkIcon,
    color:    'bg-orange-500/10',
    iconColor:'text-orange-500',
    title:    'Your Support Links',
    desc:     'Patreon, Kickstarter, and comic URLs show up as buttons on your profile. Readers click straight through.',
  },
  {
    icon:     BarChart2,
    color:    'bg-blue-500/10',
    iconColor:'text-blue-500',
    title:    'Track Engagement',
    desc:     'See upvotes, saves, and views on each of your works. Upgrade to Pro for deep analytics.',
  },
]

const STEPS = ['welcome', 'work-type', 'links', 'tour', 'done'] as const
type Step = typeof STEPS[number]

export function CreatorOnboardingFlow({ userId, username, displayName, next }: Props) {
  const router = useRouter()

  const [step,         setStep]         = useState<Step>('welcome')
  const [workType,     setWorkType]     = useState<string>('')
  const [comicUrl,     setComicUrl]     = useState('')
  const [patreonUrl,   setPatreonUrl]   = useState('')
  const [kickstarterUrl, setKickstarterUrl] = useState('')
  const [saving,       setSaving]       = useState(false)

  const currentStepIndex = STEPS.indexOf(step)
  const progress         = (currentStepIndex / (STEPS.length - 1)) * 100
  const name             = displayName || username || 'there'

  const handleComplete = async (destination?: string) => {
    setSaving(true)
    const target = destination ?? next
    try {
      // Save genres as empty array for creators, save links and work type
      const res = await fetch('/api/onboarding/complete', {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          favorite_genres:  [],
          comic_url:        comicUrl        || null,
          patreon_url:      patreonUrl      || null,
          kickstarter_url:  kickstarterUrl  || null,
        }),
      })
      if (!res.ok) throw new Error()
      router.push(target)
      router.refresh()
    } catch {
      toast.error('Something went wrong, please try again')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <div className="w-full max-w-lg">

        {/* Progress */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs text-muted-foreground font-medium uppercase tracking-widest">
              Step {currentStepIndex + 1} of {STEPS.length}
            </span>
            <span className="text-xs text-muted-foreground">{Math.round(progress)}%</span>
          </div>
          <div className="h-1.5 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-teal-500 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* STEP 1: Welcome */}
        {step === 'welcome' && (
          <div className="rounded-3xl border border-teal-500/30 bg-card p-8 space-y-6 text-center">
            <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-teal-500/40 to-transparent rounded-t-3xl" />
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto">
                <Palette size={28} className="text-teal-500" />
              </div>
              <h1 className="text-3xl font-black tracking-tight">
                Welcome, {name} 🎨
              </h1>
              <p className="text-muted-foreground leading-relaxed">
                You're setting up as a creator. Let's get your studio ready in 60 seconds.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-left">
              {[
                { icon: BookOpen,  text: 'Showcase your works', color: 'text-teal-500'    },
                { icon: Users,     text: 'Build your audience', color: 'text-violet-500'  },
                { icon: LinkIcon,  text: 'Link your Patreon',   color: 'text-orange-500'  },
                { icon: BarChart2, text: 'Track engagement',    color: 'text-blue-500'    },
              ].map(({ icon: Icon, text, color }) => (
                <div key={text} className="flex items-center gap-2.5 p-3 rounded-xl bg-teal-500/5 border border-teal-500/15">
                  <Icon size={15} className={color} />
                  <span className="text-xs font-semibold">{text}</span>
                </div>
              ))}
            </div>

            <Button
              onClick={() => setStep('work-type')}
              className="w-full h-11 gap-2 font-bold bg-teal-500 hover:bg-teal-600 border-0 text-white"
            >
              Set up my studio <ArrowRight size={16} />
            </Button>
          </div>
        )}

        {/* STEP 2: Work type */}
        {step === 'work-type' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">What do you create?</h2>
              <p className="text-sm text-muted-foreground">
                This helps readers find your work in the right category.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2">
              {COMIC_TYPES.map((type) => {
                const isSelected = workType === type.value
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => setWorkType(type.value)}
                    className={cn(
                      'text-left p-3.5 rounded-xl border-2 transition-all duration-150',
                      isSelected
                        ? 'border-teal-500/60 bg-teal-500/10 shadow-sm'
                        : 'border-border bg-card hover:border-teal-500/30 hover:bg-teal-500/5'
                    )}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <p className={cn('text-sm font-black', isSelected ? 'text-teal-600 dark:text-teal-400' : 'text-foreground')}>
                        {type.label}
                      </p>
                      {isSelected && (
                        <div className="w-4 h-4 rounded-full bg-teal-500 flex items-center justify-center">
                          <Check size={9} className="text-white" />
                        </div>
                      )}
                    </div>
                    <p className="text-[11px] text-muted-foreground">{type.desc}</p>
                  </button>
                )
              })}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('welcome')} className="flex-1">Back</Button>
              <Button
                onClick={() => setStep('links')}
                className="flex-1 gap-2 font-bold bg-teal-500 hover:bg-teal-600 border-0 text-white"
              >
                {workType ? 'Continue' : 'Skip for now'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 3: Links */}
        {step === 'links' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">Where can readers find you?</h2>
              <p className="text-sm text-muted-foreground">
                These show as buttons on your public profile. Skip anything that doesn't apply.
              </p>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <BookOpen size={13} className="text-teal-500" />
                  Comic / Webtoon URL
                </Label>
                <Input
                  value={comicUrl}
                  onChange={e => setComicUrl(e.target.value)}
                  placeholder="https://webtoons.com/your-comic"
                  type="url"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <span className="text-base leading-none">🎨</span>
                  Patreon
                </Label>
                <Input
                  value={patreonUrl}
                  onChange={e => setPatreonUrl(e.target.value)}
                  placeholder="https://patreon.com/yourpage"
                  type="url"
                  className="h-10"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-sm font-semibold flex items-center gap-1.5">
                  <span className="text-base leading-none">🚀</span>
                  Kickstarter Campaign
                </Label>
                <Input
                  value={kickstarterUrl}
                  onChange={e => setKickstarterUrl(e.target.value)}
                  placeholder="https://kickstarter.com/projects/your-campaign"
                  type="url"
                  className="h-10"
                />
              </div>
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('work-type')} className="flex-1">Back</Button>
              <Button
                onClick={() => setStep('tour')}
                className="flex-1 gap-2 font-bold bg-teal-500 hover:bg-teal-600 border-0 text-white"
              >
                {(comicUrl || patreonUrl || kickstarterUrl) ? 'Save & continue' : 'Skip for now'}
                <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 4: Tour */}
        {step === 'tour' && (
          <div className="rounded-3xl border border-border bg-card p-8 space-y-6">
            <div className="space-y-2">
              <h2 className="text-2xl font-black tracking-tight">Your creator studio 🗺️</h2>
              <p className="text-sm text-muted-foreground">
                Four things to know before you dive in.
              </p>
            </div>

            <div className="space-y-3">
              {CREATOR_TOUR.map(({ icon: Icon, color, iconColor, title, desc }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 p-3.5 rounded-2xl border border-border bg-muted/30 hover:border-teal-500/30 transition-colors"
                >
                  <div className={`w-9 h-9 rounded-xl ${color} flex items-center justify-center shrink-0`}>
                    <Icon size={15} className={iconColor} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-black">{title}</p>
                    <p className="text-xs text-muted-foreground leading-relaxed mt-0.5">{desc}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="ghost" onClick={() => setStep('links')} className="flex-1">Back</Button>
              <Button
                onClick={() => setStep('done')}
                className="flex-1 gap-2 font-bold bg-teal-500 hover:bg-teal-600 border-0 text-white"
              >
                Almost there <ArrowRight size={15} />
              </Button>
            </div>
          </div>
        )}

        {/* STEP 5: Done */}
        {step === 'done' && (
          <div className="rounded-3xl border border-teal-500/30 bg-card p-8 space-y-6 text-center">
            <div className="space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-teal-500/10 border border-teal-500/20 flex items-center justify-center mx-auto">
                <Zap size={28} className="text-teal-500" />
              </div>
              <h2 className="text-3xl font-black tracking-tight">Studio is ready.</h2>
              <p className="text-muted-foreground leading-relaxed">
                Submit your first work and let the community discover it.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-3 text-center">
              {[
                { value: workType     ? '✓' : '—', label: 'Type set'  },
                { value: (comicUrl || patreonUrl || kickstarterUrl) ? '✓' : '—', label: 'Links set' },
                { value: '0',                        label: 'Works'     },
              ].map(({ value, label }) => (
                <div key={label} className="p-3 rounded-2xl bg-teal-500/5 border border-teal-500/20 space-y-1">
                  <p className="text-2xl font-black text-teal-500">{value}</p>
                  <p className="text-[10px] text-muted-foreground font-semibold uppercase tracking-wide">{label}</p>
                </div>
              ))}
            </div>

            {/* Primary CTA — submit first work */}
            <div className="p-4 rounded-2xl border border-teal-500/20 bg-teal-500/5 text-left space-y-3">
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
                  <BookOpen size={15} className="text-teal-500" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-black">Submit your first work</p>
                  <p className="text-xs text-muted-foreground mt-0.5 leading-relaxed">
                    Add your comic now so readers can start discovering it.
                  </p>
                </div>
              </div>
              <Button
                onClick={() => handleComplete('/creator/dashboard/works/new')}
                disabled={saving}
                className="w-full gap-2 bg-teal-500 hover:bg-teal-600 border-0 text-white"
              >
                {saving
                  ? <><Loader2 size={13} className="animate-spin" /> Saving…</>
                  : <><BookOpen size={13} /> Submit my first work</>
                }
              </Button>
            </div>

            <Button
              onClick={() => handleComplete('/creator/dashboard')}
              disabled={saving}
              variant="outline"
              className="w-full h-11 gap-2 font-bold"
            >
              {saving
                ? <><Loader2 size={15} className="animate-spin" /> Saving…</>
                : <>Go to my dashboard <ArrowRight size={16} /></>
              }
            </Button>
          </div>
        )}
      </div>
    </div>
  )
}