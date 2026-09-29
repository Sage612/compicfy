import { NextResponse } from 'next/server';
import { requireRole } from '@/lib/utils/requireRole'

// FIX: this route previously had NO auth check at all, and used the
// SERVICE ROLE key (which bypasses RLS entirely) to dump every row of
// affiliate_clicks. Anyone hitting /api/affiliate/stats got raw click
// data with zero login required. Now gated to admin/moderator and
// using the normal request-scoped client (no more RLS bypass).
export async function GET() {
  const auth = await requireRole(false) // admin or moderator
  if (auth.error) return auth.error
  const { supabase } = auth

  try {
    const { data: clicks, error } = await supabase!
      .from('affiliate_clicks')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) throw error;

    const totalClicks = clicks.length;
    const platformBreakdown = clicks.reduce((acc: Record<string, number>, curr: any) => {
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
