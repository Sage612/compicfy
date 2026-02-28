import Link from 'next/link'
import { BookOpen } from 'lucide-react'

const footerLinks = {
  Discover: [
    { label: 'Browse Comics', href: '/browse' },
    { label: 'News', href: '/news' },
    { label: 'Trending', href: '/browse?sort=trending' },
    { label: 'New Releases', href: '/browse?sort=recent' },
  ],
  Community: [
    { label: 'Sign Up', href: '/signup' },
    { label: 'Log In', href: '/login' },
    { label: 'Submit a Comic', href: '/dashboard/recommendations/new' },
  ],
  Company: [
    { label: 'About', href: '/about' },
    { label: 'FAQ', href: '/faq' },
    { label: 'Terms of Service', href: '/terms' },
    { label: 'Privacy Policy', href: '/privacy' },
  ],
}

export function Footer() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-8">

          {/* Brand */}
          <div className="col-span-2 md:col-span-1">
            <Link
              href="/"
              className="flex items-center gap-2 font-bold text-lg text-primary mb-3"
            >
              <div className="w-7 h-7 rounded-lg bg-primary flex items-center justify-center">
                <BookOpen size={14} className="text-primary-foreground" />
              </div>
              Compicfy
            </Link>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Your comic discovery community. Find, recommend, and discuss manga, manhwa, manhua, and webtoons.
            </p>
          </div>

          {/* Links */}
          {Object.entries(footerLinks).map(([category, links]) => (
            <div key={category}>
              <h3 className="font-semibold text-sm mb-3">{category}</h3>
              <ul className="space-y-2">
                {links.map(({ label, href }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted-foreground">
          <p>© {new Date().getFullYear()} Compicfy. All rights reserved. We do not host or link to pirated content.</p>
          <p>
            Made with ❤️ for comic fans everywhere
          </p>
        </div>
      </div>
    </footer>
  )
}