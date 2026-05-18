// =============================================================================
// services/sessionService.ts
// PitchSim — Session & User Firestore Operations
//
// All database reads and writes go through this file.
// Never call Firestore directly from screens — always go through here.
// =============================================================================

import {
  collection,
  addDoc,
  query,
  where,
  orderBy,
  getDocs,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  increment,
  limit,
  Timestamp,
} from 'firebase/firestore'
import { db } from '../firebase/config'
import type {
  Session,
  NewSession,
  SessionSummary,
  UserProfile,
  UserScoreStats,
  ScoreResult,
} from '../types/session.types'
import type { ScoreAxis } from '../constants/personas'
import { SCORE_AXES } from '../types/session.types'

// ─────────────────────────────────────────────────────────────────────────────
// USER OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Get a user's profile from Firestore.
 * Returns null if the user document doesn't exist yet.
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  try {
    const ref = doc(db, 'users', uid)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    return snap.data() as UserProfile
  } catch (e) {
    console.error('getUserProfile error:', e)
    return null
  }
}

/**
 * Create or update a user profile in Firestore.
 * Called after login — safe to call multiple times (uses setDoc with merge).
 */
export async function upsertUserProfile(profile: {
  uid: string
  displayName: string
  email: string
  photoUrl?: string | null
}): Promise<void> {
  try {
    const ref = doc(db, 'users', profile.uid)
    const existing = await getDoc(ref)

    if (!existing.exists()) {
      // First time — create full profile with default stats
      const newProfile: UserProfile = {
        uid: profile.uid,
        displayName: profile.displayName,
        email: profile.email,
        photoUrl: profile.photoUrl ?? null,
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
      }
      await setDoc(ref, newProfile)
    } else {
      // Update name/email/photo in case they changed
      await setDoc(ref, {
        displayName: profile.displayName,
        email: profile.email,
        photoUrl: profile.photoUrl ?? null,
      }, { merge: true })
    }
  } catch (e) {
    console.error('upsertUserProfile error:', e)
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION OPERATIONS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Save a completed session to Firestore.
 * Also updates the user's aggregate stats.
 * Returns the new session's Firestore document ID.
 */
export async function saveSession(
  userId: string,
  session: NewSession
): Promise<string | null> {
  try {
    // 1. Save the session document
    const sessionRef = await addDoc(collection(db, 'sessions'), {
      ...session,
      createdAt: Timestamp.now(),
    })

    // 2. Update user aggregate stats
    await updateUserStats(userId, session.scores)

    return sessionRef.id
  } catch (e) {
    console.error('saveSession error:', e)
    return null
  }
}

/**
 * Get a user's recent sessions as lightweight summaries.
 * Does not fetch full transcripts — keeps reads cheap.
 * Returns up to 50 most recent sessions.
 */
export async function getUserSessionSummaries(
  userId: string,
  maxResults: number = 50
): Promise<SessionSummary[]> {
  try {
    const q = query(
      collection(db, 'sessions'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(maxResults)
    )

    const snap = await getDocs(q)

    return snap.docs.map(d => {
      const data = d.data()
      return {
        id: d.id,
        personaId: data.personaId,
        overallScore: data.scores?.overall ?? 0,
        topStrength: data.scores?.topStrength ?? 'problemClarity',
        topWeakness: data.scores?.topWeakness ?? 'objectionHandling',
        durationSeconds: data.durationSeconds ?? 0,
        createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
      } as SessionSummary
    })
  } catch (e) {
    console.error('getUserSessionSummaries error:', e)
    return []
  }
}

/**
 * Get a single full session including transcript.
 * Use this only when you need to show the full session detail.
 */
export async function getSessionById(sessionId: string): Promise<Session | null> {
  try {
    const ref = doc(db, 'sessions', sessionId)
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const data = snap.data()
    return {
      ...data,
      id: snap.id,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? new Date().toISOString(),
    } as Session
  } catch (e) {
    console.error('getSessionById error:', e)
    return null
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// STATS HELPERS (internal)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Recalculate and update user aggregate stats after a new session.
 * Called automatically by saveSession() — don't call directly from screens.
 */
async function updateUserStats(
  userId: string,
  newScores: ScoreResult
): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId)
    const userSnap = await getDoc(userRef)
    if (!userSnap.exists()) return

    const current = userSnap.data() as UserProfile
    const stats = current.stats
    const n = stats.totalSessions // sessions BEFORE this one

    // Incremental average: newAvg = (oldAvg * n + newValue) / (n + 1)
    const newOverall = ((stats.avgOverall * n) + newScores.overall) / (n + 1)

    // Update per-axis averages
    const newAvgByAxis: Partial<Record<ScoreAxis, number>> = {}
    for (const axis of SCORE_AXES) {
      const axisScore = newScores.axes[axis]?.score ?? 5
      const oldAvg = stats.avgByAxis[axis] ?? 5
      newAvgByAxis[axis] = ((oldAvg * n) + axisScore) / (n + 1)
    }

    // Find persistent strength and weakness from updated averages
    let bestAxis: ScoreAxis = 'storytelling'
    let worstAxis: ScoreAxis = 'objectionHandling'
    let bestScore = -1
    let worstScore = 11

    for (const axis of SCORE_AXES) {
      const avg = newAvgByAxis[axis] ?? 5
      if (avg > bestScore) { bestScore = avg; bestAxis = axis }
      if (avg < worstScore) { worstScore = avg; worstAxis = axis }
    }

    // Update streak — increment if last session was today or yesterday
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const lastSessionDate = stats.lastSessionAt
      ? new Date(stats.lastSessionAt)
      : null
    lastSessionDate?.setHours(0, 0, 0, 0)

    const daysDiff = lastSessionDate
      ? Math.floor((today.getTime() - lastSessionDate.getTime()) / 86400000)
      : null

    const newStreak = daysDiff === null
      ? 1
      : daysDiff === 0
      ? stats.streak          // Same day — don't increment
      : daysDiff === 1
      ? stats.streak + 1      // Consecutive day — increment
      : 1                     // Gap — reset to 1

    // Write updated stats back
    await updateDoc(userRef, {
      'stats.totalSessions': increment(1),
      'stats.avgOverall': newOverall,
      'stats.avgByAxis': newAvgByAxis,
      'stats.persistentStrength': bestAxis,
      'stats.persistentWeakness': worstAxis,
      'stats.streak': newStreak,
      'stats.lastSessionAt': new Date().toISOString(),
    })
  } catch (e) {
    console.error('updateUserStats error:', e)
    // Don't throw — stats update failure shouldn't block the session save
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// FIRESTORE SECURITY RULES (paste into Firebase console → Firestore → Rules)
// ─────────────────────────────────────────────────────────────────────────────
//
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     // Users can only read/write their own profile
//     match /users/{userId} {
//       allow read, write: if request.auth != null && request.auth.uid == userId;
//     }
//     // Users can only read/write their own sessions
//     match /sessions/{sessionId} {
//       allow read, write: if request.auth != null
//         && request.auth.uid == resource.data.userId;
//       allow create: if request.auth != null
//         && request.auth.uid == request.resource.data.userId;
//     }
//   }
// }
//
// ─────────────────────────────────────────────────────────────────────────────