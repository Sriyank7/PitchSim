import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Easing, Platform, KeyboardAvoidingView,
  TextInput, SafeAreaView, ActivityIndicator, Vibration,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { Audio } from 'expo-av'

type RootStackParamList = {
  QA: { personaId: string; pitchTranscript: string }
  ScoreReport: {
    sessionId: string
    scores: ScoreResult
    personaId: string
    durationSeconds: number
  }
}
type QARouteProp = RouteProp<RootStackParamList, 'QA'>
type QANavProp = NativeStackNavigationProp<RootStackParamList, 'QA'>
type Message = { role: 'user' | 'assistant'; content: string }
type ScoreResult = {
  overall: number
  axes: Record<string, { score: number; note: string }>
  topStrength: string
  topWeakness: string
  summary: string
}
type SessionPhase = 'loading_first_q' | 'questioning' | 'recording' | 'processing' | 'scoring'

const PERSONAS: Record<string, { name: string; title: string; initials: string; color: string; systemPrompt: string }> = {
  aggressive_vc: {
    name: 'Marcus Reid', title: 'Aggressive VC', initials: 'MR', color: '#E24B4A',
    systemPrompt: `You are Marcus Reid, a senior partner at a top-tier Silicon Valley VC firm. You are direct, skeptical, and relentless. You push hard on market size, competitive moats, and defensibility. Ask ONE pointed follow-up question based on exactly what the founder just said. Output only the question — no preamble, no label.`,
  },
  angel: {
    name: 'Priya Nair', title: 'Angel Investor', initials: 'PN', color: '#1D9E75',
    systemPrompt: `You are Priya Nair, a successful angel investor focused on early-stage startups. You care about the founder's story, personal motivation, and long-term vision. Ask ONE warm but probing follow-up question. Output only the question — no preamble.`,
  },
  corporate: {
    name: 'David Chen', title: 'Corporate Strategist', initials: 'DC', color: '#378ADD',
    systemPrompt: `You are David Chen, VP of Corporate Strategy at a Fortune 500 company. You focus on integration feasibility, enterprise value, and risk management. Ask ONE structured, analytical follow-up question. Output only the question — no preamble.`,
  },
  skeptic: {
    name: 'Sofia Bauer', title: 'Skeptical Analyst', initials: 'SB', color: '#EF9F27',
    systemPrompt: `You are Sofia Bauer, a due diligence analyst who questions every assumption. You challenge unit economics, growth projections, and market size. Ask ONE sharp, data-focused follow-up question. Output only the question — no preamble.`,
  },
  mentor: {
    name: 'James Okoye', title: 'Mentor Investor', initials: 'JO', color: '#7F77DD',
    systemPrompt: `You are James Okoye, a first-time founder turned angel who mentors early entrepreneurs. You are supportive but honest. You focus on execution plan and immediate next steps. Ask ONE constructive follow-up question. Output only the question — no preamble.`,
  },
}

const TOTAL_QUESTIONS = 6

// ─── Groq AI (free, no quota issues) ─────────────────────────────────────────

const GROQ_API_KEY = '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'
const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions'

async function callGroq(system: string, messages: Message[], maxTokens = 512): Promise<string> {
  const res = await fetch(GROQ_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: system },
        ...messages.map(m => ({ role: m.role, content: m.content })),
      ],
      max_tokens: maxTokens,
      temperature: 0.8,
    }),
  })
  const data = await res.json()
  console.log('GROQ STATUS:', res.status)
  console.log('GROQ DATA:', JSON.stringify(data).substring(0, 200))
  const text = data.choices?.[0]?.message?.content?.trim()
  if (!text) throw new Error('No text from Groq')
  return text
}

async function getNextQuestion(systemPrompt: string, history: Message[]): Promise<string> {
  try {
    return await callGroq(
      systemPrompt + '\n\nAsk ONE sharp follow-up question based on what was just said. Output ONLY the question, nothing else.',
      history, 256
    )
  } catch (e) {
    console.error('getNextQuestion error:', e)
    return 'Walk me through your go-to-market strategy in detail.'
  }
}

async function generateScores(systemPrompt: string, history: Message[]): Promise<ScoreResult> {
  const system = `You are a startup pitch evaluator. Analyse this complete Q&A session.
Return ONLY a valid JSON object. Start with { and end with }. No other text.
Use exactly this structure:
{"overall":7.0,"axes":{"problemClarity":{"score":7.0,"note":"one sentence feedback"},"marketSizing":{"score":6.0,"note":"one sentence feedback"},"solutionConfidence":{"score":7.0,"note":"one sentence feedback"},"objectionHandling":{"score":6.0,"note":"one sentence feedback"},"askSpecificity":{"score":7.0,"note":"one sentence feedback"},"storytelling":{"score":7.0,"note":"one sentence feedback"}},"topStrength":"problemClarity","topWeakness":"objectionHandling","summary":"Two sentence overall feedback from investor perspective."}`
  try {
    const raw = await callGroq(system, history, 1024)
    const match = raw.match(/\{[\s\S]*\}/)
    if (!match) throw new Error('No JSON found')
    return JSON.parse(match[0]) as ScoreResult
  } catch (e) {
    console.error('generateScores error:', e)
    return {
      overall: 5.0,
      axes: {
        problemClarity: { score: 5, note: 'Could not evaluate.' },
        marketSizing: { score: 5, note: 'Could not evaluate.' },
        solutionConfidence: { score: 5, note: 'Could not evaluate.' },
        objectionHandling: { score: 5, note: 'Could not evaluate.' },
        askSpecificity: { score: 5, note: 'Could not evaluate.' },
        storytelling: { score: 5, note: 'Could not evaluate.' },
      },
      topStrength: 'problemClarity',
      topWeakness: 'objectionHandling',
      summary: 'Scoring failed. Please try again.',
    }
  }
}

// ─── Waveform ─────────────────────────────────────────────────────────────────

function Waveform({ active, color }: { active: boolean; color: string }) {
  const anims = useRef(Array.from({ length: 24 }, () => new Animated.Value(0.15))).current
  useEffect(() => {
    if (!active) { anims.forEach(a => Animated.spring(a, { toValue: 0.15, useNativeDriver: true }).start()); return }
    const loops = anims.map((a, i) => Animated.loop(Animated.sequence([
      Animated.timing(a, { toValue: 0.25 + Math.random() * 0.75, duration: 180 + i * 20 + Math.random() * 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
      Animated.timing(a, { toValue: 0.1 + Math.random() * 0.25, duration: 180 + Math.random() * 220, easing: Easing.inOut(Easing.sin), useNativeDriver: true }),
    ])))
    loops.forEach(l => l.start())
    return () => loops.forEach(l => l.stop())
  }, [active])
  return (
    <View style={wfStyles.row}>
      {anims.map((a, i) => <Animated.View key={i} style={[wfStyles.bar, { backgroundColor: color, transform: [{ scaleY: a }] }]} />)}
    </View>
  )
}
const wfStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', height: 44, gap: 2.5 },
  bar: { width: 3, height: 36, borderRadius: 2, opacity: 0.85 },
})

// ─── Progress pills ───────────────────────────────────────────────────────────

function ProgressPills({ total, current, color }: { total: number; current: number; color: string }) {
  return (
    <View style={pillStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View key={i} style={[pillStyles.pill, i < current && { backgroundColor: color + '88' }, i === current && { backgroundColor: color, width: 22 }]} />
      ))}
    </View>
  )
}
const pillStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  pill: { width: 8, height: 8, borderRadius: 4, backgroundColor: 'rgba(255,255,255,0.15)' },
})

// ─── Typing dots ──────────────────────────────────────────────────────────────

function TypingDots({ color }: { color: string }) {
  const dots = useRef([0, 1, 2].map(() => new Animated.Value(0))).current
  useEffect(() => {
    const loops = dots.map((d, i) => Animated.loop(Animated.sequence([
      Animated.delay(i * 160),
      Animated.timing(d, { toValue: 1, duration: 300, useNativeDriver: true }),
      Animated.timing(d, { toValue: 0, duration: 300, useNativeDriver: true }),
      Animated.delay(320),
    ])))
    loops.forEach(l => l.start())
    return () => loops.forEach(l => l.stop())
  }, [])
  return (
    <View style={tdStyles.wrap}>
      <View style={[tdStyles.bubble, { borderColor: color + '40' }]}>
        <View style={tdStyles.row}>
          {dots.map((d, i) => <Animated.View key={i} style={[tdStyles.dot, { backgroundColor: color, opacity: d }]} />)}
        </View>
      </View>
    </View>
  )
}
const tdStyles = StyleSheet.create({
  wrap: { alignSelf: 'flex-start', marginBottom: 12 },
  bubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderRadius: 16, borderTopLeftRadius: 4, paddingHorizontal: 16, paddingVertical: 12 },
  row: { flexDirection: 'row', gap: 5, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
})

// ─── Message bubble ───────────────────────────────────────────────────────────

function Bubble({ message, persona }: { message: Message; persona: (typeof PERSONAS)[string] }) {
  const isAI = message.role === 'assistant'
  const opacity = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(8)).current
  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 280, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 90, friction: 10, useNativeDriver: true }),
    ]).start()
  }, [])
  return (
    <Animated.View style={[bStyles.wrap, isAI ? bStyles.aiWrap : bStyles.userWrap, { opacity, transform: [{ translateY: ty }] }]}>
      {isAI && (
        <View style={[bStyles.avatar, { backgroundColor: persona.color + '22', borderColor: persona.color + '55' }]}>
          <Text style={[bStyles.initials, { color: persona.color }]}>{persona.initials}</Text>
        </View>
      )}
      <View style={[bStyles.bubble, isAI ? [bStyles.aiBubble, { borderColor: persona.color + '35' }] : bStyles.userBubble]}>
        <Text style={[bStyles.text, isAI ? bStyles.aiText : bStyles.userText]}>{message.content}</Text>
      </View>
    </Animated.View>
  )
}
const bStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', marginBottom: 10, alignItems: 'flex-end', gap: 9 },
  aiWrap: { alignSelf: 'flex-start', maxWidth: '88%' },
  userWrap: { alignSelf: 'flex-end', flexDirection: 'row-reverse', maxWidth: '83%' },
  avatar: { width: 30, height: 30, borderRadius: 15, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  initials: { fontSize: 11, fontWeight: '700', letterSpacing: 0.3 },
  bubble: { borderRadius: 18, paddingHorizontal: 15, paddingVertical: 11 },
  aiBubble: { backgroundColor: 'rgba(255,255,255,0.055)', borderWidth: 1, borderTopLeftRadius: 5, flex: 1 },
  userBubble: { backgroundColor: 'rgba(255,255,255,0.10)', borderTopRightRadius: 5 },
  text: { fontSize: 14.5, lineHeight: 22 },
  aiText: { color: '#DDD9FF' },
  userText: { color: '#FFFFFF' },
})

// ─── Mic button ───────────────────────────────────────────────────────────────

function MicButton({ recording, onPress, color }: { recording: boolean; onPress: () => void; color: string }) {
  const scale = useRef(new Animated.Value(1)).current
  const ring = useRef(new Animated.Value(0)).current
  useEffect(() => {
    if (recording) {
      Animated.loop(Animated.sequence([
        Animated.timing(scale, { toValue: 1.08, duration: 650, useNativeDriver: true }),
        Animated.timing(scale, { toValue: 1, duration: 650, useNativeDriver: true }),
      ])).start()
      Animated.loop(Animated.sequence([
        Animated.timing(ring, { toValue: 1, duration: 900, useNativeDriver: true }),
        Animated.timing(ring, { toValue: 0, duration: 300, useNativeDriver: true }),
      ])).start()
    } else {
      scale.stopAnimation()
      ring.stopAnimation()
      Animated.timing(scale, { toValue: 1, duration: 200, useNativeDriver: true }).start()
      Animated.timing(ring, { toValue: 0, duration: 200, useNativeDriver: true }).start()
    }
  }, [recording])
  const ringScale = ring.interpolate({ inputRange: [0, 1], outputRange: [1, 1.55] })
  const ringOpacity = ring.interpolate({ inputRange: [0, 0.4, 1], outputRange: [0, 0.35, 0] })
  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <View style={mbStyles.outer}>
        <Animated.View style={[mbStyles.ring, { borderColor: color, transform: [{ scale: ringScale }], opacity: ringOpacity }]} />
        <Animated.View style={[mbStyles.btn, { backgroundColor: recording ? color : color + '18', borderColor: color, transform: [{ scale }] }]}>
          <Text style={mbStyles.icon}>{recording ? '■' : '●'}</Text>
          <Text style={[mbStyles.label, { color: recording ? '#fff' : color }]}>{recording ? 'Stop' : 'Speak'}</Text>
        </Animated.View>
      </View>
    </TouchableOpacity>
  )
}
const mbStyles = StyleSheet.create({
  outer: { width: 88, height: 88, alignItems: 'center', justifyContent: 'center' },
  ring: { position: 'absolute', width: 88, height: 88, borderRadius: 44, borderWidth: 2 },
  btn: { width: 80, height: 80, borderRadius: 40, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', gap: 2 },
  icon: { fontSize: 20, color: '#fff' },
  label: { fontSize: 11, fontWeight: '600', letterSpacing: 0.5 },
})

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function QAScreen() {
  const navigation = useNavigation<QANavProp>()
  const route = useRoute<QARouteProp>()
  const { personaId, pitchTranscript } = route.params
  const persona = PERSONAS[personaId] ?? PERSONAS.aggressive_vc

  const [phase, setPhase] = useState<SessionPhase>('loading_first_q')
  const [transcript, setTranscript] = useState<Message[]>([{ role: 'user', content: pitchTranscript }])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [textInput, setTextInput] = useState('')
  const [inputMode, setInputMode] = useState<'voice' | 'text'>('voice')
  const [elapsed, setElapsed] = useState(0)

  const scrollRef = useRef<ScrollView>(null)
  const recordingRef = useRef<Audio.Recording | null>(null)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  useEffect(() => {
    timerRef.current = setInterval(() => setElapsed(s => s + 1), 1000)
    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [])

  const fmt = (s: number) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`

  useEffect(() => { loadQuestion([{ role: 'user', content: pitchTranscript }]) }, [])

  const loadQuestion = useCallback(async (history: Message[]) => {
    setPhase('loading_first_q')
    try {
      const q = await getNextQuestion(persona.systemPrompt, history)
      setTranscript([...history, { role: 'assistant', content: q }])
      setPhase('questioning')
      setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120)
    } catch (e) {
      console.error(e)
      setPhase('questioning')
    }
  }, [persona])

  const startRecording = async () => {
    try {
      const { granted } = await Audio.requestPermissionsAsync()
      if (!granted) return
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true })
      const { recording } = await Audio.Recording.createAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY)
      recordingRef.current = recording
      setPhase('recording')
      Vibration.vibrate(30)
    } catch (e) { console.error('Record start error:', e) }
  }

  const stopRecording = async () => {
    if (!recordingRef.current) return
    setPhase('processing')
    Vibration.vibrate(30)
    try {
      await recordingRef.current.stopAndUnloadAsync()
      recordingRef.current = null
      await submitAnswer('[Voice answer — Whisper transcription not yet integrated]')
    } catch (e) { console.error('Record stop error:', e); setPhase('questioning') }
  }

  const submitAnswer = useCallback(async (answer: string) => {
    if (!answer.trim()) return
    setTextInput('')
    setPhase('processing')
    const userMsg: Message = { role: 'user', content: answer.trim() }
    const updated: Message[] = [...transcript, userMsg]
    setTranscript(updated)
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 100)
    const next = questionIndex + 1
    if (next >= TOTAL_QUESTIONS) {
      setPhase('scoring')
      if (timerRef.current) clearInterval(timerRef.current)
      try {
        const scores = await generateScores(persona.systemPrompt, updated)
      navigation.replace('ScoreReport', {
  sessionId: Date.now().toString(),
  scores,
  personaId,
  durationSeconds: elapsed,
})      } catch (e) { console.error('Scoring error:', e) }
      return
    }
    setQuestionIndex(next)
    await loadQuestion(updated)
  }, [transcript, questionIndex, persona, navigation, loadQuestion])

  const isLoading = phase === 'loading_first_q' || phase === 'processing'
  const isInteractive = phase === 'questioning' || phase === 'recording'

  return (
    <SafeAreaView style={s.safe}>
      <View style={s.header}>
        <View style={[s.personaChip, { borderColor: persona.color + '50' }]}>
          <View style={[s.dot, { backgroundColor: persona.color }]} />
          <Text style={s.personaName}>{persona.name}</Text>
          <Text style={[s.personaRole, { color: persona.color }]}>{persona.title}</Text>
        </View>
        <View style={s.headerMeta}>
          <Text style={s.timer}>{fmt(elapsed)}</Text>
          <ProgressPills total={TOTAL_QUESTIONS} current={questionIndex} color={persona.color} />
        </View>
      </View>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined} keyboardVerticalOffset={110}>
        <ScrollView ref={scrollRef} style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>
          {transcript.slice(1).map((msg, i) => <Bubble key={i} message={msg} persona={persona} />)}
          {isLoading && <TypingDots color={persona.color} />}
          {phase === 'scoring' && (
            <View style={s.scoringRow}>
              <ActivityIndicator color={persona.color} size="small" />
              <Text style={s.scoringText}>Analysing your session…</Text>
            </View>
          )}
        </ScrollView>
        {isInteractive && (
          <View style={s.inputArea}>
            <View style={s.toggleRow}>
              {(['voice', 'text'] as const).map(m => (
                <TouchableOpacity key={m} style={[s.toggleBtn, inputMode === m && s.toggleBtnActive]} onPress={() => setInputMode(m)}>
                  <Text style={[s.toggleLabel, inputMode === m && { color: '#fff' }]}>{m === 'voice' ? 'Voice' : 'Type'}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {inputMode === 'voice' ? (
              <View style={s.voiceBlock}>
                {phase === 'recording' && <Waveform active color={persona.color} />}
                <MicButton recording={phase === 'recording'} onPress={phase === 'recording' ? stopRecording : startRecording} color={persona.color} />
                <Text style={s.micHint}>{phase === 'recording' ? 'Tap to finish' : 'Tap to answer'}</Text>
              </View>
            ) : (
              <View style={s.textRow}>
                <TextInput style={s.textInput} value={textInput} onChangeText={setTextInput} placeholder="Type your answer…" placeholderTextColor="rgba(255,255,255,0.25)" multiline maxLength={600} />
                <TouchableOpacity style={[s.sendBtn, { backgroundColor: textInput.trim() ? persona.color : persona.color + '33' }]} onPress={() => submitAnswer(textInput)} disabled={!textInput.trim()}>
                  <Text style={s.sendArrow}>↑</Text>
                </TouchableOpacity>
              </View>
            )}
            <Text style={s.qLabel}>Q{questionIndex + 1} / {TOTAL_QUESTIONS}</Text>
          </View>
        )}
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

const BG = '#0C0C13'
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 18, paddingVertical: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.08)' },
  personaChip: { flexDirection: 'row', alignItems: 'center', gap: 7, borderWidth: 1, borderRadius: 22, paddingHorizontal: 12, paddingVertical: 6 },
  dot: { width: 7, height: 7, borderRadius: 4 },
  personaName: { color: '#fff', fontSize: 13, fontWeight: '600' },
  personaRole: { fontSize: 11, fontWeight: '500' },
  headerMeta: { alignItems: 'flex-end', gap: 5 },
  timer: { color: 'rgba(255,255,255,0.4)', fontSize: 12, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
  scroll: { flex: 1 },
  scrollContent: { padding: 18, paddingBottom: 12 },
  scoringRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'rgba(255,255,255,0.05)', borderRadius: 14, padding: 14, marginTop: 6 },
  scoringText: { color: 'rgba(255,255,255,0.5)', fontSize: 14 },
  inputArea: { borderTopWidth: StyleSheet.hairlineWidth, borderTopColor: 'rgba(255,255,255,0.08)', backgroundColor: BG, paddingHorizontal: 20, paddingTop: 14, paddingBottom: Platform.OS === 'ios' ? 28 : 18, alignItems: 'center', gap: 14 },
  toggleRow: { flexDirection: 'row', backgroundColor: 'rgba(255,255,255,0.07)', borderRadius: 22, padding: 3 },
  toggleBtn: { paddingHorizontal: 20, paddingVertical: 7, borderRadius: 19 },
  toggleBtnActive: { backgroundColor: 'rgba(255,255,255,0.14)' },
  toggleLabel: { fontSize: 13, fontWeight: '500', color: 'rgba(255,255,255,0.38)' },
  voiceBlock: { alignItems: 'center', gap: 10, width: '100%' },
  micHint: { color: 'rgba(255,255,255,0.3)', fontSize: 12 },
  textRow: { flexDirection: 'row', alignItems: 'flex-end', gap: 10, width: '100%' },
  textInput: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.15)', borderRadius: 18, paddingHorizontal: 16, paddingVertical: 12, color: '#fff', fontSize: 14, maxHeight: 120, lineHeight: 20 },
  sendBtn: { width: 46, height: 46, borderRadius: 23, alignItems: 'center', justifyContent: 'center' },
  sendArrow: { color: '#fff', fontSize: 20, fontWeight: '700' },
  qLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 11, fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace' },
})