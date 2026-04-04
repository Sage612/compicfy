export const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY!
export const PAYSTACK_PUBLIC_KEY = process.env.NEXT_PUBLIC_PAYSTACK_PUBLIC_KEY!

export const PAYSTACK_PLANS = {
  monthly: {
    amount: 499,  // $4.99 in cents (499 * 100) OR ₦4,999 in kobo
    label: 'Pro Monthly',
    interval: 'monthly',
  },
  yearly: {
    amount: 3999, // $39.99 in cents (3999 * 100) OR ₦39,999 in kobo
    label: 'Pro Yearly',
    interval: 'annually',
  },
} as const

export const PAYSTACK_BASE_URL = 'https://api.paystack.co'

export async function paystackRequest(
  endpoint: string,
  method: 'GET' | 'POST' | 'PUT' = 'GET',
  body?: Record<string, unknown>
) {
  const res = await fetch(`${PAYSTACK_BASE_URL}${endpoint}`, {
    method,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

  const data = await res.json()

  if (!res.ok) {
    throw new Error(data.message ?? 'Paystack request failed')
  }

  return data
}