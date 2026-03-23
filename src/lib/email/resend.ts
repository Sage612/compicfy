import { Resend } from 'resend'

export const resend = new Resend(process.env.RESEND_API_KEY)
export const FROM = process.env.RESEND_FROM_EMAIL ?? 'onboarding@resend.dev'
export const SITE_NAME = process.env.NEXT_PUBLIC_SITE_NAME ?? 'Compicfy'
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://compicfy.cloud'