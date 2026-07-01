'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { CheckCircle, Loader2, ShieldAlert } from 'lucide-react'
import { toast } from 'sonner'

type Step = 'info' | 'form' | 'success'

const CONTENT_TYPES = ['Cover image', 'Comic title / description', 'News article', 'User-uploaded image', 'Other']

export default function DMCAPage() {
  const [step, setStep] = useState<Step>('info')
  const [loading, setLoading] = useState(false)

  const [form, setForm] = useState({
    claimant_name: '',
    claimant_email: '',
    company: '',
    copyrighted_work: '',
    infringing_url: '',
    content_type: '',
    description: '',
    good_faith: false,
    accuracy: false,
    authority: false,
    signature: '',
  })

  const set = (field: keyof typeof form, value: string | boolean) =>
    setForm(prev => ({ ...prev, [field]: value }))

  const allChecked = form.good_faith && form.accuracy && form.authority
  const canSubmit = (
    form.claimant_name.trim() &&
    form.claimant_email.trim() &&
    form.copyrighted_work.trim() &&
    form.infringing_url.trim() &&
    form.content_type &&
    form.description.trim() &&
    form.signature.trim() &&
    allChecked
  )

  const handleSubmit = async () => {
    if (!canSubmit) return
    setLoading(true)
    try {
      const res = await fetch('/api/dmca', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      if (!res.ok) throw new Error()
      setStep('success')
    } catch {
      toast.error('Failed to submit. Please email support@compicfy.com directly.')
    } finally {
      setLoading(false)
    }
  }

  if (step === 'success') {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-6">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <CheckCircle size={28} className="text-white" />
        </div>
        <div className="space-y-2">
          <h1 className="text-2xl font-black">DMCA Notice Received</h1>
          <p className="text-muted-foreground leading-relaxed max-w-md mx-auto">
            Your DMCA takedown notice has been submitted. Our team will review it and respond to{' '}
            <span className="text-foreground font-medium">{form.claimant_email}</span> within 72 hours.
          </p>
        </div>
        <div className="p-5 rounded-2xl bg-muted/40 border border-border text-left space-y-2 max-w-md mx-auto text-sm text-muted-foreground">
          <p><span className="font-semibold text-foreground">Claimant:</span> {form.claimant_name}</p>
          <p><span className="font-semibold text-foreground">Work claimed:</span> {form.copyrighted_work}</p>
          <p><span className="font-semibold text-foreground">Content type:</span> {form.content_type}</p>
        </div>
        <p className="text-xs text-muted-foreground">
          Need to follow up? Email{' '}
          <a href="mailto:support@compicfy.com" className="text-primary hover:underline">support@compicfy.com</a>
        </p>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-12 space-y-10">

      {/* Header */}
      <div className="space-y-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shadow-lg shadow-red-500/20">
            <ShieldAlert size={16} className="text-white" />
          </div>
          <h1 className="text-3xl font-black tracking-tight">DMCA Takedown Notice</h1>
        </div>
        <p className="text-muted-foreground leading-relaxed max-w-xl">
          ComPicfy respects intellectual property rights. If you believe content on our platform infringes your copyright, you may submit a formal DMCA takedown notice below.
        </p>
      </div>

      {/* What we host note */}
      <div className="p-4 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
        <p className="text-sm font-bold text-amber-600">Before you submit</p>
        <p className="text-sm text-muted-foreground leading-relaxed">
          ComPicfy does <strong className="text-foreground">not host comic chapters or scans</strong>. We are a recommendation platform that links to official platforms. If you've found a link to pirated content, please use the Report button on that recommendation instead. This DMCA form is for cover images, descriptions, news articles, or other content hosted directly on ComPicfy.
        </p>
      </div>

      {step === 'info' && (
        <div className="space-y-8">

          {/* Process */}
          <section className="space-y-4">
            <h2 className="text-base font-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-500/10 text-red-600 text-xs font-black flex items-center justify-center shrink-0">1</span>
              Our DMCA Process
            </h2>
            <div className="pl-8 space-y-2 text-sm text-muted-foreground leading-relaxed">
              <p>Upon receiving a valid DMCA takedown notice, we will:</p>
              <ul className="space-y-1.5">
                {[
                  'Acknowledge receipt within 24 hours',
                  'Review the claim within 72 hours',
                  'Remove or disable access to the allegedly infringing content if the claim is valid',
                  'Notify the user who uploaded the content',
                  'Allow the user to file a counter-notice if they believe the removal was in error',
                ].map((item, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-red-500 font-bold shrink-0 mt-0.5">→</span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </section>

          {/* Requirements */}
          <section className="space-y-4">
            <h2 className="text-base font-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-500/10 text-red-600 text-xs font-black flex items-center justify-center shrink-0">2</span>
              What Your Notice Must Include
            </h2>
            <div className="pl-8 space-y-1.5 text-sm text-muted-foreground">
              {[
                'Your full name and contact information (email required)',
                'Identification of the copyrighted work you claim has been infringed',
                'The specific URL(s) of the allegedly infringing content on ComPicfy',
                'A statement that you have a good faith belief the use is not authorised',
                'A statement that the information in the notice is accurate',
                'A statement that you are the rights holder or authorised to act on their behalf',
                'Your electronic signature',
              ].map((item, i) => (
                <div key={i} className="flex items-start gap-2">
                  <span className="text-primary font-bold shrink-0 mt-0.5">→</span>
                  {item}
                </div>
              ))}
            </div>
          </section>

          {/* Alternative: email */}
          <section className="space-y-2">
            <h2 className="text-base font-black flex items-center gap-2">
              <span className="w-6 h-6 rounded-lg bg-red-500/10 text-red-600 text-xs font-black flex items-center justify-center shrink-0">3</span>
              Prefer to Email?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed pl-8">
              You may also send a DMCA notice directly to{' '}
              <a href="mailto:support@compicfy.com" className="text-primary hover:underline font-medium">support@compicfy.com</a>{' '}
              with the subject line <span className="font-mono text-xs bg-muted border border-border px-1.5 py-0.5 rounded">DMCA Takedown Notice</span>.
            </p>
          </section>

          <div className="flex justify-end pt-2">
            <Button
              onClick={() => setStep('form')}
              className="gap-2 bg-primary hover:bg-primary/90 border-0 shadow-lg shadow-primary/20"
            >
              Continue to Form →
            </Button>
          </div>
        </div>
      )}

      {step === 'form' && (
        <div className="space-y-8">

          {/* Claimant info */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-red-500/10 to-rose-500/5 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-red-500 to-rose-600 flex items-center justify-center shrink-0">
                <span className="text-sm">👤</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-red-600">Your Information</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Full Name <span className="text-red-500">*</span></label>
                  <Input value={form.claimant_name} onChange={e => set('claimant_name', e.target.value)} placeholder="Your full legal name" className="h-9 text-sm" />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-muted-foreground">Email Address <span className="text-red-500">*</span></label>
                  <Input type="email" value={form.claimant_email} onChange={e => set('claimant_email', e.target.value)} placeholder="you@example.com" className="h-9 text-sm" />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Company / Organisation <span className="text-muted-foreground/60">(optional)</span></label>
                <Input value={form.company} onChange={e => set('company', e.target.value)} placeholder="Publisher, studio, or rights management company" className="h-9 text-sm" />
              </div>
            </div>
          </div>

          {/* Infringing content */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-violet-500/10 to-purple-500/5 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shrink-0">
                <span className="text-sm">📌</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-violet-600">Infringing Content</p>
            </div>
            <div className="p-5 space-y-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Description of Copyrighted Work <span className="text-red-500">*</span></label>
                <Input value={form.copyrighted_work} onChange={e => set('copyrighted_work', e.target.value)} placeholder='e.g. "Cover art for [Title] Vol. 1 by [Artist]"' className="h-9 text-sm" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">URL of Infringing Content on ComPicfy <span className="text-red-500">*</span></label>
                <Input value={form.infringing_url} onChange={e => set('infringing_url', e.target.value)} placeholder="https://compicfy.com/..." className="h-9 text-sm font-mono" />
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Content Type <span className="text-red-500">*</span></label>
                <div className="flex flex-wrap gap-2">
                  {CONTENT_TYPES.map((type) => (
                    <button
                      key={type}
                      onClick={() => set('content_type', type)}
                      className={`px-3 py-1.5 rounded-full text-xs border font-medium transition-colors ${
                        form.content_type === type
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'border-border text-muted-foreground hover:border-primary'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-muted-foreground">Additional Details <span className="text-red-500">*</span></label>
                <Textarea
                  value={form.description}
                  onChange={e => set('description', e.target.value)}
                  placeholder="Describe why you believe this content infringes your copyright and provide any additional context..."
                  rows={4}
                  className="resize-none text-sm"
                />
              </div>
            </div>
          </div>

          {/* Declarations */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-amber-500/10 to-orange-500/5 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-500 to-orange-500 flex items-center justify-center shrink-0">
                <span className="text-sm">✅</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-amber-600">Required Declarations</p>
            </div>
            <div className="p-5 space-y-3">
              {[
                { field: 'good_faith' as const,  label: 'I have a good faith belief that the use of the material described above is not authorised by the copyright owner, its agent, or the law.' },
                { field: 'accuracy' as const,     label: 'I declare that the information in this notification is accurate.' },
                { field: 'authority' as const,    label: 'I am the owner of the copyright, or I am authorised to act on behalf of the owner of the copyright that is allegedly infringed.' },
              ].map(({ field, label }) => (
                <label key={field} className="flex items-start gap-3 cursor-pointer group">
                  <div
                    className={`mt-0.5 w-4 h-4 rounded border-2 shrink-0 flex items-center justify-center transition-colors ${
                      form[field] ? 'bg-primary border-primary' : 'border-border group-hover:border-primary/60'
                    }`}
                    onClick={() => set(field, !form[field])}
                  >
                    {form[field] && <span className="text-white text-xs leading-none font-black">✓</span>}
                  </div>
                  <span className="text-sm text-muted-foreground leading-relaxed">{label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Signature */}
          <div className="rounded-2xl border border-border bg-card overflow-hidden">
            <div className="flex items-center gap-3 px-5 py-4 bg-gradient-to-r from-zinc-500/10 to-zinc-500/5 border-b border-border">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-zinc-600 to-zinc-800 flex items-center justify-center shrink-0">
                <span className="text-sm">✍️</span>
              </div>
              <p className="text-xs font-black uppercase tracking-widest text-muted-foreground">Electronic Signature</p>
            </div>
            <div className="p-5 space-y-2">
              <label className="text-xs font-semibold text-muted-foreground">
                Type your full legal name as your electronic signature <span className="text-red-500">*</span>
              </label>
              <Input value={form.signature} onChange={e => set('signature', e.target.value)} placeholder="Your full legal name" className="h-9 text-sm font-medium" />
              <p className="text-xs text-muted-foreground">By typing your name above you are providing a legally binding electronic signature under 17 U.S.C. § 512(c)(3) and equivalent international legislation.</p>
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between gap-4">
            <Button variant="ghost" onClick={() => setStep('info')} className="text-muted-foreground">
              ← Back
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!canSubmit || loading}
              className="gap-2 bg-primary hover:bg-primary/90 border-0 shadow-lg shadow-primary/20 disabled:opacity-40"
            >
              {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldAlert size={14} />}
              Submit DMCA Notice
            </Button>
          </div>

          <p className="text-xs text-muted-foreground text-center leading-relaxed">
            Submitting a false DMCA notice may expose you to liability. If you are unsure whether the content infringes your copyright, please consult a legal professional before submitting.
          </p>
        </div>
      )}
    </div>
  )
}
