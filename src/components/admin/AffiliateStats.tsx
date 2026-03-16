'use client';

import React, { useEffect, useState } from 'react';
import { AffiliateStats as AffiliateStatsType } from '@/types/affiliate.types';

export function AffiliateStats() {
  const [stats, setStats] = useState<AffiliateStatsType | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchStats() {
      try {
        const res = await fetch('/api/affiliate/stats');
        const data = await res.json();
        setStats(data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    }
    fetchStats();
  }, []);

  if (loading) return <div className="animate-pulse h-32 bg-muted rounded-md" />;
  if (!stats) return <div>Failed to load stats.</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 border rounded-lg bg-card text-card-foreground shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground">Total Clicks</h4>
          <p className="text-3xl font-bold mt-2">{stats.totalClicks}</p>
        </div>
        {/* Platform breakdown */}
        <div className="p-4 border rounded-lg bg-card md:col-span-2 shadow-sm">
          <h4 className="text-sm font-medium text-muted-foreground mb-4">Platform Breakdown</h4>
          <div className="flex gap-4 flex-wrap">
            {Object.entries(stats.platformBreakdown).map(([platform, count]) => (
              <div key={platform} className="bg-muted px-3 py-1.5 rounded-full text-sm">
                <span className="font-semibold">{platform}:</span> {count}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="bg-muted text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Comic</th>
              <th className="px-4 py-3 font-medium">Platform</th>
              <th className="px-4 py-3 font-medium">Time</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {stats.recentClicks.map((click) => (
              <tr key={click.id}>
                <td className="px-4 py-3 font-medium">{click.comic_title}</td>
                <td className="px-4 py-3">{click.platform}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(click.created_at).toLocaleString()}
                </td>
              </tr>
            ))}
            {stats.recentClicks.length === 0 && (
              <tr>
                <td colSpan={3} className="px-4 py-8 text-center text-muted-foreground">
                  No clicks recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}