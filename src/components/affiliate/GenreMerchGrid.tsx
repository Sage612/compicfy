'use client'

import { AFFILIATE_MAPPINGS, generateAffiliateUrl } from '@/lib/affiliate/constants'
import { AffiliateLink } from './AffiliateLink'
import { ShoppingBag, Gamepad2, Sparkles, Shirt, BookOpen, Search } from 'lucide-react'

interface GenreMerchGridProps {
  comicId: string
  comicTitle: string
  genre: string
  maxOffers?: number
}

function getIcon(productType: string) {
  const t = productType.toLowerCase()
  if (t.includes('apparel') || t.includes('shirt') || t.includes('cosplay') || t.includes('fashion'))
    return <Shirt className="w-4 h-4" />
  if (t.includes('figure') || t.includes('collectible'))
    return <Gamepad2 className="w-4 h-4" />
  if (t.includes('volume') || t.includes('book') || t.includes('stationery'))
    return <BookOpen className="w-4 h-4" />
  if (t.includes('plush') || t.includes('poster') || t.includes('print') || t.includes('art'))
    return <Sparkles className="w-4 h-4" />
  return <ShoppingBag className="w-4 h-4" />
}

export function GenreMerchGrid({ comicId, comicTitle, genre, maxOffers = 3 }: GenreMerchGridProps) {
  const allProducts = AFFILIATE_MAPPINGS.filter(
    (m) => m.genre.toLowerCase() === genre.toLowerCase()
  )

  if (allProducts.length === 0) return null

  // One offer per platform, capped at maxOffers (default 3)
  // This guarantees variety — Amazon, RightStuf, Crunchyroll etc. not duplicated
  const seenPlatforms = new Set<string>()
  const products = allProducts
    .filter((m) => {
      if (seenPlatforms.has(m.platform)) return false
      seenPlatforms.add(m.platform)
      return true
    })
    .slice(0, maxOffers)

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
      {products.map((product, idx) => {
        const searchQuery = product.searchTemplate.replace('{{title}}', comicTitle)
        const outboundUrl = generateAffiliateUrl(product.platform, searchQuery)

        return (
          <div
            key={idx}
            className="flex flex-col gap-3 p-4 rounded-2xl border border-border bg-card hover:border-primary/30 transition-colors"
          >
            {/* Product type + icon */}
            <div className="flex items-center gap-2 text-primary">
              {getIcon(product.productType)}
              <span className="text-xs font-bold">{product.productType}</span>
            </div>

            {/* Platform label */}
            <p className="text-xs text-muted-foreground leading-relaxed">
              Search for{' '}
              <span className="text-foreground font-medium">{comicTitle}</span>{' '}
              {product.productType.toLowerCase()} on {product.platform}.
              Results may vary.
            </p>

            <div className="mt-auto">
              <AffiliateLink
                href={outboundUrl}
                comicId={comicId}
                comicTitle={comicTitle}
                platform={product.platform}
                productType={product.productType}
                genre={genre}
                className="text-xs font-bold bg-primary/10 text-primary px-3 py-1.5 rounded-xl w-full justify-center hover:bg-primary/20 transition-colors"
              >
                <Search className="w-3 h-3" />
                Search on {product.platform}
              </AffiliateLink>
            </div>
          </div>
        )
      })}
    </div>
  )
}