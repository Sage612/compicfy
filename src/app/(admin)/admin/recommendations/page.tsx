import { AdminRecommendations } from '@/components/admin/AdminRecommendations'
import type { Metadata } from 'next'

export const metadata: Metadata =  { title: 'Manage Recommendations' }

export default function AdminRecommendationsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Recommendations</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Approve, reject, feature, and edit community recommendations
        </p>
      </div>
      <AdminRecommendations />
    </div>
  )
}