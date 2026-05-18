// =============================================================================
// store/userStore.ts
// PitchSim — Global User State (Zustand)
//
// Holds the authenticated user's profile and auth state.
// Populated on login, cleared on logout.
// Consumed by: HomeScreen, ProfileScreen, AppNavigator, sessionService
// =============================================================================

import { create } from 'zustand'
import type { UserProfile, UserStore } from '../types/session.types'

export const useUserStore = create<UserStore>((set) => ({
  // ── State ──────────────────────────────────────────────────────────────────
  profile: null,
  isAuthenticated: false,
  isLoading: true, // true on app launch until Firebase resolves auth state

  // ── Actions ────────────────────────────────────────────────────────────────

  setProfile: (profile: UserProfile) =>
    set({ profile, isAuthenticated: true, isLoading: false }),

  clearProfile: () =>
    set({ profile: null, isAuthenticated: false, isLoading: false }),
}))

// ─── Selectors (use these in screens for clean reads) ─────────────────────────

/** Returns the current user's UID — throws if not authenticated */
export const selectUid = (state: UserStore): string => {
  if (!state.profile) throw new Error('selectUid: user not authenticated')
  return state.profile.uid
}

/** Returns display name with a fallback */
export const selectDisplayName = (state: UserStore): string =>
  state.profile?.displayName ?? 'Founder'

/** Returns total sessions completed */
export const selectTotalSessions = (state: UserStore): number =>
  state.profile?.stats.totalSessions ?? 0

/** Returns current streak */
export const selectStreak = (state: UserStore): number =>
  state.profile?.stats.streak ?? 0

/** Returns average overall score across all sessions */
export const selectAvgOverall = (state: UserStore): number =>
  state.profile?.stats.avgOverall ?? 0
