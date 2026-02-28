import { AdminReports } from '@/components/admin/AdminReports'

import type { Metadata } from 'next'

export const metadata: Metadata  = { title: 'Reports' }

export default function AdminReportsPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Reports</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Handle community reports and content flags
        </p>
      </div>
      <AdminReports />
    </div>
  )
}