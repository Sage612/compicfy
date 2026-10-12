'use client'

// Instant tabs. Every panel is rendered by the server up front and only
// shown/hidden here, so clicking a tab never navigates, fetches or flashes:
// the content is already on the page. The URL is updated in place
// (?tab=...) so a refresh or a shared link lands on the same tab.

import { useState, type KeyboardEvent, type ReactNode } from 'react'

export interface ShrineTab {
  id:      string
  label:   string
  content: ReactNode
}

interface Props {
  tabs:     ShrineTab[]
  initial?: string
}

export function ShrineTabs({ tabs, initial }: Props) {
  const [active, setActive] = useState<string>(() =>
    tabs.some(t => t.id === initial) ? (initial as string) : tabs[0].id,
  )

  function select(id: string) {
    setActive(id)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('tab', id)
      window.history.replaceState(window.history.state, '', url)
    } catch { /* non-critical */ }
  }

  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.findIndex(t => t.id === active)
    if (e.key === 'ArrowRight')      select(tabs[(i + 1) % tabs.length].id)
    else if (e.key === 'ArrowLeft')  select(tabs[(i - 1 + tabs.length) % tabs.length].id)
    else return
    e.preventDefault()
  }

  return (
    <>
      {tabs.length > 1 && (
      <div className="sh-tabs" role="tablist" onKeyDown={onKeyDown}>
        {tabs.map(t => (
          <button
            key={t.id}
            id={`sh-tab-${t.id}`}
            type="button"
            role="tab"
            aria-selected={active === t.id}
            aria-controls={`sh-panel-${t.id}`}
            tabIndex={active === t.id ? 0 : -1}
            className="sh-tab"
            onClick={() => select(t.id)}
          >
            {t.label}
          </button>
        ))}
      </div>
      )}

      {tabs.map(t => (
        <div
          key={t.id}
          id={`sh-panel-${t.id}`}
          role="tabpanel"
          aria-labelledby={`sh-tab-${t.id}`}
          hidden={active !== t.id}
          className="sh-panel"
        >
          {t.content}
        </div>
      ))}
    </>
  )
}