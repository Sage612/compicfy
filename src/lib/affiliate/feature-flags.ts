import { createClient } from '@/lib/supabase/server'

export async function isAffiliateEnabled(): Promise<boolean> {
  // Env var takes priority — set to 'true' or 'false' in .env.local
  if (process.env.NEXT_PUBLIC_ENABLE_AFFILIATE === 'false') return false
  if (process.env.NEXT_PUBLIC_ENABLE_AFFILIATE === 'true') return true

  // Fallback: check database flag
  try {
    const supabase = await createClient()
    const { data } = await (supabase as any)
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'affiliate_links')
      .single()

    return data?.enabled ?? false
  } catch {
    return false
  }
}