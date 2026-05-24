import Link from 'next/link'
import { ShoppingBag } from 'lucide-react'

function LogoMark({ className }: { className?: string }) {
  return (
    <svg 
      viewBox="0 0 44 44" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className} 
      aria-hidden="true"
    >
      {/* Speech bubble body */}
      <rect x="2" y="2" width="36" height="30" rx="8" className="fill-[#0ea5b0]" />
      {/* Bubble tail */}
      <path d="M9 32 L5 43 L20 33.5" className="fill-[#0ea5b0]" />
      {/* C letterform - Always dark per brand guidelines */}
      <path 
        d="M28 11.5 C25 9 19.5 9 16.5 12 C13.5 15 13.5 20.5 16.5 23.5 C19.5 26.5 25 26.5 28 24"
        stroke="#111111" strokeWidth="3.5" strokeLinecap="round" fill="none"
      />
      {/* Period after C - Always dark per brand guidelines */}
      <circle cx="30" cy="24.5" r="2.2" fill="#111111" />
    </svg>
  )
}

const footerLinks = {
  Discover: [
    { label: 'Browse Comics', href: '/browse'               },
    { label: 'Collections',   href: '/collections'          },
    { label: 'News',          href: '/news'                 },
    { label: 'Shop & Merch',  href: '/affiliate'            },
    { label: 'Trending',      href: '/browse?sort=trending' },
    { label: 'New Releases',  href: '/browse?sort=recent'   },
  ],
  Community: [
    { label: 'About',                href: '/about'                                  },
    { label: 'FAQ',                  href: '/faq'                                    },
    { label: 'Community Guidelines', href: '/guidelines'                             },
    { label: 'Recommend a Comic',    href: '/reader/dashboard/recommendations/new'   },
    { label: 'Discord',              href: 'https://discord.gg/7WPGMb696N'          },
  ],
  Legal: [
    { label: 'Disclaimer',    href: '/disclaimer' },
    { label: 'Terms',         href: '/terms'      },
    { label: 'Privacy Policy',href: '/privacy'    },
    { label: 'Cookies',       href: '/cookies'    },
    { label: 'DMCA',          href: '/dmca'       },
  ],
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-[#0ea5b0]/4 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 pt-14 pb-12 sm:pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-10">

          {/* Brand column - No background box, tail is visible */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <LogoMark className="w-7 h-7" />
              <span className="font-black text-[15px] tracking-tight text-foreground group-hover:text-[#0ea5b0] transition-colors">
                Compic<span className="text-[#0ea5b0]">fy</span>
              </span>
            </Link>

            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              The place where comic fans tell each other what to read next.
            </p>

            <Link
              href="/affiliate"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-border/60 transition-colors"
            >
              <ShoppingBag size={12} />
              Shop Merch
            </Link>

            <Link
              href="https://discord.gg/7WPGMb696N"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-border text-muted-foreground text-xs font-semibold hover:text-foreground hover:border-border/60 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Join Discord
            </Link>
          </div>

          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={`${category}-${href}`}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground hover:translate-x-0.5 inline-block transition-all duration-150"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Affiliate disclosure */}
        <div className="mb-8 p-3 rounded-xl bg-muted/40 border border-border">
          <p className="text-[10px] text-muted-foreground leading-relaxed text-center sm:text-left">
            Some links on Compicfy are affiliate links. We may earn a small commission if you purchase
            through them, at no extra cost to you. We only link to official retailers and licensed platforms.
          </p>
        </div>

        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col gap-1 text-[11px] text-muted-foreground sm:flex-row sm:justify-between sm:items-center">
          <p className="text-center sm:text-left leading-relaxed">
            &copy; {new Date().getFullYear()} Compicfy. All rights reserved.
            <span className="block sm:inline sm:ml-1">We do not host or link to pirated content.</span>
          </p>
          <p className="text-center sm:text-right text-muted-foreground/50 text-[10px]">
            Comics only. No piracy. Ever.
          </p>
        </div>
      </div>
    </footer>
  )
}