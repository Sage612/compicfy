import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { AffiliateClickPayload } from '@/types/affiliate.types';

export async function POST(request: Request) {
  try {
    const body: AffiliateClickPayload = await request.json();
    
    // Initialize Supabase admin client to bypass RLS for inserting tracking data
    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY! // Ensure you have this in .env.local
    );

    const ip = request.headers.get('x-forwarded-for') || 'unknown';
    const userAgent = request.headers.get('user-agent') || 'unknown';

    const { error } = await supabase
      .from('affiliate_clicks')
      .insert({
        comic_id: body.comicId,
        comic_title: body.comicTitle,
        platform: body.platform,
        product_type: body.productType,
        genre: body.genre,
        ip_address: ip,
        user_agent: userAgent,
      });

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Affiliate click tracking failed:', error);
    // Always return 200 so the user experience isn't interrupted by tracking failures
    return NextResponse.json({ success: false }, { status: 200 }); 
  }
}