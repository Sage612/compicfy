import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const FREE_MODELS = [
  'meta-llama/llama-3.1-8b-instruct:free',
  'meta-llama/llama-3.2-3b-instruct:free',
  'meta-llama/llama-3.2-1b-instruct:free',
  'mistralai/mistral-7b-instruct:free',
  'google/gemma-2-9b-it:free',
  'google/gemma-3-1b-it:free',
  'google/gemma-3-4b-it:free',
  'qwen/qwen-2.5-7b-instruct:free',
  'qwen/qwen2.5-vl-3b-instruct:free',
  'deepseek/deepseek-r1-0528-qwen3-8b:free',
  'microsoft/phi-3-mini-128k-instruct:free',
  'huggingfaceh4/zephyr-7b-beta:free',
]

async function tryModel(model: string, prompt: string, apiKey: string): Promise<string | null> {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.com',
        'X-Title': 'Compicfy',
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 1024,
      }),
    })

    if (!response.ok) {
      console.warn(`Model ${model} failed with ${response.status}`)
      return null
    }

    const data = await response.json()
    const text = data.choices?.[0]?.message?.content ?? ''
    if (!text) return null

    return text
  } catch (err) {
    console.warn(`Model ${model} threw error:`, err)
    return null
  }
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

    const { article_text, source_url, source_name } = await request.json()

    if (!article_text?.trim()) {
      return NextResponse.json({ error: 'Article text required' }, { status: 400 })
    }

    if (!process.env.OPENROUTER_API_KEY) {
      return NextResponse.json({ error: 'OPENROUTER_API_KEY not set' }, { status: 500 })
    }

    const prompt = `You are a news editor for Compicfy, a manga/manhwa/webtoon community platform.

Summarise the following article. Return ONLY a raw JSON object with NO markdown, NO backticks, NO extra text — just the JSON:

{
  "title": "engaging headline under 100 chars",
  "excerpt": "2-3 sentence summary under 300 chars",
  "content": "3-4 paragraph article",
  "category": "one of: industry, release, adaptation, event, creator, announcement",
  "tags": ["tag1", "tag2", "tag3"]
}

Article:
${article_text.slice(0, 4000)}

Source: ${source_name ?? 'Unknown'} (${source_url ?? ''})`

    // Try each model in order until one works
    let rawText: string | null = null
    let usedModel = ''

    for (const model of FREE_MODELS) {
      console.log(`Trying model: ${model}`)
      rawText = await tryModel(model, prompt, process.env.OPENROUTER_API_KEY)
      if (rawText) {
        usedModel = model
        console.log(`Success with model: ${model}`)
        break
      }
    }

    if (!rawText) {
      return NextResponse.json(
        { error: 'All AI models failed. Try again later.' },
        { status: 500 }
      )
    }

    // Strip accidental markdown backticks
    const cleaned = rawText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

    let summary
    try {
      summary = JSON.parse(cleaned)
    } catch {
      const match = cleaned.match(/\{[\s\S]*\}/)
      if (!match) {
        console.error('Could not parse AI response:', cleaned)
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
      is_ai_generated: true,
      model_used: usedModel,
    })
  } catch (error) {
    console.error('Summarise error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to summarise' },
      { status: 500 }
    )
  }
}