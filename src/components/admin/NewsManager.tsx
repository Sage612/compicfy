'use client'

import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import {
  Plus,
  Loader2,
  Sparkles,
  Eye,
  EyeOff,
  Trash2,
  Edit,
} from 'lucide-react'
import { formatDate } from '@/lib/utils/format'
import type { News } from '@/types/database.types'

const newsFormSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(10).max(500),
  content: z.string(),
  source_name: z.string().min(1),
  source_url: z.string().url(),
  category: z.enum(['industry', 'release', 'adaptation', 'event', 'creator', 'announcement']),
  cover_url: z.string(),
  is_affiliate: z.boolean(),
  affiliate_url: z.string(),
  is_published: z.boolean(),
})

type NewsFormValues = z.output<typeof newsFormSchema>

const CATEGORIES = [
  { value: 'industry', label: 'Industry' },
  { value: 'release', label: 'New Release' },
  { value: 'adaptation', label: 'Adaptation' },
  { value: 'event', label: 'Event' },
  { value: 'creator', label: 'Creator' },
  { value: 'announcement', label: 'Announcement' },
] as const

interface Props {
  initialNews: News[]
}

export function NewsManager({ initialNews }: Props) {
  const [news, setNews] = useState(initialNews)
  const [showForm, setShowForm] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [summarising, setSummarising] = useState(false)
  const [articleText, setArticleText] = useState('')
  const [isAffiliate, setIsAffiliate] = useState(false)

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors },
  } = useForm<NewsFormValues>({
    resolver: zodResolver(newsFormSchema),
    defaultValues: {
      category: 'announcement',
      is_published: false,
      is_affiliate: false,
    },
  })

  const categoryValue = watch('category')
  const isPublished = watch('is_published')

  const handleAISummarise = async () => {
    if (!articleText.trim()) {
      toast.error('Please paste article text first')
      return
    }

    setSummarising(true)
    try {
      const sourceUrl = watch('source_url')
      const sourceName = watch('source_name')

      const res = await fetch('/api/news/summarise', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          article_text: articleText,
          source_url: sourceUrl,
          source_name: sourceName,
        }),
      })

      const data = await res.json()
      if (!res.ok) throw new Error(data.error)

      const { summary } = data
      setValue('title', summary.title)
      setValue('excerpt', summary.excerpt)
      setValue('content', summary.content)
      setValue('category', summary.category)
      toast.success('Article summarised by AI!')
    } catch (error) {
      toast.error('Failed to summarise article')
      console.error(error)
    } finally {
      setSummarising(false)
    }
  }

  const onSubmit = async (data: NewsFormValues) => {
    setSubmitting(true)
    try {
      const url = editingId ? `/api/news/${editingId}` : '/api/news'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          is_ai_generated: !!articleText,
          ai_model: articleText ? 'claude-opus-4-6' : null,
        }),
      })

      const result = await res.json()
      if (!res.ok) throw new Error(result.error)

      if (editingId) {
        setNews((prev) => prev.map((n) => n.id === editingId ? result.news : n))
        toast.success('Article updated!')
      } else {
        setNews((prev) => [result.news, ...prev])
        toast.success('Article created!')
      }

      reset()
      setArticleText('')
      setEditingId(null)
      setShowForm(false)
    } catch (error) {
      toast.error('Failed to save article')
      console.error(error)
    } finally {
      setSubmitting(false)
    }
  }

  const handleEdit = (item: News) => {
    setEditingId(item.id)
    setValue('title', item.title)
    setValue('excerpt', item.excerpt)
    setValue('content', item.content ?? '')
    setValue('source_name', item.source_name)
    setValue('source_url', item.source_url)
    setValue('category', item.category as any)
    setValue('cover_url', item.cover_url ?? '')
    setValue('is_affiliate', item.is_affiliate)
    setValue('affiliate_url', item.affiliate_url ?? '')
    setValue('is_published', item.is_published)
    setIsAffiliate(item.is_affiliate)
    setShowForm(true)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handleTogglePublish = async (item: News) => {
    try {
      const res = await fetch(`/api/news/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_published: !item.is_published }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error()
      setNews((prev) => prev.map((n) => n.id === item.id ? data.news : n))
      toast.success(item.is_published ? 'Unpublished' : 'Published!')
    } catch {
      toast.error('Failed to update')
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this article?')) return
    try {
      await fetch(`/api/news/${id}`, { method: 'DELETE' })
      setNews((prev) => prev.filter((n) => n.id !== id))
      toast.success('Article deleted')
    } catch {
      toast.error('Failed to delete')
    }
  }

  return (
    <div className="space-y-6">
      {/* Create button */}
      {!showForm && (
        <Button onClick={() => setShowForm(true)} className="gap-2">
          <Plus size={16} />
          Create News Article
        </Button>
      )}

      {/* Form */}
      {showForm && (
        <div className="p-6 rounded-xl border border-border bg-card space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">
              {editingId ? 'Edit Article' : 'New Article'}
            </h2>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setShowForm(false)
                setEditingId(null)
                reset()
                setArticleText('')
              }}
            >
              Cancel
            </Button>
          </div>

          {/* AI Summarise section */}
          {!editingId && (
            <div className="space-y-3 p-4 rounded-lg bg-primary/5 border border-primary/10">
              <div className="flex items-center gap-2">
                <Sparkles size={16} className="text-primary" />
                <p className="text-sm font-semibold">AI Summarise</p>
                <Badge variant="secondary" className="text-xs">Optional</Badge>
              </div>
              <p className="text-xs text-muted-foreground">
                Paste an article and AI will generate the title, excerpt, content and category automatically.
              </p>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-xs">Source Name</Label>
                  <Input
                    {...register('source_name')}
                    placeholder="e.g. Anime News Network"
                    className="h-8 text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Source URL</Label>
                  <Input
                    {...register('source_url')}
                    placeholder="https://..."
                    className="h-8 text-sm"
                  />
                </div>
              </div>
              <Textarea
                placeholder="Paste the full article text here..."
                value={articleText}
                onChange={(e) => setArticleText(e.target.value)}
                rows={4}
                className="resize-none text-sm"
              />
              <Button
                type="button"
                size="sm"
                onClick={handleAISummarise}
                disabled={summarising || !articleText.trim()}
                className="gap-2"
              >
                {summarising ? (
                  <><Loader2 size={13} className="animate-spin" />Summarising...</>
                ) : (
                  <><Sparkles size={13} />Summarise with AI</>
                )}
              </Button>
            </div>
          )}

          <Separator />

          {/* Manual form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Title *</Label>
              <Input {...register('title')} placeholder="Article headline" />
              {errors.title && <p className="text-xs text-destructive">{errors.title.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Excerpt *</Label>
              <Textarea
                {...register('excerpt')}
                placeholder="Brief summary (shown in cards)"
                rows={2}
                className="resize-none"
              />
              {errors.excerpt && <p className="text-xs text-destructive">{errors.excerpt.message}</p>}
            </div>

            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                {...register('content')}
                placeholder="Full article content (markdown supported)"
                rows={6}
                className="resize-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Source Name *</Label>
                <Input {...register('source_name')} placeholder="e.g. Crunchyroll News" />
                {errors.source_name && <p className="text-xs text-destructive">{errors.source_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label>Source URL *</Label>
                <Input {...register('source_url')} placeholder="https://..." />
                {errors.source_url && <p className="text-xs text-destructive">{errors.source_url.message}</p>}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Category *</Label>
              <div className="flex flex-wrap gap-2">
                {CATEGORIES.map(({ value, label }) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => setValue('category', value)}
                    className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                      categoryValue === value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'border-border text-muted-foreground hover:border-primary'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <Label>Cover Image URL</Label>
              <Input {...register('cover_url')} placeholder="https://..." />
            </div>

            {/* Affiliate toggle */}
            <label className="flex items-center gap-2.5 cursor-pointer">
              <input
                type="checkbox"
                {...register('is_affiliate')}
                onChange={(e) => {
                  setIsAffiliate(e.target.checked)
                  setValue('is_affiliate', e.target.checked)
                }}
                className="w-4 h-4"
              />
              <span className="text-sm font-medium">Contains affiliate link</span>
            </label>

            {isAffiliate && (
              <div className="space-y-2">
                <Label>Affiliate URL</Label>
                <Input {...register('affiliate_url')} placeholder="https://..." />
              </div>
            )}

            <Separator />

            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  {...register('is_published')}
                  className="w-4 h-4"
                />
                <span className="text-sm font-medium">
                  {isPublished ? '✅ Publish immediately' : '📝 Save as draft'}
                </span>
              </label>

              <Button type="submit" disabled={submitting} className="gap-2 min-w-28">
                {submitting ? (
                  <><Loader2 size={14} className="animate-spin" />Saving...</>
                ) : editingId ? (
                  'Update Article'
                ) : (
                  'Create Article'
                )}
              </Button>
            </div>
          </form>
        </div>
      )}

      {/* News list */}
      <div className="space-y-3">
        <h2 className="text-base font-semibold">All Articles ({news.length})</h2>
        {news.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No articles yet. Create your first one!
          </p>
        ) : (
          news.map((item) => (
            <div
              key={item.id}
              className="flex gap-4 p-4 rounded-xl border border-border bg-card"
            >
              {item.cover_url && (
                <div className="w-16 h-12 rounded-lg overflow-hidden bg-muted shrink-0">
                  <img src={item.cover_url} alt="" className="w-full h-full object-cover" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold truncate">{item.title}</p>
                    <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                      <Badge variant="secondary" className="text-xs capitalize">
                        {item.category}
                      </Badge>
                      <span className={`text-xs font-medium ${item.is_published ? 'text-green-500' : 'text-muted-foreground'}`}>
                        {item.is_published ? '✅ Published' : '📝 Draft'}
                      </span>
                      {item.is_ai_generated && (
                        <span className="text-xs text-muted-foreground">🤖 AI</span>
                      )}
                      {item.is_affiliate && (
                        <span className="text-xs text-yellow-600">💰 Affiliate</span>
                      )}
                      <span className="text-xs text-muted-foreground">
                        {formatDate(item.created_at)}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-1 shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleTogglePublish(item)}
                      title={item.is_published ? 'Unpublish' : 'Publish'}
                    >
                      {item.is_published ? <EyeOff size={13} /> : <Eye size={13} />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleEdit(item)}
                      title="Edit"
                    >
                      <Edit size={13} />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(item.id)}
                      title="Delete"
                    >
                      <Trash2 size={13} />
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}