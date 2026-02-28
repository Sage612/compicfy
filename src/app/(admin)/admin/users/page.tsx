import { AdminUsers } from '@/components/admin/AdminUsers'

import type { Metadata } from 'next'

export const metadata: Metadata =  { title: 'Manage Users' }

export default function AdminUsersPage() {
  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Users</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Manage users, roles, bans, and appeals
        </p>
      </div>
      <AdminUsers />
    </div>
  )
}