import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single() as { data: { role: string } | null }

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { article_text, source_url, source_name } = await request.json()
    if (!article_text?.trim()) {
      return NextResponse.json({ error: 'Article text required' }, { status: 400 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set in environment' }, { status: 500 })
    }

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY}`,
      },
      body: JSON.stringify({
        model: 'arcee-ai/arcee-trinity',
        max_tokens: 1024,
        messages: [
          {
            role: 'user',
            content: `You are a news editor for Compicfy, a manga/manhwa/webtoon community platform.
Summarise the following article into a news post. Return ONLY a raw JSON object with NO markdown, NO backticks, NO preamble — just the JSON:
{
  "title": "engaging headline under 100 chars",
  "excerpt": "2-3 sentence summary under 300 chars",
  "content": "3-4 paragraph article",
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
      console.error('OpenRouter API error:', errText)
      return NextResponse.json(
        { error: `AI API error: ${response.status}` },
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
        console.error('Could not parse AI response:', cleaned)
        return NextResponse.json({ error: 'AI returned invalid JSON' }, { status: 500 })
      }
      summary = JSON.parse(match[0])
    }

    return NextResponse.json({ summary, is_ai_generated: true })
  } catch (error) {
    console.error('Summarise error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to summarise' },
      { status: 500 }
    )
  }
}