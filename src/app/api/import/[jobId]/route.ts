// src/app/api/import/[jobId]/route.ts
//
// GET /api/import/[jobId] — fetch a single import job's status/results.
// Since processing is currently inline (see the note in
// /api/import/list/route.ts), the POST response already contains the
// final result — this route exists so the UI can re-fetch a past job
// (e.g. after a page refresh) rather than losing the result.

import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

interface RouteContext {
  params: Promise<{ jobId: string }>
}

export async function GET(_req: Request, { params }: RouteContext) {
  const { jobId } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: job, error } = await supabase
    .from('import_jobs')
    .select('*')
    .eq('id', jobId)
    .eq('user_id', user.id)
    .single()

  if (error || !job) {
    return NextResponse.json({ error: 'Import job not found' }, { status: 404 })
  }

  return NextResponse.json({ job })
}