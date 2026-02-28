import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MODELS = [
  'meta-llama/llama-3.3-8b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-3-4b-it:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'qwen/qwen-2.5-7b-instruct:free',
]

async function callOpenRouter(prompt: string): Promise<string> {
  for (const model of MODELS) {
    try {
      const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENROUTER_API_KEY!}`,
          'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000/',
          'X-Title': 'Compicfy',
        },
        body: JSON.stringify({
          model,
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        }),
      })

      if (!response.ok) continue

      const data = await response.json()
      const text = data.choices?.[0]?.message?.content
      if (text) return text
    } catch {
      continue
    }
  }
  throw new Error('All models failed')
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profileData } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const profile = profileData as { role: string } | null

    if (!profile || !['admin', 'moderator'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { article_text, source_url, source_name } = await request.json()

    if (!article_text) {
      return NextResponse.json({ error: 'Article text required' }, { status: 400 })
    }

    const prompt = `You are a news editor for Compicfy, a manga/manhwa/webtoon community platform.

Summarise the following article into a news post for our community. Return ONLY valid JSON with these exact fields:
{
  "title": "engaging headline under 100 chars",
  "excerpt": "2-3 sentence summary under 300 chars",
  "content": "3-4 paragraph article in markdown format",
  "category": "one of: industry|release|adaptation|event|creator|announcement",
  "tags": ["tag1", "tag2", "tag3"]
}

Article text:
${article_text.slice(0, 4000)}

Source: ${source_name ?? 'Unknown'} (${source_url ?? ''})`

    const text = await callOpenRouter(prompt)

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('Invalid AI response')

    const summary = JSON.parse(jsonMatch[0])

    return NextResponse.json({ summary, is_ai_generated: true })
  } catch (error) {
    console.error('Summarise error:', error)
    return NextResponse.json({ error: 'Failed to summarise article' }, { status: 500 })
  }
}