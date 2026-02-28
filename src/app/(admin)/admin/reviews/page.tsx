import { AdminReviews } from '@/components/admin/AdminReviews'

import type { Metadata } from 'next'

export const metadata: Metadata =  { title: 'Manage Reviews' }

export default function AdminReviewsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reviews</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Moderate user reviews
        </p>
      </div>
      <AdminReviews />
    </div>
  )
}