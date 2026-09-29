import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { enforceProFeature } from '@/lib/utils/proEnforce'

// Define the interface for the list data
interface ReadingList {
  id: string
  name: string
  description: string | null
}

// FIX: CSV formula injection guard. A comic title/author/genre starting
// with =, +, -, or @ can be interpreted as a formula by Excel/Sheets when
// the CSV is opened, potentially running an attacker-controlled formula
// (e.g. one that shells out or exfiltrates data via a remote fetch/HYPERLINK).
// Prefixing with a single quote neutralizes this in every major spreadsheet app.
function csvSafe(value: string): string {
  if (/^[=+\-@]/.test(value)) {
    return `'${value}`
  }
  return value
}

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Enforce Pro access
    const { allowed, error: proError } = await enforceProFeature(user.id, 'export_lists')
    if (!allowed) return proError!

    const { searchParams } = new URL(req.url)
    const listId = searchParams.get('list_id')
    const format = searchParams.get('format') as 'csv' | 'pdf'

    if (!listId || !format) {
      return NextResponse.json({ error: 'list_id and format required' }, { status: 400 })
    }

    // Verify list belongs to user with explicit typing
    const { data: listData } = await supabase
      .from('reading_lists')
      .select('id, name, description')
      .eq('id', listId)
      .eq('user_id', user.id)
      .single()

    if (!listData) return NextResponse.json({ error: 'List not found' }, { status: 404 })
    
    // Cast the data so TypeScript recognizes the properties
    const list = listData as ReadingList

    // Get list items with rec details
    const { data: items } = await supabase
      .from('reading_list_items')
      .select('status, added_at, recommendations(title, type, status, genres, author, official_platforms)')
      .eq('list_id', listId)
      .order('added_at', { ascending: false })

    if (!items || items.length === 0) {
      return NextResponse.json({ error: 'List is empty' }, { status: 400 })
    }

    if (format === 'csv') {
      const headers = ['Title', 'Type', 'Status', 'Genres', 'Author', 'Platforms', 'Reading Status', 'Added']
      const rows = items.map((item: any) => {
        const rec = item.recommendations
        return [
          `"${csvSafe(rec?.title ?? '')}"`,
          csvSafe(rec?.type ?? ''),
          csvSafe(rec?.status ?? ''),
          `"${csvSafe((rec?.genres ?? []).join(', '))}"`,
          `"${csvSafe(rec?.author ?? '')}"`,
          `"${csvSafe((rec?.official_platforms ?? []).join(', '))}"`,
          csvSafe(item.status ?? ''),
          item.added_at ? new Date(item.added_at).toLocaleDateString() : '',
        ].join(',')
      })

      const csv = [headers.join(','), ...rows].join('\n')

      return new NextResponse(csv, {
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': `attachment; filename="${list.name}-ComPicfy.csv"`,
        },
      })
    }

    if (format === 'pdf') {
      // Simple HTML-based PDF via browser print
      const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${list.name} — ComPicfy</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 800px; margin: 0 auto; padding: 40px 20px; color: #1a1a1a; }
    h1 { font-size: 24px; font-weight: 900; margin-bottom: 4px; }
    .meta { color: #666; font-size: 13px; margin-bottom: 32px; }
    .item { display: flex; gap: 16px; padding: 12px 0; border-bottom: 1px solid #eee; }
    .num { font-size: 18px; font-weight: 900; color: #ccc; width: 28px; shrink: 0; }
    .info { flex: 1; }
    .title { font-weight: 700; font-size: 14px; }
    .details { font-size: 12px; color: #666; margin-top: 2px; }
    .badge { display: inline-block; padding: 2px 8px; border-radius: 99px; font-size: 10px; font-weight: 700; background: #f0f0f0; margin-right: 4px; text-transform: capitalize; }
    .footer { margin-top: 40px; font-size: 11px; color: #999; text-align: center; }
  </style>
</head>
<body>
  <h1>${list.name}</h1>
  <p class="meta">${list.description ?? ''} · ${items.length} comics · Exported from ComPicfy on ${new Date().toLocaleDateString()}</p>
  ${items.map((item: any, i: number) => {
    const rec = item.recommendations
    return `
    <div class="item">
      <div class="num">#${i + 1}</div>
      <div class="info">
        <div class="title">${rec?.title ?? 'Unknown'}</div>
        <div class="details">
          <span class="badge">${rec?.type ?? ''}</span>
          <span class="badge">${rec?.status ?? ''}</span>
          ${rec?.author ? `<span class="badge">${rec.author}</span>` : ''}
          ${(rec?.genres ?? []).slice(0, 3).map((g: string) => `<span class="badge">${g}</span>`).join('')}
        </div>
        ${(rec?.official_platforms ?? []).length > 0 ? `<div class="details" style="margin-top:4px">Read on: ${rec.official_platforms.join(', ')}</div>` : ''}
      </div>
    </div>`
  }).join('')}
  <div class="footer">Generated by ComPicfy Pro · compicfy.com</div>
</body>
</html>`

      return new NextResponse(html, {
        headers: {
          'Content-Type': 'text/html',
          'Content-Disposition': `attachment; filename="${list.name}-ComPicfy.html"`,
        },
      })
    }

    return NextResponse.json({ error: 'Invalid format' }, { status: 400 })
  } catch (error) {
    console.error('Export error:', error)
    return NextResponse.json({ error: 'Export failed' }, { status: 500 })
  }
}
