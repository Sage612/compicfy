import { NextResponse } from 'next/server'
import { aggregateSearch } from '@/lib/search/mangaAggregator'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const query = searchParams.get('q')?.trim()

  if (!query || query.length < 2) {
    return NextResponse.json({ results: [] })
  }

  try {
    const results = await aggregateSearch(query, 12)
    return NextResponse.json({ results })
  } catch {
    return NextResponse.json({ results: [] })
  }
}