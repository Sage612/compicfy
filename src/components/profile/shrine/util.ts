export const proxyCover = (url: string | null | undefined): string => {
  if (!url) return ''
  if (url.startsWith('/') || url.startsWith('blob:')) return url
  return `/api/image-proxy?url=${encodeURIComponent(url)}`
}

export function compact(n: number): string {
  if (n < 1000) return String(n)
  const k = n / 1000
  return `${k.toFixed(k < 10 ? 1 : 0).replace(/\.0$/, '')}k`
}