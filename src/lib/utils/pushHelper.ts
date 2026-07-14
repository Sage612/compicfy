export async function sendPushForUser(
  userId: string,
  title:  string,
  body:   string,
  url:    string,
): Promise<void> {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_APP_URL ?? 'http://compicfy.com'
    await fetch(`${baseUrl}/api/push/send`, {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        ...(process.env.INTERNAL_API_SECRET
          ? { authorization: `Bearer ${process.env.INTERNAL_API_SECRET}` }
          : {}),
      },
      body: JSON.stringify({ user_id: userId, title, body, url }),
    })
  } catch (err) {
    console.error('sendPushForUser error (non-fatal):', err)
  }
}