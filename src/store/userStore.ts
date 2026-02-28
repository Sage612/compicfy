import { create } from 'zustand'
import type { Profile } from '@/types/database.types'

interface UserState {
  profile: Profile | null
  setProfile: (profile: Profile | null) => void
  clearProfile: () => void
}

export const useUserStore = create<UserState>((set) => ({
  profile: null,
  setProfile: (profile) => set({ profile }),
  clearProfile: () => set({ profile: null }),
}))