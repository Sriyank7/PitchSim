// =============================================================================
// hooks/useSession.ts
// PitchSim — Session State Machine Hook
//
// Manages the entire lifecycle of a pitch session:
//   1. Submit initial pitch → get first AI question
//   2. Answer questions → get next AI question (loops 6 times)
//   3. End session → generate scores → navigate to report
//
// Uses sessionStore for global state + aiService for AI calls.
// =============================================================================

import { useCallback, useEffect, useRef } from 'react'
import { useSessionStore } from '../store/sessionStore'
import { getNextQuestion, generateScores } from '../services/aiService'
import { saveSession } from '../firebase/firestore'
import { useUserStore } from '../store/userStore'
import { getPersona } from '../constants/personas'
import type { Message, ScoreResult } from '../types/session.types'

export const TOTAL_QUESTIONS = 6

// ─── Hook return type ─────────────────────────────────────────────────────────

export type UseSessionReturn = {
  // State
  phase: string
  transcript: Message[]
  questionIndex: number
  currentQuestion: string | null
  scores: ScoreResult | null
  isLoading: boolean

  // Actions
  startSession: (personaId: string, pitchText: string) => Promise<void>
  submitAnswer: (answerText: string) => Promise<void>
  resetSession: () => void
}

// ─── Hook ─────────────────────────────────────────────────────────────────────

export function useSession(): UseSessionReturn {
  const store = useSessionStore()
  const userProfile = useUserStore(s => s.profile)
  const isMounted = useRef(true)

  useEffect(() => {
    isMounted.current = true
    return () => { isMounted.current = false }
  }, [])

  // Derived state
  const currentQuestion = store.transcript.length > 0
    ? store.transcript.filter(m => m.role === 'assistant').slice(-1)[0]?.content ?? null
    : null

  const isLoading =
    store.phase === 'loading_first_q' || store.phase === 'processing'

  // ── Step 1: Start session with initial pitch ────────────────────────────────
  const startSession = useCallback(async (
    personaId: string,
    pitchText: string
  ) => {
    if (!pitchText.trim()) return

    // Reset any previous session state
    store.resetSession()
    store.setPersona(personaId as any)
    store.setPhase('loading_first_q')

    // Add pitch as first message
    const pitchMsg: Message = { role: 'user', content: pitchText.trim() }
    store.appendMessage(pitchMsg)

    try {
      const persona = getPersona(personaId)
      const history: Message[] = [pitchMsg]

      // Get first question from AI
      const firstQuestion = await getNextQuestion(persona, history)

      if (!isMounted.current) return

      const questionMsg: Message = { role: 'assistant', content: firstQuestion }
      store.appendMessage(questionMsg)
      store.setPhase('questioning')

    } catch (e) {
      console.error('startSession error:', e)
      if (isMounted.current) {
        // Fallback question so session doesn't get stuck
        store.appendMessage({
          role: 'assistant',
          content: 'Tell me more about the problem you are solving and why now is the right time.',
        })
        store.setPhase('questioning')
      }
    }
  }, [store])

  // ── Step 2: Submit answer → get next question or end session ───────────────
  const submitAnswer = useCallback(async (answerText: string) => {
    if (!answerText.trim()) return
    if (store.phase !== 'questioning') return

    store.setPhase('processing')

    // Append user's answer
    const answerMsg: Message = { role: 'user', content: answerText.trim() }
    store.appendMessage(answerMsg)

    const nextIndex = store.questionIndex + 1

    // ── All questions done → generate scores ──────────────────────────────────
    if (nextIndex >= TOTAL_QUESTIONS) {
      store.setPhase('scoring')

      try {
        const persona = getPersona(store.activePersonaId ?? 'mentor')
        const fullHistory: Message[] = [
          ...store.transcript,
          answerMsg,
        ]

        const scores = await generateScores(persona, fullHistory)

        if (!isMounted.current) return

        // Save session to Firestore if user is logged in
        if (userProfile?.uid) {
          const durationSeconds = store.sessionStartMs
            ? Math.floor((Date.now() - store.sessionStartMs) / 1000)
            : 0

          await saveSession(userProfile.uid, {
            id: '',
            userId: userProfile.uid,
            personaId: store.activePersonaId ?? 'mentor',
            transcript: fullHistory,
            scores,
            durationSeconds,
            questionCount: TOTAL_QUESTIONS,
            deckUrl: null,
            createdAt: new Date().toISOString(),
          })
        }

        store.setScores(scores)

      } catch (e) {
        console.error('scoring error:', e)
        if (isMounted.current) {
          // Set fallback scores so app doesn't get stuck
          store.setScores({
            overall: 5.0,
            axes: {
              problemClarity:     { score: 5, note: 'Could not evaluate.' },
              marketSizing:       { score: 5, note: 'Could not evaluate.' },
              solutionConfidence: { score: 5, note: 'Could not evaluate.' },
              objectionHandling:  { score: 5, note: 'Could not evaluate.' },
              askSpecificity:     { score: 5, note: 'Could not evaluate.' },
              storytelling:       { score: 5, note: 'Could not evaluate.' },
            },
            topStrength: 'problemClarity',
            topWeakness: 'objectionHandling',
            summary: 'Scoring failed. Please try again.',
          })
        }
      }
      return
    }

    // ── More questions remaining → get next question ──────────────────────────
    store.incrementQuestion()

    try {
      const persona = getPersona(store.activePersonaId ?? 'mentor')
      const fullHistory: Message[] = [
        ...store.transcript,
        answerMsg,
      ]

      const nextQuestion = await getNextQuestion(persona, fullHistory)

      if (!isMounted.current) return

      store.appendMessage({ role: 'assistant', content: nextQuestion })
      store.setPhase('questioning')

    } catch (e) {
      console.error('submitAnswer error:', e)
      if (isMounted.current) {
        store.appendMessage({
          role: 'assistant',
          content: 'Interesting. What evidence do you have that customers will pay for this?',
        })
        store.setPhase('questioning')
      }
    }
  }, [store, userProfile])

  return {
    phase: store.phase,
    transcript: store.transcript,
    questionIndex: store.questionIndex,
    currentQuestion,
    scores: store.scores,
    isLoading,
    startSession,
    submitAnswer,
    resetSession: store.resetSession,
  }
}