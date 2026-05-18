// =============================================================================
// store/sessionStore.ts
// PitchSim — Live Session State (Zustand)
//
// Manages all state for an active pitch session.
// Resets completely between sessions via resetSession().
// Consumed by: useSession.ts, QAScreen, PitchRecordScreen, ScoreReportScreen
// =============================================================================

import { create } from 'zustand'
import type {
  SessionStore,
  SessionPhase,
  Message,
  ScoreResult,
  DeckAnalysis,
} from '../types/session.types'
import type { PersonaId } from '../constants/personas'

// ── Initial state — extracted so resetSession() can reuse it ─────────────────

const INITIAL_STATE = {
  activePersonaId: null as PersonaId | null,
  transcript: [] as Message[],
  questionIndex: 0,
  phase: 'idle' as SessionPhase,
  sessionStartMs: null as number | null,
  deckAnalysis: null as DeckAnalysis | null,
  scores: null as ScoreResult | null,
}

// ── Store ─────────────────────────────────────────────────────────────────────

export const useSessionStore = create<SessionStore>((set, get) => ({
  ...INITIAL_STATE,

  // ── Actions ────────────────────────────────────────────────────────────────

  setPersona: (id: PersonaId) =>
    set({ activePersonaId: id }),

  appendMessage: (message: Message) =>
    set((state) => ({ transcript: [...state.transcript, message] })),

  setPhase: (phase: SessionPhase) => {
    // Record session start time when the first question loads
    if (phase === 'loading_first_q' && !get().sessionStartMs) {
      set({ phase, sessionStartMs: Date.now() })
    } else {
      set({ phase })
    }
  },

  incrementQuestion: () =>
    set((state) => ({ questionIndex: state.questionIndex + 1 })),

  setScores: (scores: ScoreResult) =>
    set({ scores, phase: 'done' }),

  setDeckAnalysis: (analysis: DeckAnalysis) =>
    set({ deckAnalysis: analysis }),

  resetSession: () =>
    set({ ...INITIAL_STATE }),
}))

// ─── Selectors ────────────────────────────────────────────────────────────────

/** Elapsed session time in seconds — computed from sessionStartMs */
export const selectElapsedSeconds = (state: SessionStore): number => {
  if (!state.sessionStartMs) return 0
  return Math.floor((Date.now() - state.sessionStartMs) / 1000)
}

/** True if session is currently active (not idle or done) */
export const selectIsSessionActive = (state: SessionStore): boolean =>
  state.phase !== 'idle' && state.phase !== 'done'

/** The initial pitch text — always transcript[0] if it exists */
export const selectPitchText = (state: SessionStore): string =>
  state.transcript[0]?.content ?? ''

/** Number of questions remaining */
export const selectQuestionsRemaining = (
  state: SessionStore,
  total: number
): number => Math.max(0, total - state.questionIndex)