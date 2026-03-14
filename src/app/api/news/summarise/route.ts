import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Strip HTML tags and collapse whitespace to get clean article text
function stripHtml(html: string): string {
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')   // remove scripts
    .replace(/<style[\s\S]*?<\/style>/gi, '')      // remove styles
    .replace(/<nav[\s\S]*?<\/nav>/gi, '')          // remove nav
    .replace(/<header[\s\S]*?<\/header>/gi, '')    // remove header
    .replace(/<footer[\s\S]*?<\/footer>/gi, '')    // remove footer
    .replace(/<[^>]+>/g, ' ')                      // strip remaining tags
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s{2,}/g, ' ')                       // collapse whitespace
    .trim()
}

// Try to extract og:image or first large image from HTML
function extractImage(html: string): string | null {
  const ogImage = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
  return ogImage?.[1] ?? null
}

// Try to extract og:title
function extractTitle(html: string): string | null {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)
    ?? html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i)
  if (ogTitle?.[1]) return ogTitle[1]
  const titleTag = html.match(/<title[^>]*>([^<]+)<\/title>/i)
  return titleTag?.[1]?.trim() ?? null
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await (supabase as any)
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const body = await request.json()

    // Support both old shape { article_text, source_url, source_name }
    // and new shape { url } sent by NewsManager
    let article_text: string = body.article_text ?? ''
    let source_url: string   = body.source_url ?? body.url ?? ''
    let source_name: string  = body.source_name ?? ''
    let image_url: string | null = null

    // If we only got a URL (no article_text), fetch and extract the text server-side
    if (!article_text.trim() && source_url.trim()) {
      try {
        const fetchRes = await fetch(source_url, {
          headers: {
            // Pretend to be a browser so sites don't block us
            'User-Agent': 'Mozilla/5.0 (compatible; Compicfy/1.0; +https://compicfy.com)',
            'Accept': 'text/html,application/xhtml+xml',
          },
          signal: AbortSignal.timeout(10000), // 10s timeout
        })

        if (!fetchRes.ok) {
          return NextResponse.json(
            { error: `Could not fetch article (${fetchRes.status}). Try pasting the article text manually.` },
            { status: 400 }
          )
        }

        const contentType = fetchRes.headers.get('content-type') ?? ''
        if (!contentType.includes('text/html')) {
          return NextResponse.json(
            { error: 'URL does not point to an HTML page. Try pasting the article text manually.' },
            { status: 400 }
          )
        }

        const html = await fetchRes.text()

        // Extract metadata
        image_url   = extractImage(html)
        source_name = source_name || (new URL(source_url).hostname.replace('www.', ''))

        // Extract clean text
        article_text = stripHtml(html)

        if (!article_text.trim()) {
          return NextResponse.json(
            { error: 'Could not extract text from URL. Try pasting the article text manually.' },
            { status: 400 }
          )
        }
      } catch (fetchErr: any) {
        console.error('Article fetch error:', fetchErr)
        return NextResponse.json(
          { error: 'Could not reach the URL. Check it is publicly accessible or paste the article text manually.' },
          { status: 400 }
        )
      }
    }

    if (!article_text.trim()) {
      return NextResponse.json({ error: 'Article text or URL required' }, { status: 400 })
    }

    if (!process.env.GROQ_API_KEY) {
      return NextResponse.json({ error: 'GROQ_API_KEY not configured' }, { status: 500 })
    }

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        max_tokens: 1024,
        messages: [
          {
            role: 'system',
            content: 'You are a news editor for Compicfy, a manga/manhwa/webtoon community platform. You only respond with raw JSON, no markdown, no backticks, no extra text.',
          },
          {
            role: 'user',
            content: `Summarise the following article into a news post for the Compicfy community.

Return ONLY this raw JSON structure with no extra text:

{
  "title": "engaging headline under 100 chars",
  "excerpt": "2-3 sentence summary under 300 chars",
  "content": "3-4 paragraph article written for manga/comic fans",
  "category": "one of: industry, release, adaptation, event, creator, announcement",
  "tags": ["tag1", "tag2", "tag3"]
}

Article:
${article_text.slice(0, 4000)}

Source: ${source_name ?? 'Unknown'} (${source_url ?? ''})`,
          },
        ],
      }),
    })

    if (!response.ok) {
      const errText = await response.text()
      console.error('Groq error:', errText)
      return NextResponse.json(
        { error: `Groq API error: ${response.status} — ${errText}` },
        { status: 500 }
      )
    }

    const aiData = await response.json()
    const text = aiData.choices?.[0]?.message?.content ?? ''

    if (!text) {
      return NextResponse.json({ error: 'Empty AI response' }, { status: 500 })
    }

    const cleaned = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let summary
    try {
      summary = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) {
        console.error('Could not parse Groq response:', cleaned)
        return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
      }
      try {
        summary = JSON.parse(match[0])
      } catch {
        return NextResponse.json({ error: 'AI returned malformed JSON' }, { status: 500 })
      }
    }

    return NextResponse.json({
      summary,
      image_url,      // og:image extracted from the article page
      is_ai_generated: true,
      model_used: 'llama-3.1-8b-instant',
    })
  } catch (error) {
    console.error('Summarise error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to summarise' },
      { status: 500 }
    )
  }
}