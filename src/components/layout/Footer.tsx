import Link from 'next/link'
import { BookOpen } from 'lucide-react'

const footerLinks = {
  Discover: [
    { label: 'Browse Comics',  href: '/browse'              },
    { label: 'News',           href: '/news'                },
    { label: 'Trending',       href: '/browse?sort=trending' },
    { label: 'New Releases',   href: '/browse?sort=recent'  },
  ],
  Community: [
    { label: 'Community Guidelines', href: '/guidelines'                         },
    { label: 'Submit a Comic',       href: '/dashboard/recommendations/new'      },
    { label: 'Discord',              href: 'https://discord.gg/7WPGMb696N'       },
  ],
  Legal: [
    {label:'Disclaimer', href: '/disclaimer' },
    { label: 'About',          href: '/about'   },
    { label: 'FAQ',            href: '/faq'     },
    { label: 'Terms',          href: '/terms'   },
    { label: 'Privacy Policy', href: '/privacy' },
    { label: 'Cookies', href: '/cookies' },
    { label: 'DMCA',   href: '/dmca'    },
  ],
}

export function Footer() {
  return (
    <footer className="relative overflow-hidden border-t border-border bg-background">
      {/* Subtle top glow */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-32 bg-primary/4 blur-3xl pointer-events-none" />

      <div className="relative max-w-7xl mx-auto px-4 pt-14 pb-8">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-10 mb-12">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1 space-y-4">
            <Link href="/" className="inline-flex items-center gap-2.5 group">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-primary to-violet-500 flex items-center justify-center shadow-lg shadow-primary/20 group-hover:scale-110 transition-transform">
                <BookOpen size={15} className="text-white" />
              </div>
              <span className="font-black text-lg tracking-tight text-foreground group-hover:text-primary transition-colors">
                Compicfy
              </span>
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed max-w-[200px]">
              Your community for discovering manga, manhwa, manhua &amp; webtoons.
            </p>
            {/* Discord pill */}
            <a
              href="https://discord.gg/7WPGMb696N"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-[#5865F2]/10 border border-[#5865F2]/20 text-[#5865F2] text-xs font-semibold hover:bg-[#5865F2]/20 transition-colors"
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057.102 18.08.114 18.1.141 18.115a19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03z" />
              </svg>
              Join Discord
            </a>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category} className="space-y-4">
              <h3 className="text-xs font-black uppercase tracking-widest text-foreground">
                {category}
              </h3>
              <ul className="space-y-2.5">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors hover:translate-x-0.5 inline-block transition-transform"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mb-6" />

        {/* Bottom bar */}
        <div className="flex flex-col items-center gap-2 text-xs text-muted-foreground text-center sm:flex-row sm:justify-between sm:text-left">
          <div className="space-y-1">
            <p>© {new Date().getFullYear()} Compicfy. All rights reserved.We do not host or link to pirated content.</p>
          </div>
          <p className="flex items-center gap-1 shrink-0">
            Made with
            <span className="text-rose-500 mx-0.5">❤️</span>
            for comic fans everywhere
          </p>
        </div>
      </div>
    </footer>
  )
}