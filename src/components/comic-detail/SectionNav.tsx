// src/components/comic-detail/SectionNav.tsx
// A row of jump links under the action bar. Everything is already on the page,
// so nothing hides behind a tab: these just scroll to the section.

export interface NavItem { id: string; label: string }

export function SectionNav({ items }: { items: NavItem[] }) {
  return (
    <nav aria-label="Sections" className="-mx-4 px-4 border-y border-dossier-foreground/10 overflow-x-auto no-scrollbar">
      <ul className="flex items-center gap-6 min-w-max">
        {items.map(item => (
          <li key={item.id}>
            <a
              href={`#${item.id}`}
              className="block py-3 font-[family-name:var(--font-mono)] font-medium text-[11px] uppercase tracking-[0.18em] text-dossier-foreground/72 hover:text-dossier-foreground transition-colors"
            >
              {item.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  )
}