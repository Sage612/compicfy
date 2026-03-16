export interface AffiliateProductMapping {
  genre: string;
  platform: 'Amazon' | 'Entertainment Earth' | 'Blippo' | 'Etsy' | 'eBay';
  productType: string;
  searchTemplate: string;
  commission: string;
}

export interface AffiliateClickPayload {
  comicId: string;
  comicTitle: string;
  platform: string;
  productType: string;
  genre: string;
}

export interface AffiliateStats {
  totalClicks: number;
  platformBreakdown: Record<string, number>;
  recentClicks: Array<{
    id: string;
    comic_title: string;
    platform: string;
    created_at: string;
  }>;
}