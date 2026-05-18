// =============================================================================
// hooks/useAuth.ts
// PitchSim — Firebase Auth State Hook
//
// Listens to Firebase auth state changes and syncs with Zustand userStore.
// Use this in AppNavigator to decide which screens to show.
// =============================================================================

import { useEffect } from 'react'
import { onAuthStateChanged } from 'firebase/auth'
import { auth } from '../firebase/config'
import { useUserStore } from '../store/userStore'
import { getUserProfile, upsertUserProfile } from '../services/sessionService'

export function useAuth() {
  const { profile, isAuthenticated, isLoading, setProfile, clearProfile } = useUserStore()

  useEffect(() => {
    // Subscribe to Firebase auth state
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        // User is signed in — load their Firestore profile
        try {
          let userProfile = await getUserProfile(firebaseUser.uid)

          if (!userProfile) {
            // First time — create profile
            await upsertUserProfile({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? 'Founder',
              email: firebaseUser.email ?? '',
              photoUrl: firebaseUser.photoURL,
            })
            userProfile = await getUserProfile(firebaseUser.uid)
          }

          if (userProfile) {
            setProfile(userProfile)
          } else {
            // Fallback if Firestore read fails
            setProfile({
              uid: firebaseUser.uid,
              displayName: firebaseUser.displayName ?? 'Founder',
              email: firebaseUser.email ?? '',
              photoUrl: firebaseUser.photoURL,
              stats: {
                totalSessions: 0,
                avgOverall: 0,
                avgByAxis: {},
                persistentWeakness: null,
                persistentStrength: null,
                streak: 0,
                lastSessionAt: null,
              },
              createdAt: new Date().toISOString(),
            })
          }
        } catch (e) {
          console.error('useAuth profile load error:', e)
          clearProfile()
        }
      } else {
        // User signed out
        clearProfile()
      }
    })

    // Cleanup subscription on unmount
    return () => unsubscribe()
  }, [])

  return { profile, isAuthenticated, isLoading }
}
