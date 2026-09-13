import { siWebtoon, siCrunchyroll } from 'simple-icons'

// ── Tier 1: real brand SVG marks, sourced from the `simple-icons` package ──
// (npm i simple-icons — MIT/CC0, ~3000 verified brand icons with official
// colors). Only platforms actually present in that package can go here.
// Confirmed present as of writing: Webtoon, Crunchyroll (covers "Crunchyroll
// Manga" in your PLATFORMS list).
export const PLATFORM_SVG_ICONS: Record<string, { path: string; hex: string }> = {
  webtoon:             { path: siWebtoon.path,     hex: `#${siWebtoon.hex}` },
  'crunchyroll manga': { path: siCrunchyroll.path, hex: `#${siCrunchyroll.hex}` },
}

// ── Tier 2: everything else in your PLATFORMS list — colored monogram ──
// No official logo asset used here (avoids trademark/accuracy risk from
// hand-drawing marks I haven't verified). Colors are a brand-adjacent guess,
// not sourced from each platform's actual style guide — treat as a starting
// point, swap freely.
export const PLATFORM_MONOGRAMS: Record<string, { bg: string; fg: string }> = {
  tapas:           { bg: '#FF5E5E', fg: '#500' },
  tappytoon:       { bg: '#7C4DFF', fg: '#fff' },
  'viz media':     { bg: '#E4002B', fg: '#fff' },
  manta:           { bg: '#FF4D6D', fg: '#fff' },
  webcomics:       { bg: '#3D5AFE', fg: '#fff' },
  lezhin:          { bg: '#111111', fg: '#fff' },
  mangatoon:       { bg: '#FFB300', fg: '#402d00' },
  webnovel:        { bg: '#1B6FE0', fg: '#fff' },
  'pocket comics': { bg: '#FF6F91', fg: '#500' },
  toomics:         { bg: '#FF3D57', fg: '#fff' },
  toptoon:         { bg: '#00B4D8', fg: '#003340' },
  daycomics:       { bg: '#6C5CE7', fg: '#fff' },
  mangaplus:       { bg: '#DA291C', fg: '#fff' },
  inkr:            { bg: '#22223B', fg: '#fff' },
}

export interface ResolvedPlatformIcon {
  kind: 'svg' | 'monogram' | 'none'
  path?: string
  hex?: string
  bg?: string
  fg?: string
  letter?: string
}

export function resolvePlatformIcon(platformName: string): ResolvedPlatformIcon {
  const key = platformName.trim().toLowerCase()

  const svg = PLATFORM_SVG_ICONS[key]
  if (svg) return { kind: 'svg', path: svg.path, hex: svg.hex }

  const mono = PLATFORM_MONOGRAMS[key]
  if (mono) return { kind: 'monogram', bg: mono.bg, fg: mono.fg, letter: platformName.charAt(0).toUpperCase() }

  return { kind: 'none' }
}