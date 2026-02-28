import { create } from 'zustand'

interface FiltersState {
  selectedGenres: string[]
  selectedType: string | null
  selectedPlatform: string | null
  selectedStatus: string | null
  searchQuery: string
  sortBy: 'score' | 'created_at' | 'daily_votes' | 'view_count'
  setGenres: (genres: string[]) => void
  setType: (type: string | null) => void
  setPlatform: (platform: string | null) => void
  setStatus: (status: string | null) => void
  setSearchQuery: (query: string) => void
  setSortBy: (sort: FiltersState['sortBy']) => void
  resetFilters: () => void
}

export const useFiltersStore = create<FiltersState>((set) => ({
  selectedGenres: [],
  selectedType: null,
  selectedPlatform: null,
  selectedStatus: null,
  searchQuery: '',
  sortBy: 'score',
  setGenres: (genres) => set({ selectedGenres: genres }),
  setType: (type) => set({ selectedType: type }),
  setPlatform: (platform) => set({ selectedPlatform: platform }),
  setStatus: (status) => set({ selectedStatus: status }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setSortBy: (sortBy) => set({ sortBy }),
  resetFilters: () =>
    set({
      selectedGenres: [],
      selectedType: null,
      selectedPlatform: null,
      selectedStatus: null,
      searchQuery: '',
      sortBy: 'score',
    }),
}))