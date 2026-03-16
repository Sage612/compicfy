import { createClient } from '@supabase/supabase-js'; // Or your specific Supabase client import

export async function isAffiliateEnabled(): Promise<boolean> {
  // 1. Check local environment variable first (fastest)
  if (process.env.NEXT_PUBLIC_ENABLE_AFFILIATE === 'false') {
    return false;
  }
  if (process.env.NEXT_PUBLIC_ENABLE_AFFILIATE === 'true') {
    return true; 
  }
  
  // 2. Fallback to Database flag if env var is not explicitly set
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const supabase = createClient(supabaseUrl, supabaseKey);
    
    const { data } = await supabase
      .from('feature_flags')
      .select('enabled')
      .eq('name', 'affiliate_links')
      .single();
      
    return data?.enabled || false;
  } catch (error) {
    console.error('Failed to fetch feature flag:', error);
    return false;
  }
}