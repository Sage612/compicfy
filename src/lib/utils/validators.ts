import { z } from 'zod'

export const recommendationSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'At least 10 characters').max(2000),
  type: z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  cover_url: z.string().default(''),
  content_rating: z.enum(['all', 'teen', 'mature', 'adult']).default('all'),
  why_recommend: z.string().max(1000).default(''),
  author: z.string().max(100).default(''),
  artist: z.string().max(100).default(''),
  year_released: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1900).max(new Date().getFullYear() + 1).optional()
  ),
  chapter_count: z.preprocess(
    (val) => (val === '' || val === null || val === undefined ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
})

export const reviewSchema = z.object({
  content: z.string().min(3, 'Review must be at least 3 characters').max(1000),
  rating: z.number().min(1).max(5).optional(),
  contains_spoilers: z.boolean().default(false),
})

export const profileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  display_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  favorite_genres: z.array(z.string()).max(10).optional(),
  show_mature_content: z.boolean().default(false),
})
export const newsSchema = z.object({
  title: z.string().min(1).max(200),
  excerpt: z.string().min(10).max(500),
  content: z.string().optional().default(''),
  source_name: z.string().min(1),
  source_url: z.string().url(),
  category: z.enum(['industry', 'release', 'adaptation', 'event', 'creator', 'announcement']),
  cover_url: z.string().optional().default(''),
  is_affiliate: z.boolean().default(false),
  affiliate_url: z.string().optional().default(''),
  affiliate_disclaimer: z.string().optional().default(''),
  tags: z.array(z.string()).optional().default([]),
})