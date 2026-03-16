import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface AffiliateState {
  // Keyed by `comicId_platform_productType` -> timestamp of click
  clickedLinks: Record<string, number>;
  
  // Actions
  trackClick: (comicId: string, platform: string, productType: string) => void;
  hasClicked: (comicId: string, platform: string, productType: string) => boolean;
  clearHistory: () => void;
}

export const useAffiliateStore = create<AffiliateState>()(
  persist(
    (set, get) => ({
      clickedLinks: {},

      trackClick: (comicId, platform, productType) => {
        const key = `${comicId}_${platform}_${productType}`;
        set((state) => ({
          clickedLinks: {
            ...state.clickedLinks,
            [key]: Date.now(), // Store the exact timestamp of the click
          },
        }));
      },

      hasClicked: (comicId, platform, productType) => {
        const key = `${comicId}_${platform}_${productType}`;
        return !!get().clickedLinks[key];
      },

      clearHistory: () => {
        set({ clickedLinks: {} });
      },
    }),
    {
      name: 'compicfy-affiliate-storage', // The key it will use in localStorage
    }
  )
);