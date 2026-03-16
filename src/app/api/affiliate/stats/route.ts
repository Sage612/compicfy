import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

export async function GET() {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  try {
    const { data: clicks, error } = await supabase
      .from('affiliate_clicks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalClicks = clicks.length;
    const platformBreakdown = clicks.reduce((acc, curr) => {
      acc[curr.platform] = (acc[curr.platform] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return NextResponse.json({
      totalClicks,
      platformBreakdown,
      recentClicks: clicks.slice(0, 10) // Top 10 recent
    });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch stats' }, { status: 500 });
  }
}