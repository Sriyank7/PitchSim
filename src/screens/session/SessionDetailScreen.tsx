// =============================================================================
// screens/session/SessionDetailScreen.tsx
// PitchSim — Full session transcript replay
// =============================================================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Animated, ActivityIndicator, Platform,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { getSessionById } from '../../services/sessionService'
import type { Session } from '../../types/session.types'

type RootStackParamList = {
  SessionDetail: { sessionId: string }
  ScoreReport: { sessionId: string; scores: any; personaId: string; durationSeconds: number }
}

type Route = RouteProp<RootStackParamList, 'SessionDetail'>
type Nav = NativeStackNavigationProp<RootStackParamList>

const PERSONAS: Record<string, { name: string; title: string; color: string; initials: string }> = {
  aggressive_vc: { name: 'Marcus Reid', title: 'Aggressive VC', color: '#E24B4A', initials: 'MR' },
  angel:         { name: 'Priya Nair', title: 'Angel Investor', color: '#1D9E75', initials: 'PN' },
  corporate:     { name: 'David Chen', title: 'Corporate Strategist', color: '#378ADD', initials: 'DC' },
  skeptic:       { name: 'Sofia Bauer', title: 'Skeptical Analyst', color: '#EF9F27', initials: 'SB' },
  mentor:        { name: 'James Okoye', title: 'Mentor Investor', color: '#7F77DD', initials: 'JO' },
}

const AXIS_LABELS: Record<string, string> = {
  problemClarity: 'Problem Clarity',
  marketSizing: 'Market Sizing',
  solutionConfidence: 'Solution Confidence',
  objectionHandling: 'Objection Handling',
  askSpecificity: 'Ask Specificity',
  storytelling: 'Storytelling',
}

function scoreColor(score: number) {
  if (score >= 8) return '#1D9E75'
  if (score >= 6) return '#EF9F27'
  return '#E24B4A'
}

function MessageBubble({ role, content, persona, index }: {
  role: 'user' | 'assistant'
  content: string
  persona: typeof PERSONAS[string]
  index: number
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(10)).current
  const isAI = role === 'assistant'

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 300, delay: index * 60, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 80, friction: 12, delay: index * 60, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[
      bs.wrap,
      isAI ? bs.aiWrap : bs.userWrap,
      { opacity, transform: [{ translateY: ty }] }
    ]}>
      {isAI && (
        <View style={[bs.avatar, { backgroundColor: persona.color + '20', borderColor: persona.color + '50' }]}>
          <Text style={[bs.initials, { color: persona.color }]}>{persona.initials}</Text>
        </View>
      )}
      <View style={[
        bs.bubble,
        isAI ? [bs.aiBubble, { borderColor: persona.color + '30' }] : bs.userBubble
      ]}>
        {isAI && <Text style={[bs.roleLabel, { color: persona.color }]}>{persona.name}</Text>}
        <Text style={[bs.text, isAI ? bs.aiText : bs.userText]}>{content}</Text>
      </View>
    </Animated.View>
  )
}

const bs = StyleSheet.create({
  wrap: { flexDirection: 'row', marginBottom: 12, alignItems: 'flex-start', gap: 10 },
  aiWrap: { alignSelf: 'flex-start', maxWidth: '90%' },
  userWrap: { alignSelf: 'flex-end', flexDirection: 'row-reverse', maxWidth: '85%' },
  avatar: { width: 32, height: 32, borderRadius: 16, borderWidth: 1, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  initials: { fontSize: 11, fontWeight: '700' },
  bubble: { borderRadius: 16, paddingHorizontal: 14, paddingVertical: 10, flex: 1 },
  aiBubble: { backgroundColor: 'rgba(255,255,255,0.05)', borderWidth: 1, borderTopLeftRadius: 4 },
  userBubble: { backgroundColor: 'rgba(127,119,221,0.15)', borderTopRightRadius: 4 },
  roleLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.5, marginBottom: 4, textTransform: 'uppercase' },
  text: { fontSize: 14, lineHeight: 22 },
  aiText: { color: 'rgba(255,255,255,0.85)' },
  userText: { color: '#FFFFFF' },
})

export default function SessionDetailScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { sessionId } = route.params
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getSessionById(sessionId).then(s => {
      setSession(s)
      setLoading(false)
    })
  }, [sessionId])

  if (loading) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <ActivityIndicator color="#7F77DD" size="large" />
          <Text style={s.loadingText}>Loading session...</Text>
        </View>
      </SafeAreaView>
    )
  }

  if (!session) {
    return (
      <SafeAreaView style={s.safe}>
        <View style={s.loadingWrap}>
          <Text style={s.loadingText}>Session not found.</Text>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={s.backLink}>← Go back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    )
  }

  const persona = PERSONAS[session.personaId] ?? PERSONAS.mentor
  const date = new Date(session.createdAt)
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' })
  const duration = Math.floor(session.durationSeconds / 60) + 'm ' + (session.durationSeconds % 60) + 's'
  const overallColor = scoreColor(session.scores.overall)

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={s.backArrow}>←</Text>
        </TouchableOpacity>
        <View style={s.headerCenter}>
          <Text style={s.headerTitle}>Session replay</Text>
          <Text style={s.headerSub}>{dateStr}</Text>
        </View>
        <View style={[s.scorePill, { borderColor: overallColor + '60' }]}>
          <Text style={[s.scorePillNum, { color: overallColor }]}>{session.scores.overall.toFixed(1)}</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Persona + meta */}
        <View style={[s.metaCard, { borderColor: persona.color + '40' }]}>
          <View style={[s.metaAvatar, { backgroundColor: persona.color + '20', borderColor: persona.color + '50' }]}>
            <Text style={[s.metaInitials, { color: persona.color }]}>{persona.initials}</Text>
          </View>
          <View style={s.metaInfo}>
            <Text style={s.metaName}>{persona.name}</Text>
            <Text style={[s.metaTitle, { color: persona.color }]}>{persona.title}</Text>
            <Text style={s.metaDuration}>{session.questionCount} questions · {duration}</Text>
          </View>
        </View>

        {/* Score breakdown */}
        <Text style={s.sectionTitle}>Score breakdown</Text>
        <View style={s.scoresGrid}>
          {Object.entries(session.scores.axes).map(([key, val]) => (
            <View key={key} style={s.axisRow}>
              <Text style={s.axisLabel}>{AXIS_LABELS[key] ?? key}</Text>
              <View style={s.axisBarWrap}>
                <View style={[s.axisBar, { width: `${val.score * 10}%` as any, backgroundColor: scoreColor(val.score) }]} />
              </View>
              <Text style={[s.axisScore, { color: scoreColor(val.score) }]}>{val.score.toFixed(1)}</Text>
            </View>
          ))}
        </View>

        {/* AI summary */}
        <View style={s.summaryBox}>
          <Text style={s.summaryLabel}>Investor feedback</Text>
          <Text style={s.summaryText}>{session.scores.summary}</Text>
        </View>

        {/* Transcript */}
        <Text style={s.sectionTitle}>Full transcript</Text>
        <Text style={s.transcriptNote}>Your pitch + {session.questionCount} investor questions</Text>

        {session.transcript.map((msg, i) => (
          <MessageBubble
            key={i}
            role={msg.role}
            content={msg.content}
            persona={persona}
            index={i}
          />
        ))}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const BG = '#0C0C13'
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  loadingWrap: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  loadingText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  backLink: { color: '#7F77DD', fontSize: 14 },

  header: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    paddingHorizontal: 20, paddingVertical: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(255,255,255,0.08)',
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, backgroundColor: 'rgba(255,255,255,0.07)', alignItems: 'center', justifyContent: 'center' },
  backArrow: { color: '#fff', fontSize: 18 },
  headerCenter: { flex: 1 },
  headerTitle: { color: '#fff', fontSize: 15, fontWeight: '600' },
  headerSub: { color: 'rgba(255,255,255,0.4)', fontSize: 12, marginTop: 1 },
  scorePill: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 10, paddingVertical: 5 },
  scorePillNum: { fontSize: 16, fontWeight: '700' },

  scroll: { flex: 1 },
  content: { padding: 20 },

  metaCard: {
    flexDirection: 'row', alignItems: 'center', gap: 14,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderRadius: 16, padding: 16, marginBottom: 24,
  },
  metaAvatar: { width: 48, height: 48, borderRadius: 24, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  metaInitials: { fontSize: 15, fontWeight: '700' },
  metaInfo: { flex: 1, gap: 2 },
  metaName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  metaTitle: { fontSize: 12, fontWeight: '500' },
  metaDuration: { color: 'rgba(255,255,255,0.3)', fontSize: 11, marginTop: 2 },

  sectionTitle: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 },

  scoresGrid: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 16, gap: 10, marginBottom: 16,
  },
  axisRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  axisLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, width: 100 },
  axisBarWrap: { flex: 1, height: 4, backgroundColor: 'rgba(255,255,255,0.08)', borderRadius: 2, overflow: 'hidden' },
  axisBar: { height: 4, borderRadius: 2 },
  axisScore: { fontSize: 13, fontWeight: '600', width: 28, textAlign: 'right' },

  summaryBox: {
    backgroundColor: 'rgba(127,119,221,0.08)',
    borderWidth: 1, borderColor: 'rgba(127,119,221,0.25)',
    borderRadius: 14, padding: 14, marginBottom: 24, gap: 6,
  },
  summaryLabel: { color: '#7F77DD', fontSize: 11, fontWeight: '700', letterSpacing: 0.5, textTransform: 'uppercase' },
  summaryText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22 },

  transcriptNote: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 16, marginTop: -6 },
})
