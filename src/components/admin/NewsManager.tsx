'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { toast } from 'sonner'
import {
  Plus, Pencil, Trash2, Eye, EyeOff, Sparkles, Loader2,
  Globe, ExternalLink, ChevronDown, ChevronUp, DollarSign,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import { cn } from '@/lib/utils'

interface NewsItem {
  id: string
  title: string
  summary: string
  source_url: string
  image_url?: string | null
  is_published: boolean
  is_ai_summary: boolean
  is_affiliate: boolean
  affiliate_url?: string | null
  created_at: string
}

interface Props { initialNews: NewsItem[] }

const BLANK: Omit<NewsItem, 'id' | 'created_at'> = {
  title: '', summary: '', source_url: '',
  image_url: '', is_published: false, is_ai_summary: false,
  is_affiliate: false, affiliate_url: '',
}

export function NewsManager({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editData, setEditData] = useState<Omit<NewsItem, 'id' | 'created_at'>>(BLANK)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const set = (field: keyof typeof editData, value: string | boolean) =>
    setEditData(prev => ({ ...prev, [field]: value }))

  const startNew = () => {
    setEditingId('new')
    setEditData(BLANK)
    setExpandedId(null)
  }

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id)
    setEditData({
      title: item.title, summary: item.summary,
      source_url: item.source_url, image_url: item.image_url ?? '',
      is_published: item.is_published, is_ai_summary: item.is_ai_summary,
      is_affiliate: item.is_affiliate, affiliate_url: item.affiliate_url ?? '',
    })
    setExpandedId(null)
  }

  const handleAISummarise = async () => {
    if (!editData.source_url.trim()) { toast.error('Enter a source URL first'); return }
    setAiLoading(true)
    try {
      const res = await fetch('/api/news/summarise', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: editData.source_url }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      // Route returns { summary: { title, excerpt, content, ... }, image_url }
      const s = data.summary ?? {}
      setEditData(prev => ({
        ...prev,
        title:      s.title   || prev.title,
        summary:    s.excerpt || s.content || prev.summary,
        image_url:  data.image_url || prev.image_url,
        is_ai_summary: true,
      }))
      toast.success('AI summary generated!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate summary')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    if (!editData.title.trim() || !editData.summary.trim()) {
      toast.error('Title and summary are required'); return
    }
    if (editData.is_affiliate && !editData.affiliate_url?.trim()) {
      toast.error('Affiliate URL is required when affiliate is enabled'); return
    }
    setActionLoading('save')
    try {
      const isNew = editingId === 'new'
      const res = await fetch(isNew ? '/api/admin/news' : `/api/admin/news/${editingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      if (isNew) {
        setNews(prev => [data.article, ...prev])
        toast.success('Article created!')
      } else {
        setNews(prev => prev.map(n => n.id === editingId ? { ...n, ...editData } : n))
        toast.success('Article updated!')
      }
      setEditingId(null); setEditData(BLANK)
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to save article')
    } finally {
      setActionLoading(null)
    }
  }

  const handleTogglePublish = async (id: string, current: boolean) => {
    setActionLoading(`${id}-publish`)
    try {
      const res = await fetch(`/api/admin/news/${id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !current }),
      })
      if (!res.ok) throw new Error()
      setNews(prev => prev.map(n => n.id === id ? { ...n, is_published: !current } : n))
      toast.success(current ? 'Article unpublished' : 'Article published!')
    } catch { toast.error('Failed to update') }
    finally { setActionLoading(null) }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article permanently?')) return
    setActionLoading(`${id}-delete`)
    try {
      const res = await fetch(`/api/admin/news/${id}`, { method: 'DELETE' })
      if (!res.ok) throw new Error()
      setNews(prev => prev.filter(n => n.id !== id))
      toast.success('Article deleted')
    } catch { toast.error('Failed to delete') }
    finally { setActionLoading(null) }
  }

  const Checkbox = ({ field, label }: { field: keyof typeof editData; label: string }) => (
    <label className="flex items-center gap-2 cursor-pointer">
      <div
        className={cn(
          'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
          editData[field] ? 'bg-primary border-primary' : 'border-border hover:border-primary/60'
        )}
        onClick={() => set(field, !editData[field])}
      >
        {editData[field] && <span className="text-white text-[10px] font-black leading-none">✓</span>}
      </div>
      <span className="text-sm font-medium">{label}</span>
    </label>
  )

  const FormPanel = () => (
    <div className="rounded-2xl border border-border bg-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-gradient-to-r from-teal-500/10 to-cyan-500/5">
        <p className="text-xs font-black uppercase tracking-widest text-teal-600">
          {editingId === 'new' ? 'New Article' : 'Edit Article'}
        </p>
        <Button variant="ghost" size="sm" onClick={() => { setEditingId(null); setEditData(BLANK) }} className="h-7 text-xs">
          Cancel
        </Button>
      </div>
      <div className="p-5 space-y-3">

        {/* Source URL + AI */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Source URL</label>
          <div className="flex gap-2">
            <Input
              value={editData.source_url} onChange={e => set('source_url', e.target.value)}
              placeholder="https://..." className="h-9 text-sm font-mono flex-1"
            />
            <Button
              variant="outline" size="sm" onClick={handleAISummarise}
              disabled={aiLoading || !editData.source_url.trim()}
              className="gap-1.5 h-9 shrink-0 whitespace-nowrap"
            >
              {aiLoading ? <Loader2 size={13} className="animate-spin" /> : <Sparkles size={13} />}
              AI Summary
            </Button>
          </div>
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Title <span className="text-red-500">*</span></label>
          <Input value={editData.title} onChange={e => set('title', e.target.value)} placeholder="Article title..." className="h-9 text-sm" />
        </div>

        {/* Summary */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Summary <span className="text-red-500">*</span></label>
          <Textarea value={editData.summary} onChange={e => set('summary', e.target.value)} placeholder="Article summary..." rows={4} className="resize-none text-sm" />
        </div>

        {/* Image URL */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">Image URL <span className="text-muted-foreground/60">(optional)</span></label>
          <Input value={editData.image_url ?? ''} onChange={e => set('image_url', e.target.value)} placeholder="https://..." className="h-9 text-sm font-mono" />
        </div>

        {/* Affiliate section */}
        <div className={cn(
          'rounded-xl border transition-colors space-y-3 overflow-hidden',
          editData.is_affiliate ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'
        )}>
          <div className="px-4 pt-3 pb-1">
            <label className="flex items-center gap-2 cursor-pointer">
              <div
                className={cn(
                  'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                  editData.is_affiliate ? 'bg-amber-500 border-amber-500' : 'border-border hover:border-amber-500/60'
                )}
                onClick={() => set('is_affiliate', !editData.is_affiliate)}
              >
                {editData.is_affiliate && <span className="text-white text-[10px] font-black leading-none">✓</span>}
              </div>
              <div className="flex items-center gap-1.5">
                <DollarSign size={13} className={editData.is_affiliate ? 'text-amber-500' : 'text-muted-foreground'} />
                <span className="text-sm font-medium">Affiliate article</span>
                <span className="text-[10px] text-muted-foreground">(shows 💰 badge on card)</span>
              </div>
            </label>
          </div>

          {/* Affiliate URL — only shown when toggled on */}
          {editData.is_affiliate && (
            <div className="px-4 pb-4 space-y-1.5">
              <label className="text-xs font-semibold text-amber-600">
                Affiliate URL <span className="text-red-500">*</span>
              </label>
              <Input
                value={editData.affiliate_url ?? ''}
                onChange={e => set('affiliate_url', e.target.value)}
                placeholder="https://... (your tracked affiliate link)"
                className="h-9 text-sm font-mono border-amber-500/30 focus:border-amber-500"
              />
              <p className="text-[10px] text-muted-foreground">
                This link will be used instead of the source URL when the card is clicked.
              </p>
            </div>
          )}
        </div>

        {/* Toggles row */}
        <div className="flex items-center gap-4 flex-wrap">
          <Checkbox field="is_published"  label="Publish immediately" />
          <Checkbox field="is_ai_summary" label="AI-generated label"  />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1">
          <Button onClick={handleSave} disabled={!!actionLoading} className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20">
            {actionLoading === 'save' && <Loader2 size={13} className="animate-spin" />}
            {editingId === 'new' ? 'Create Article' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">{news.length} articles</p>
        {editingId !== 'new' && (
          <Button onClick={startNew} size="sm" className="gap-1.5 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20">
            <Plus size={14} /> New Article
          </Button>
        )}
      </div>

      {editingId === 'new' && <FormPanel />}

      <div className="space-y-2">
        {news.map((item) => (
          <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3 p-4">
              {item.image_url && (
                <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={item.image_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black truncate">{item.title}</p>
                  {item.is_published
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Published</span>
                    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-muted text-muted-foreground border-border">Draft</span>
                  }
                  {item.is_ai_summary && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/10 text-violet-600 border-violet-500/20">
                      <Sparkles size={9} /> AI
                    </span>
                  )}
                  {item.is_affiliate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                      💰 Affiliate
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">{formatDate(item.created_at)}</p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View source"><ExternalLink size={13} /></Button>
                  </a>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => editingId === item.id ? setEditingId(null) : startEdit(item)} title="Edit">
                  <Pencil size={13} />
                </Button>
                <Button
                  variant="ghost" size="icon"
                  className={cn('h-8 w-8', item.is_published ? 'text-amber-500 hover:text-amber-500' : 'text-emerald-500 hover:text-emerald-500')}
                  onClick={() => handleTogglePublish(item.id, item.is_published)}
                  disabled={!!actionLoading} title={item.is_published ? 'Unpublish' : 'Publish'}
                >
                  {actionLoading === `${item.id}-publish` ? <Loader2 size={13} className="animate-spin" /> : item.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8 text-red-500 hover:text-red-500"
                  onClick={() => handleDelete(item.id)} disabled={!!actionLoading} title="Delete">
                  {actionLoading === `${item.id}-delete` ? <Loader2 size={13} className="animate-spin" /> : <Trash2 size={13} />}
                </Button>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  {expandedId === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </Button>
              </div>
            </div>

            {editingId === item.id && (
              <div className="border-t border-border">
                <FormPanel />
              </div>
            )}

            {expandedId === item.id && editingId !== item.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-4">{item.summary}</p>
                {item.affiliate_url && (
                  <a href={item.affiliate_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-amber-600 hover:underline font-medium">
                    <DollarSign size={11} /> View affiliate link
                  </a>
                )}
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-primary hover:underline">
                    <Globe size={11} /> View source article
                  </a>
                )}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}