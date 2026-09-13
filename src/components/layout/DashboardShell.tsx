'use client'

import { cn } from '@/lib/utils'
import type { CSSProperties, ReactNode } from 'react'

interface DashboardShellProps {
 
  sidebar: ReactNode

    children: ReactNode
 
  topOffset: string
  
  topOffsetLg?: string
  
  sidebarWidth?: string

    sidebarClassName?: string

    mainClassName?: string
}

export function DashboardShell({
  sidebar,
  children,
  topOffset,
  topOffsetLg,
  sidebarWidth = 'w-56',
  sidebarClassName,
  mainClassName,
}: DashboardShellProps) {
  const lgOffset = topOffsetLg ?? topOffset

  const shellStyle: CSSProperties & Record<string, string> = {
    '--dash-offset': topOffset,
    '--dash-offset-lg': lgOffset,
  }

  return (
    <div className="flex flex-1 min-h-0 dashboard-shell-row" style={shellStyle}>
     
      <aside
        className={cn(
          'dashboard-sidebar flex-col shrink-0 overflow-y-auto no-scrollbar dashboard-shell-aside',
          sidebarWidth,
          sidebarClassName,
        )}
      >
        {sidebar}
      </aside>

      <main
        className={cn(
          'dashboard-main flex-1 min-w-0 overflow-y-auto no-scrollbar pb-24 md:pb-0 dashboard-shell-main',
          mainClassName,
        )}
      >
        {children}
      </main>

      <style jsx>{`
        .dashboard-shell-row {
          padding-top: var(--dash-offset);
        }
        .dashboard-shell-aside {
          height: calc(100vh - var(--dash-offset));
          position: sticky;
          top: var(--dash-offset);
        }
        .dashboard-shell-main {
          height: calc(100vh - var(--dash-offset));
        }
        @media (min-width: 1024px) {
          .dashboard-shell-row {
            padding-top: var(--dash-offset-lg);
          }
          .dashboard-shell-aside {
            height: calc(100vh - var(--dash-offset-lg));
            top: var(--dash-offset-lg);
          }
          .dashboard-shell-main {
            height: calc(100vh - var(--dash-offset-lg));
          }
        }
      `}</style>
    </div>
  )
}