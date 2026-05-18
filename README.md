# PitchSim 🎯

An AI-powered mobile app that helps startup founders practice investor pitches through dynamic Q&A sessions with 5 distinct investor personas — each with unique questioning styles, difficulty levels, and scoring biases.

## What it does

- **5 investor personas** — from Marcus Reid (Aggressive VC) to James Okoye (Mentor Investor), each asks contextually relevant follow-up questions based on exactly what you say
- **Dynamic AI Q&A** — 6-question sessions powered by Llama 3.3 70B via Groq API, stateful conversation history ensures each question builds on your previous answer
- **6-axis scoring engine** — scores your pitch on Problem Clarity, Market Sizing, Solution Confidence, Objection Handling, Ask Specificity, and Storytelling
- **Improvement delta** — tracks your score improvement session over session per persona
- **Session replay** — full transcript of every session with score breakdown
- **Pre-session tips** — investor-specific coaching cards before each session
- **Progress tracking** — longitudinal score trends and pattern analysis across all sessions

## Tech stack

| Layer | Technology |
|---|---|
| Mobile framework | React Native + Expo |
| Language | TypeScript |
| AI / LLM | Groq API (Llama 3.3 70B) |
| Authentication | Firebase Auth |
| Database | Cloud Firestore |
| State management | Zustand |
| Navigation | React Navigation v6 |

## Architecture

The app uses a serverless architecture — no custom backend server. The React Native client communicates directly with:
- **Groq API** for AI persona Q&A and structured JSON scoring
- **Firebase Auth** for user authentication
- **Cloud Firestore** for session persistence and user stats

Each investor persona is defined by a detailed system prompt that shapes tone, questioning priorities, and scoring weights. The scoring engine returns structured JSON across 6 axes after each session.

## Screens

- **Login** — Email/password auth with animated form
- **Home** — Dashboard with stats, streak, recent sessions, and quick persona access
- **Persona Select** — Difficulty-rated investor cards with expandable detail and user avg scores
- **Pitch Tips** — 3-card swipeable pre-session coaching per investor
- **Pitch Record** — Text/voice input for initial pitch
- **QA Session** — Live multi-turn conversation with animated typing indicators and voice recording
- **Score Report** — Animated score ring, axis bars, improvement delta vs last session
- **Session Detail** — Full transcript replay with score breakdown
- **Progress** — Score trend chart, filter by persona, session history

## Setup

```bash
git clone https://github.com/Sriyank7/PitchSim.git
cd PitchSim
npm install
```

Create a `.env` file in the root:
```
EXPO_PUBLIC_GROQ_API_KEY=your_groq_key
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
```

```bash
npx expo start
```

## Built by

Sriyank — Information Science Engineering student, VTU
Built as a final year mobile application development project