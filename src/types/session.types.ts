// =============================================================================
// types/session.types.ts
// PitchSim — Complete TypeScript Type Definitions
//
// This is the single source of truth for all types across the app.
// Import from here everywhere — never define inline types in screens/services.
// =============================================================================

import type { PersonaId, ScoreAxis } from '../constants/personas'

// ─────────────────────────────────────────────────────────────────────────────
// PRIMITIVES
// ─────────────────────────────────────────────────────────────────────────────

/** ISO 8601 date string — e.g. "2025-04-27T10:32:00.000Z" */
export type ISODateString = string

/** Firestore document ID */
export type DocId = string

/** A score value between 0 and 10, to one decimal place */
export type ScoreValue = number

// ─────────────────────────────────────────────────────────────────────────────
// CONVERSATION
// ─────────────────────────────────────────────────────────────────────────────

/** A single turn in the AI conversation */
export type Message = {
  role: 'user' | 'assistant'
  content: string
}

/**
 * The full conversation transcript for a session.
 * messages[0] is always the initial pitch (role: 'user').
 * Alternates: user pitch → assistant Q → user answer → assistant Q → ...
 */
export type Transcript = Message[]

// ─────────────────────────────────────────────────────────────────────────────
// SCORING
// ─────────────────────────────────────────────────────────────────────────────

/** Score and AI-generated note for a single evaluation axis */
export type AxisScore = {
  /** Numeric score 0–10 */
  score: ScoreValue
  /** Specific, actionable feedback from the AI investor persona */
  note: string
}

/** Scores across all 6 evaluation axes */
export type AxesScores = Record<ScoreAxis, AxisScore>

/**
 * The full score result returned by the AI after a session ends.
 * This is what gets stored in Firestore and passed to ScoreReportScreen.
 */
export type ScoreResult = {
  /** Weighted overall score 0–10 */
  overall: ScoreValue
  /** Individual axis breakdowns */
  axes: AxesScores
  /** The axis key where the founder performed best */
  topStrength: ScoreAxis
  /** The axis key where the founder performed worst */
  topWeakness: ScoreAxis
  /** Two-sentence overall summary from the persona's perspective */
  summary: string
}

/**
 * ScoreResult as it may arrive raw from the AI before validation.
 * Use `parseScoreResult()` in scoringService.ts to convert to ScoreResult.
 */
export type RawScoreResult = {
  overall: number
  axes: Record<string, { score: number; note: string }>
  topStrength: string
  topWeakness: string
  summary: string
}

// ─────────────────────────────────────────────────────────────────────────────
// SESSION
// ─────────────────────────────────────────────────────────────────────────────

/**
 * All possible states of a live pitch session.
 *
 * Flow:
 *   idle → loading_first_q → questioning ⟷ recording → processing
 *        → questioning (loops until TOTAL_QUESTIONS reached)
 *        → scoring → done
 */
export type SessionPhase =
  | 'idle'           // Before session starts
  | 'loading_first_q'// Waiting for AI to generate the first question
  | 'questioning'    // AI question displayed, waiting for user to respond
  | 'recording'      // User is actively recording a voice answer
  | 'processing'     // Answer submitted, waiting for AI to generate next question
  | 'scoring'        // All questions done, generating final score report
  | 'done'           // Session complete, scores received

/** Input mode the user is currently using to answer questions */
export type InputMode = 'voice' | 'text'

/**
 * A completed session as stored in Firestore.
 * Created by sessionService.saveSession() at the end of a session.
 */
export type Session = {
  /** Firestore document ID (set after save) */
  id: DocId
  /** Firebase Auth UID of the user who completed this session */
  userId: DocId
  /** Which investor persona was used */
  personaId: PersonaId
  /** Full conversation transcript including initial pitch */
  transcript: Transcript
  /** Score breakdown returned by the AI */
  scores: ScoreResult
  /** How long the session lasted in seconds */
  durationSeconds: number
  /** Number of questions asked (typically TOTAL_QUESTIONS = 6) */
  questionCount: number
  /** URL of the uploaded pitch deck PDF in Firebase Storage, if provided */
  deckUrl: string | null
  /** ISO timestamp of when the session was completed */
  createdAt: ISODateString
}

/**
 * Payload used to create a new session — before the Firestore ID is assigned.
 * Pass this to sessionService.saveSession().
 */
export type NewSession = Omit<Session, 'id'>

/**
 * A lightweight summary of a session used in history lists and progress charts.
 * Fetched in bulk — does not include full transcript to keep reads cheap.
 */
export type SessionSummary = {
  id: DocId
  personaId: PersonaId
  overallScore: ScoreValue
  topStrength: ScoreAxis
  topWeakness: ScoreAxis
  durationSeconds: number
  createdAt: ISODateString
}

// ─────────────────────────────────────────────────────────────────────────────
// USER
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate score stats stored on the user document.
 * Updated by a Cloud Function after each session is saved.
 * Used on the Progress screen without needing to read all sessions.
 */
export type UserScoreStats = {
  /** Total number of sessions completed */
  totalSessions: number
  /** Average overall score across all sessions */
  avgOverall: ScoreValue
  /** Per-axis average scores across all sessions */
  avgByAxis: Partial<Record<ScoreAxis, ScoreValue>>
  /** The axis the user has consistently scored lowest on */
  persistentWeakness: ScoreAxis | null
  /** The axis the user has consistently scored highest on */
  persistentStrength: ScoreAxis | null
  /** Current daily practice streak (days in a row with ≥1 session) */
  streak: number
  /** ISO date of the last completed session */
  lastSessionAt: ISODateString | null
}

/**
 * The full user document stored in the Firestore `users` collection.
 */
export type UserProfile = {
  /** Matches Firebase Auth UID */
  uid: DocId
  displayName: string
  email: string
  /** URL to Firebase Storage profile photo */
  photoUrl: string | null
  /** Aggregate stats — updated by Cloud Function, not client */
  stats: UserScoreStats
  /** When the user account was created */
  createdAt: ISODateString
}

// ─────────────────────────────────────────────────────────────────────────────
// BENCHMARKING
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Aggregate benchmark data stored per persona × axis combination.
 * Used to show "you beat X% of users" on the ScoreReportScreen.
 * Updated by a Cloud Function, never written by the client.
 */
export type BenchmarkEntry = {
  personaId: PersonaId
  axis: ScoreAxis
  /** Mean score across all users for this persona × axis */
  mean: ScoreValue
  /** Standard deviation — used to compute percentile */
  stdDev: number
  /** Total number of sessions included in this aggregate */
  sampleSize: number
  /** ISO timestamp of last recalculation */
  updatedAt: ISODateString
}

/**
 * Full benchmark snapshot for a single persona.
 * Returned by benchmarkService.getBenchmarks(personaId).
 */
export type PersonaBenchmarks = Record<ScoreAxis, BenchmarkEntry>

/**
 * The result of comparing a user's scores against the benchmark.
 * Shown on ScoreReportScreen as "you beat X% of users on Y axis".
 */
export type BenchmarkComparison = {
  axis: ScoreAxis
  /** User's score on this axis */
  userScore: ScoreValue
  /** Population mean for this persona × axis */
  populationMean: ScoreValue
  /** Estimated percentile 0–100 */
  percentile: number
  /** Whether user is above or below the mean */
  aboveMean: boolean
}

// ─────────────────────────────────────────────────────────────────────────────
// DECK ANALYSIS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Result of the AI cross-referencing a spoken pitch against an uploaded deck.
 * Generated by deckService.analyseDeck() before the session starts.
 */
export type DeckAnalysis = {
  /** Slides the AI detected in the deck */
  detectedTopics: string[]
  /** Topics in the deck that the founder did NOT mention in their pitch */
  missingInPitch: string[]
  /** Claims in the pitch that contradict the deck content */
  contradictions: string[]
  /** Overall consistency score 0–10 */
  consistencyScore: ScoreValue
  /** One paragraph summary of deck vs pitch gaps */
  summary: string
}

// ─────────────────────────────────────────────────────────────────────────────
// NAVIGATION PARAMS
// ─────────────────────────────────────────────────────────────────────────────

/**
 * Type-safe navigation param map for React Navigation.
 * Import this into your navigator and screen files.
 *
 * Usage:
 *   type Nav = NativeStackNavigationProp<RootStackParamList, 'QA'>
 *   type Route = RouteProp<RootStackParamList, 'QA'>
 */
export type RootStackParamList = {
  /** Bottom tab navigator — no params */
  Main: undefined

  /** Auth screens */
  Login: undefined
  Onboarding: undefined

  /** Session flow */
  PersonaSelect: undefined

  PitchTips: { personaId: string }
  
  PitchRecord: {
    personaId: PersonaId
  }

  QA: {
    personaId: PersonaId
    pitchTranscript: string
    deckAnalysis?: DeckAnalysis
  }

  ScoreReport: {
    sessionId: DocId
    scores: ScoreResult
    personaId: PersonaId
    durationSeconds: number
  }

  SessionDetail: {
    sessionId: string
  }
}
export type MainTabParamList = {
  Home: undefined
  Progress: undefined
  Profile: undefined
}

// ─────────────────────────────────────────────────────────────────────────────
// SERVICE RETURN TYPES
// ─────────────────────────────────────────────────────────────────────────────

/** Generic async result wrapper — avoids try/catch in every screen */
export type Result<T> =
  | { ok: true; data: T }
  | { ok: false; error: string }

/** What sessionService.saveSession() returns on success */
export type SaveSessionResult = Result<{ sessionId: DocId }>

/** What sessionService.getUserSessions() returns */
export type GetSessionsResult = Result<SessionSummary[]>

/** What scoringService.generateScores() returns */
export type ScoringResult = Result<ScoreResult>

// ─────────────────────────────────────────────────────────────────────────────
// STORE SHAPES (Zustand)
// ─────────────────────────────────────────────────────────────────────────────

/** Shape of the session store (store/sessionStore.ts) */
export type SessionStore = {
  /** Currently active persona — set on PersonaSelectScreen */
  activePersonaId: PersonaId | null
  /** Live transcript being built during a session */
  transcript: Transcript
  /** Current question index (0–5) */
  questionIndex: number
  /** Current phase of the session state machine */
  phase: SessionPhase
  /** Start time of the current session (Date.now()) */
  sessionStartMs: number | null
  /** DeckAnalysis if user uploaded a deck before the session */
  deckAnalysis: DeckAnalysis | null
  /** Final scores — set when phase transitions to 'done' */
  scores: ScoreResult | null

  // Actions
  setPersona: (id: PersonaId) => void
  appendMessage: (message: Message) => void
  setPhase: (phase: SessionPhase) => void
  incrementQuestion: () => void
  setScores: (scores: ScoreResult) => void
  setDeckAnalysis: (analysis: DeckAnalysis) => void
  resetSession: () => void
}

/** Shape of the user store (store/userStore.ts) */
export type UserStore = {
  profile: UserProfile | null
  isAuthenticated: boolean
  isLoading: boolean

  setProfile: (profile: UserProfile) => void
  clearProfile: () => void
}

// ─────────────────────────────────────────────────────────────────────────────
// CONSTANTS (typed)
// ─────────────────────────────────────────────────────────────────────────────

/** All valid score axis keys as a readonly tuple — use for iteration */
export const SCORE_AXES: readonly ScoreAxis[] = [
  'problemClarity',
  'marketSizing',
  'solutionConfidence',
  'objectionHandling',
  'askSpecificity',
  'storytelling',
] as const

/** Total number of Q&A questions per session */
export const TOTAL_QUESTIONS = 6 as const

/** Minimum score to be considered "investment ready" */
export const INVESTOR_READY_THRESHOLD = 8.0 as const