import Link from 'next/link'
import { ShoppingBag, ExternalLink, Info } from 'lucide-react'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Shop & Merch | Compicfy',
  description: 'Find manga volumes, figures, kawaii accessories and more from our affiliate partners.',
}

const platforms = [
  {
    name: 'Amazon',
    description: 'Manga volumes, art books, posters and more. The largest catalogue for anime and manga merchandise.',
    color: 'from-amber-500 to-orange-500',
    bg: 'bg-amber-500/10',
    border: 'border-amber-500/20',
    text: 'text-amber-600 dark:text-amber-400',
    url: `https://www.amazon.com/s?k=manga&tag=compicfy-20&ref=nosim`,
    categories: [
      { label: 'Manga Volumes',  url: 'https://www.amazon.com/s?k=manga%20volumes&tag=compicfy-20&ref=nosim'  },
      { label: 'Art Books',      url: 'https://www.amazon.com/s?k=manga%20art%20book&tag=compicfy-20&ref=nosim' },
      { label: 'Posters',        url: 'https://www.amazon.com/s?k=anime%20poster&tag=compicfy-20&ref=nosim'   },
      { label: 'Figures',        url: 'https://www.amazon.com/s?k=anime%20figure&tag=compicfy-20&ref=nosim'   },
      { label: 'Plush Toys',     url: 'https://www.amazon.com/s?k=anime%20plush&tag=compicfy-20&ref=nosim'    },
    ],
  },
  {
    name: 'Blippo',
    description: 'Kawaii Japanese merchandise — plushies, stationery, accessories, snacks and more.',
    color: 'from-pink-500 to-rose-500',
    bg: 'bg-pink-500/10',
    border: 'border-pink-500/20',
    text: 'text-pink-600 dark:text-pink-400',
    url: 'https://www.blippo.com',
    categories: [
      { label: 'Plushies',        url: 'https://www.blippo.com/collections/plushies'      },
      { label: 'Stationery',      url: 'https://www.blippo.com/collections/stationery'    },
      { label: 'Accessories',     url: 'https://www.blippo.com/collections/accessories'   },
      { label: 'Japanese Snacks', url: 'https://www.blippo.com/collections/snacks'        },
      { label: 'Figures & Dolls', url: 'https://www.blippo.com/collections/dolls-figures' },
      { label: 'Blind Boxes',     url: 'https://www.blippo.com/collections/blind-boxes'   },
      { label: 'Kawaii Clothing', url: 'https://www.blippo.com/collections/clothing'      },
      { label: 'Lucky Bags',      url: 'https://www.blippo.com/collections/lucky-bags'    },
    ],
  },
  {
    name: 'Entertainment Earth',
    description: 'Premium anime figures, collectibles and horror merchandise from official licensors.',
    color: 'from-blue-500 to-indigo-500',
    bg: 'bg-blue-500/10',
    border: 'border-blue-500/20',
    text: 'text-blue-600 dark:text-blue-400',
    url: 'https://www.entertainmentearth.com',
    categories: [
      { label: 'Anime Figures',       url: 'https://www.entertainmentearth.com/s/?query1=anime%20figure'  },
      { label: 'Action Figures',      url: 'https://www.entertainmentearth.com/s/?query1=action%20figure' },
      { label: 'Horror Collectibles', url: 'https://www.entertainmentearth.com/s/?query1=horror%20figure' },
      { label: 'Collectibles',        url: 'https://www.entertainmentearth.com/s/?query1=collectible'     },
    ],
  },
  {
    name: 'Etsy',
    description: 'Handmade fan art prints, cosplay costumes and unique manga-inspired creations.',
    color: 'from-orange-500 to-amber-400',
    bg: 'bg-orange-500/10',
    border: 'border-orange-500/20',
    text: 'text-orange-600 dark:text-orange-400',
    url: 'https://www.etsy.com/search?q=manga%20anime',
    categories: [
      { label: 'Fan Art Prints',   url: 'https://www.etsy.com/search?q=manga%20anime%20print%20art'   },
      { label: 'Cosplay Costumes', url: 'https://www.etsy.com/search?q=anime%20cosplay%20costume'     },
      { label: 'Enamel Pins',      url: 'https://www.etsy.com/search?q=anime%20enamel%20pin'          },
      { label: 'Stickers',         url: 'https://www.etsy.com/search?q=manga%20anime%20sticker'       },
    ],
  },
]

export default function AffiliatePage() {
  return (
    <div className="min-h-screen">

      {/* Hero */}
      <div className="relative overflow-hidden border-b border-border bg-gradient-to-b from-primary/5 to-transparent">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-violet-500/10 pointer-events-none" />
        <div className="max-w-4xl mx-auto px-4 py-16 text-center space-y-4 relative">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-primary text-xs font-bold uppercase tracking-widest mb-2">
            <ShoppingBag size={12} />
            Community Shop
          </div>
          <h1 className="text-3xl md:text-5xl font-black tracking-tight">
            Shop manhwa &amp; <span className="text-primary">Kawaii Merch</span>
          </h1>
          <p className="text-muted-foreground text-sm md:text-base max-w-xl mx-auto leading-relaxed">
            Browse merchandise from our trusted affiliate partners. Every purchase helps keep Compicfy free for the community.
          </p>
        </div>
      </div>

      {/* Disclosure banner */}
      <div className="max-w-4xl mx-auto px-4 mt-8">
        <div className="flex items-start gap-3 p-4 rounded-2xl bg-muted/50 border border-border text-xs text-muted-foreground leading-relaxed">
          <Info size={14} className="shrink-0 mt-0.5 text-primary" />
          <p>
            <strong className="text-foreground">Affiliate Disclosure:</strong> Compicfy earns a small commission when you purchase through links on this page, at no extra cost to you.
            We only partner with stores that sell legitimate, officially licensed merchandise.
          </p>
        </div>
      </div>

      {/* Platform cards */}
      <div className="max-w-4xl mx-auto px-4 py-10 space-y-6">
        {platforms.map((platform) => (
          <div
            key={platform.name}
            className={`rounded-2xl border ${platform.border} bg-card overflow-hidden`}
          >
            {/* Platform header */}
            <div className={`px-6 py-5 bg-gradient-to-r ${platform.color} bg-opacity-10`}>
              <div className="flex items-center justify-between">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h2 className="text-lg font-black text-white">{platform.name}</h2>
                  </div>
                  <p className="text-white/70 text-xs max-w-md leading-relaxed">
                    {platform.description}
                  </p>
                </div>
                
                <a
                  href={platform.url}
                  target="_blank"
                  rel="sponsored nofollow noopener noreferrer"
                  className="shrink-0 flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white/20 hover:bg-white/30 text-white text-xs font-bold transition-colors"
                >
                  Visit Store
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>

            {/* Category links */}
            <div className="px-6 py-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-muted-foreground mb-3">
                Browse Categories
              </p>
              <div className="flex flex-wrap gap-2">
                {platform.categories.map((cat) => (
                  <a
                    key={cat.label}
                    href={cat.url}
                    target="_blank"
                    rel="sponsored nofollow noopener noreferrer"
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all duration-150 hover:scale-105 ${platform.bg} ${platform.border} ${platform.text}`}
                  >
                    {cat.label}
                    <ExternalLink size={9} className="opacity-60" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Bottom CTA */}
      <div className="max-w-4xl mx-auto px-4 pb-16">
        <div className="rounded-2xl border border-border bg-card p-6 text-center space-y-3">
          <h3 className="font-black text-lg">Find merch for a specific comic?</h3>
          <p className="text-sm text-muted-foreground">
            Visit any comic detail page — we show relevant merchandise links based on the genre.
          </p>
          <Link
            href="/browse"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-primary to-violet-500 text-white text-sm font-bold hover:opacity-90 transition-opacity shadow-md shadow-primary/20"
          >
            Browse Comics
          </Link>
        </div>
      </div>
    </div>
  )
}