import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID!
const CLIENT_EMAIL = process.env.FIREBASE_CLIENT_EMAIL!
const PRIVATE_KEY = (process.env.FIREBASE_PRIVATE_KEY ?? '').replace(/\\n/g, '\n')

// Get Firebase Admin access token via service account
async function getAccessToken(): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const header = { alg: 'RS256', typ: 'JWT' }
  const payload = {
    iss: CLIENT_EMAIL,
    sub: CLIENT_EMAIL,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600,
    scope: 'https://www.googleapis.com/auth/firebase.messaging',
  }

  const encode = (obj: object) =>
    btoa(JSON.stringify(obj)).replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const headerB64  = encode(header)
  const payloadB64 = encode(payload)
  const signingInput = `${headerB64}.${payloadB64}`

  // Import private key
  const keyData = PRIVATE_KEY
    .replace('-----BEGIN PRIVATE KEY-----', '')
    .replace('-----END PRIVATE KEY-----', '')
    .replace(/\s/g, '')

  const binaryKey = Uint8Array.from(atob(keyData), c => c.charCodeAt(0))
  const cryptoKey = await crypto.subtle.importKey(
    'pkcs8',
    binaryKey,
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  )

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    cryptoKey,
    new TextEncoder().encode(signingInput)
  )

  const sigB64 = btoa(String.fromCharCode(...new Uint8Array(signature)))
    .replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_')

  const jwt = `${signingInput}.${sigB64}`

  // Exchange JWT for access token
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion:  jwt,
    }),
  })

  const tokenData = await tokenRes.json()
  return tokenData.access_token
}

export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization')
    const secret     = process.env.INTERNAL_API_SECRET
    if (secret && authHeader !== `Bearer ${secret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { user_id, title, body, url, icon } = await req.json()

    if (!user_id || !title) {
      return NextResponse.json({ error: 'user_id and title required' }, { status: 400 })
    }

    // Get all FCM tokens for this user
    const { data: subs } = await supabase
      .from('push_subscriptions')
      .select('endpoint')
      .eq('user_id', user_id)

    if (!subs || subs.length === 0) {
      return NextResponse.json({ sent: 0 })
    }

    const accessToken = await getAccessToken()
    const expired: string[] = []
    let sent = 0

    await Promise.allSettled(
      subs.map(async (sub) => {
        const token = sub.endpoint

        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${PROJECT_ID}/messages:send`,
          {
            method: 'POST',
            headers: {
              'Content-Type':  'application/json',
              'Authorization': `Bearer ${accessToken}`,
            },
            body: JSON.stringify({
              message: {
                token,
                notification: {
                  title,
                  body:  body  ?? '',
                  image: icon  ?? undefined,
                },
                webpush: {
                  notification: {
                    title,
                    body:    body  ?? '',
                    icon:    icon  ?? '/icons/icon-192.png',
                    badge:         '/icons/badge-72.png',
                    tag:           'compicfy-notification',
                    renotify: true,
                    vibrate: [100, 50, 100],
                  },
                  fcmOptions: {
                    link: `${process.env.NEXT_PUBLIC_SITE_URL}${url ?? '/'}`,
                  },
                },
              },
            }),
          }
        )

        const data = await res.json()

        if (!res.ok) {
          const errCode = data?.error?.details?.[0]?.errorCode
          if (errCode === 'UNREGISTERED' || errCode === 'INVALID_ARGUMENT') {
            expired.push(token)
          }
          console.error('FCM send error:', data)
        } else {
          sent++
        }
      })
    )

    // Clean up expired tokens
    if (expired.length > 0) {
      await supabase
        .from('push_subscriptions')
        .delete()
        .in('endpoint', expired)
    }

    return NextResponse.json({ sent, expired: expired.length })
  } catch (err: any) {
    console.error('Push send error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}