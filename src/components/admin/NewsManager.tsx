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

// Must match newsSchema in validators.ts exactly
interface NewsItem {
  id: string
  title: string
  excerpt: string        // newsSchema: excerpt (NOT summary)
  content: string        // newsSchema: content
  source_url: string     // newsSchema: source_url (required, must be valid URL)
  source_name: string    // newsSchema: source_name (required)
  category: string       // newsSchema: category enum
  cover_url: string
  is_published: boolean
  is_ai_generated: boolean
  is_affiliate: boolean
  affiliate_url: string
  tags: string[]
  created_at: string
}

interface Props { initialNews: NewsItem[] }

const BLANK: Omit<NewsItem, 'id' | 'created_at'> = {
  title: '', excerpt: '', content: '',
  source_url: '', source_name: '',
  category: 'announcement',
  cover_url: '', is_published: false, is_ai_generated: false,
  is_affiliate: false, affiliate_url: '', tags: [],
}

const CATEGORIES = [
  'industry', 'release', 'adaptation', 'event', 'creator', 'announcement',
] as const

export function NewsManager({ initialNews }: Props) {
  const [news, setNews] = useState<NewsItem[]>(initialNews)
  const [expandedId, setExpandedId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | 'new' | null>(null)
  const [editData, setEditData] = useState<Omit<NewsItem, 'id' | 'created_at'>>(BLANK)
  const [actionLoading, setActionLoading] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)

  const set = (field: keyof typeof editData, value: string | boolean | string[]) =>
    setEditData(prev => ({ ...prev, [field]: value }))

  const startNew = () => {
    setEditingId('new')
    setEditData(BLANK)
    setExpandedId(null)
  }

  const startEdit = (item: NewsItem) => {
    setEditingId(item.id)
    setEditData({
      title:          item.title,
      excerpt:        item.excerpt,
      content:        item.content        ?? '',
      source_url:     item.source_url,
      source_name:    item.source_name    ?? '',
      category:       item.category       ?? 'announcement',
      cover_url:      item.cover_url      ?? '',
      is_published:   item.is_published,
      is_ai_generated: item.is_ai_generated ?? false,
      is_affiliate:   item.is_affiliate   ?? false,
      affiliate_url:  item.affiliate_url  ?? '',
      tags:           item.tags           ?? [],
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

      // Route returns { summary: { title, excerpt, content, category, tags }, image_url }
      const s = data.summary ?? {}
      setEditData(prev => ({
        ...prev,
        title:          s.title    || prev.title,
        excerpt:        s.excerpt  || prev.excerpt,
        content:        s.content  || prev.content,
        category:       CATEGORIES.includes(s.category) ? s.category : prev.category,
        tags:           Array.isArray(s.tags) ? s.tags : prev.tags,
        cover_url:      data.image_url || prev.cover_url,
        source_name:    prev.source_name || (new URL(editData.source_url).hostname.replace('www.', '')),
        is_ai_generated: true,
      }))
      toast.success('AI summary generated!')
    } catch (err: any) {
      toast.error(err.message ?? 'Failed to generate summary')
    } finally {
      setAiLoading(false)
    }
  }

  const handleSave = async () => {
    // Match newsSchema required fields
    if (!editData.title.trim())       { toast.error('Title is required'); return }
    if (!editData.excerpt.trim())     { toast.error('Excerpt is required (min 10 chars)'); return }
    if (editData.excerpt.length < 10) { toast.error('Excerpt must be at least 10 characters'); return }
    if (!editData.source_url.trim())  { toast.error('Source URL is required'); return }
    if (!editData.source_name.trim()) { toast.error('Source name is required'); return }
    if (!editData.category)           { toast.error('Category is required'); return }
    if (editData.is_affiliate && !editData.affiliate_url?.trim()) {
      toast.error('Affiliate URL is required when affiliate is enabled'); return
    }

    setActionLoading('save')
    try {
      const isNew = editingId === 'new'
      const res = await fetch(isNew ? '/api/news' : `/api/news/${editingId}`, {
        method: isNew ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editData),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error ?? JSON.stringify(data.details ?? 'Failed to save'))

      if (isNew) {
        setNews(prev => [data.news, ...prev])
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
      const res = await fetch(`/api/news/${id}`, {
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
      const res = await fetch(`/api/news/${id}`, { method: 'DELETE' })
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
          <label className="text-xs font-semibold text-muted-foreground">
            Source URL <span className="text-red-500">*</span>
          </label>
          <div className="flex gap-2">
            <Input
              value={editData.source_url}
              onChange={e => set('source_url', e.target.value)}
              placeholder="https://..."
              className="h-9 text-sm font-mono flex-1"
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

        {/* Source name */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Source Name <span className="text-red-500">*</span>
            <span className="text-muted-foreground/60 font-normal ml-1">(e.g. Crunchyroll, ANN, Viz)</span>
          </label>
          <Input
            value={editData.source_name}
            onChange={e => set('source_name', e.target.value)}
            placeholder="Publication or website name"
            className="h-9 text-sm"
          />
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Title <span className="text-red-500">*</span>
          </label>
          <Input
            value={editData.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Article title..."
            className="h-9 text-sm"
          />
        </div>

        {/* Excerpt */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Excerpt <span className="text-red-500">*</span>
            <span className="text-muted-foreground/60 font-normal ml-1">(min 10 chars, shown on cards)</span>
          </label>
          <Textarea
            value={editData.excerpt}
            onChange={e => set('excerpt', e.target.value)}
            placeholder="2-3 sentence summary shown on news cards..."
            rows={2}
            className="resize-none text-sm"
          />
        </div>

        {/* Full content */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Full Content <span className="text-muted-foreground/60 font-normal">(optional — for article detail page)</span>
          </label>
          <Textarea
            value={editData.content}
            onChange={e => set('content', e.target.value)}
            placeholder="Full article body..."
            rows={5}
            className="resize-none text-sm"
          />
        </div>

        {/* Cover image */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Cover Image URL <span className="text-muted-foreground/60 font-normal">(optional)</span>
          </label>
          <Input
            value={editData.cover_url}
            onChange={e => set('cover_url', e.target.value)}
            placeholder="https://..."
            className="h-9 text-sm font-mono"
          />
        </div>

        {/* Category */}
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-muted-foreground">
            Category <span className="text-red-500">*</span>
          </label>
          <div className="flex flex-wrap gap-1.5">
            {CATEGORIES.map(c => (
              <button
                key={c}
                onClick={() => set('category', c)}
                className={cn(
                  'px-2.5 py-1 rounded-full text-xs border capitalize transition-colors',
                  editData.category === c
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'border-border text-muted-foreground hover:border-primary'
                )}
              >
                {c}
              </button>
            ))}
          </div>
        </div>

        {/* Affiliate section */}
        <div className={cn(
          'rounded-xl border transition-colors space-y-0 overflow-hidden',
          editData.is_affiliate ? 'border-amber-500/30 bg-amber-500/5' : 'border-border'
        )}>
          <div className="px-4 pt-3 pb-3">
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
          {editData.is_affiliate && (
            <div className="px-4 pb-4 space-y-1.5 border-t border-amber-500/20">
              <label className="text-xs font-semibold text-amber-600 mt-3 block">
                Affiliate URL <span className="text-red-500">*</span>
              </label>
              <Input
                value={editData.affiliate_url}
                onChange={e => set('affiliate_url', e.target.value)}
                placeholder="https://... (your tracked affiliate link)"
                className="h-9 text-sm font-mono border-amber-500/30 focus:border-amber-500"
              />
              <p className="text-[10px] text-muted-foreground">
                This link replaces the source URL when the card is clicked.
              </p>
            </div>
          )}
        </div>

        {/* Toggles */}
        <div className="flex items-center gap-4 flex-wrap">
          <Checkbox field="is_published"    label="Publish immediately" />
          <Checkbox field="is_ai_generated" label="AI-generated label"  />
        </div>

        {/* Save */}
        <div className="flex justify-end pt-1">
          <Button
            onClick={handleSave}
            disabled={!!actionLoading}
            className="gap-2 bg-gradient-to-r from-primary to-violet-500 hover:opacity-90 border-0 shadow-lg shadow-primary/20"
          >
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
        {news.map(item => (
          <div key={item.id} className="rounded-2xl border border-border bg-card overflow-hidden hover:border-primary/30 transition-colors">
            <div className="flex items-center gap-3 p-4">
              {item.cover_url && (
                <div className="w-14 h-10 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={item.cover_url} alt={item.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-black truncate">{item.title}</p>
                  {item.is_published
                    ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-emerald-500/10 text-emerald-600 border-emerald-500/20">✓ Published</span>
                    : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-muted text-muted-foreground border-border">Draft</span>
                  }
                  {item.is_ai_generated && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-violet-500/10 text-violet-600 border-violet-500/20">
                      <Sparkles size={9} /> AI
                    </span>
                  )}
                  {item.is_affiliate && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border bg-amber-500/10 text-amber-600 border-amber-500/20">
                      💰 Affiliate
                    </span>
                  )}
                  {item.category && (
                    <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold border bg-muted text-muted-foreground border-border capitalize">
                      {item.category}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {item.source_name && <span className="font-medium">{item.source_name} · </span>}
                  {formatDate(item.created_at)}
                </p>
              </div>
              <div className="flex items-center gap-0.5 shrink-0">
                {item.source_url && (
                  <a href={item.source_url} target="_blank" rel="noopener noreferrer">
                    <Button variant="ghost" size="icon" className="h-8 w-8" title="View source"><ExternalLink size={13} /></Button>
                  </a>
                )}
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => editingId === item.id ? setEditingId(null) : startEdit(item)} title="Edit">
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
                <Button variant="ghost" size="icon" className="h-8 w-8"
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}>
                  {expandedId === item.id ? <ChevronUp size={13} /> : <ChevronDown size={13} />}
                </Button>
              </div>
            </div>

            {editingId === item.id && (
              <div className="border-t border-border"><FormPanel /></div>
            )}

            {expandedId === item.id && editingId !== item.id && (
              <div className="px-4 pb-4 border-t border-border pt-3 space-y-2">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">{item.excerpt}</p>
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