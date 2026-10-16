import { z } from 'zod'
import { validatePlatformLink } from '@/lib/utils/platformLinks'

export const recommendationBaseSchema = z.object({
  title: z.string().min(1, 'Title is required').max(200),
  description: z.string().min(10, 'At least 10 characters').max(2000),
  type: z.enum(['manga', 'manhwa', 'manhua', 'webtoon', 'comic', 'other']),
  status: z.enum(['ongoing', 'completed', 'hiatus', 'cancelled']),
  genres: z.array(z.string()).min(1, 'Select at least one genre').max(5),
  official_platforms: z.array(z.string()).min(1, 'Select at least one platform'),
  official_links: z.array(z.string()).default([]),
  cover_url: z.string().default(''),
  // Optional wide image shown at the top of the comic page. '' clears it.
  banner_url: z.string().max(2000).optional().transform(v => (v === undefined ? undefined : (v.trim() || null))),
  content_rating: z.enum(['all_ages', 'teen', 'mature', 'adult']).default('all_ages'),
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
  
  more_info_link: z.string().max(500).default('').refine(
    (val) => !val || /^https?:\/\/.+/.test(val),
    { message: 'Must be a valid URL starting with http:// or https://' }
  ),
})

function refineOfficialLinks(
  data: { official_links?: string[]; official_platforms?: string[] },
  ctx: z.RefinementCtx,
) {
  const links     = data.official_links     ?? []
  const platforms = data.official_platforms ?? []

  links.forEach((link, i) => {
    if (!link || !link.trim()) return // empty is allowed, link is optional
    const result = validatePlatformLink(link)
    if (!result.valid) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: result.reason ?? 'Invalid platform link',
        path: ['official_links', i],
      })
    }
  })

  if (data.official_links !== undefined && data.official_platforms !== undefined) {
    if (links.length > platforms.length) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'official_links cannot have more entries than official_platforms',
        path: ['official_links'],
      })
    }
  }
}

export const recommendationSchema = recommendationBaseSchema
  .superRefine(refineOfficialLinks)

export const recommendationPatchSchema = recommendationBaseSchema
  .partial()
  .superRefine(refineOfficialLinks)

export const reviewSchema = z.object({
  content: z.string().min(3, 'Review must be at least 3 characters').max(1000),
  rating: z
    .union([z.number().min(1).max(5), z.null()])
    .optional()
    .transform((val) => val ?? null),
  contains_spoilers: z.boolean().default(false),
})

export const profileSchema = z.object({
  username: z.string().min(3).max(30).regex(/^[a-zA-Z0-9_]+$/),
  display_name: z.string().max(50).optional(),
  bio: z.string().max(500).optional(),
  website: z.string().url().optional().or(z.literal('')),
  favorite_genres: z.array(z.string()).max(10).optional(),
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