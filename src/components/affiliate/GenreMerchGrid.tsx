'use client'

import { AFFILIATE_MAPPINGS, generateAffiliateUrl } from '@/lib/affiliate/constants'
import { AffiliateLink } from './AffiliateLink'
import { ShoppingBag, Gamepad2, Sparkles, Shirt, BookOpen } from 'lucide-react'

interface GenreMerchGridProps {
  comicId: string
  comicTitle: string
  genre: string
}

function getIcon(productType: string) {
  const t = productType.toLowerCase()
  if (t.includes('apparel') || t.includes('shirt') || t.includes('cosplay') || t.includes('fashion'))
    return <Shirt className="w-4 h-4" />
  if (t.includes('game') || t.includes('figure') || t.includes('collectible'))
    return <Gamepad2 className="w-4 h-4" />
  if (t.includes('book') || t.includes('stationery') || t.includes('print'))
    return <BookOpen className="w-4 h-4" />
  if (t.includes('jewelry') || t.includes('kawaii') || t.includes('plush') || t.includes('snack'))
    return <Sparkles className="w-4 h-4" />
  return <ShoppingBag className="w-4 h-4" />
}

export function GenreMerchGrid({ comicId, comicTitle, genre }: GenreMerchGridProps) {
  const products = AFFILIATE_MAPPINGS.filter(
    (m) => m.genre.toLowerCase() === genre.toLowerCase()
  )

  if (products.length === 0) return null

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
            <div className="flex items-center gap-2 text-primary">
              {getIcon(product.productType)}
              <span className="text-xs font-bold">{product.productType}</span>
            </div>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Find {comicTitle}-related {product.productType.toLowerCase()} on {product.platform}
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
                Shop on {product.platform}
              </AffiliateLink>
            </div>
          </div>
        )
      })}
    </div>
  )
}