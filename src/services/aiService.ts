import type { Message, ScoreResult } from '../types/session.types'
import type { Persona } from '../constants/personas'

const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY ?? 'MISSING'

console.log('=== GEMINI KEY CHECK ===')
console.log('Key exists:', GEMINI_API_KEY !== 'MISSING')
console.log('Key length:', GEMINI_API_KEY.length)
console.log('Key preview:', GEMINI_API_KEY.substring(0, 10))

const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`

async function callGemini(systemPrompt: string, messages: Message[], maxTokens: number = 512): Promise<string> {
  const contents = messages.map(m => ({
    role: m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }))

  if (contents.length > 0 && contents[0].role === 'model') {
    contents.unshift({ role: 'user', parts: [{ text: 'Begin.' }] })
  }

  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: systemPrompt }] },
        contents,
        generationConfig: { maxOutputTokens: maxTokens, temperature: 0.8 },
      }),
    })

    const data = await res.json()
    console.log('=== GEMINI RESPONSE ===')
    console.log('Status:', res.status)
    console.log('Data:', JSON.stringify(data).substring(0, 300))

    const text = data.candidates?.[0]?.content?.parts?.[0]?.text
    if (!text) throw new Error('No text in response')
    return text.trim()

  } catch (e) {
    console.error('=== GEMINI ERROR ===', e)
    return 'Walk me through your go-to-market strategy.'
  }
}

export async function getNextQuestion(persona: Persona, history: Message[]): Promise<string> {
  const system = `${persona.systemPrompt}\n\nAsk ONE sharp follow-up question. Output ONLY the question.`
  return callGemini(system, history, 256)
}

export async function generateScores(persona: Persona, history: Message[]): Promise<ScoreResult> {
  const system = `You are a pitch evaluator. Return ONLY valid JSON starting with { and ending with }:
{"overall":7.0,"axes":{"problemClarity":{"score":7.0,"note":"feedback"},"marketSizing":{"score":6.0,"note":"feedback"},"solutionConfidence":{"score":7.0,"note":"feedback"},"objectionHandling":{"score":6.0,"note":"feedback"},"askSpecificity":{"score":7.0,"note":"feedback"},"storytelling":{"score":7.0,"note":"feedback"}},"topStrength":"problemClarity","topWeakness":"objectionHandling","summary":"Two sentence feedback."}`

  try {
    const raw = await callGemini(system, history, 1024)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON')
    return JSON.parse(match[0]) as ScoreResult
  } catch (e) {
    return {
      overall: 5.0,
      axes: {
        problemClarity:     { score: 5.0, note: 'Could not evaluate.' },
        marketSizing:       { score: 5.0, note: 'Could not evaluate.' },
        solutionConfidence: { score: 5.0, note: 'Could not evaluate.' },
        objectionHandling:  { score: 5.0, note: 'Could not evaluate.' },
        askSpecificity:     { score: 5.0, note: 'Could not evaluate.' },
        storytelling:       { score: 5.0, note: 'Could not evaluate.' },
      },
      topStrength: 'problemClarity',
      topWeakness: 'objectionHandling',
      summary: 'Scoring failed. Please try again.',
    }
  }
}

export const aiService = { getNextQuestion, generateScores }