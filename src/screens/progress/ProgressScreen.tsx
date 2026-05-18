// =============================================================================
// screens/progress/ProgressScreen.tsx
// PitchSim — Progress & session history with tappable replay
// =============================================================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  SafeAreaView, Animated, Platform, Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useUserStore } from '../../store/userStore'
import { getUserSessionSummaries } from '../../services/sessionService'
import type { SessionSummary } from '../../types/session.types'

type RootStackParamList = {
  SessionDetail: { sessionId: string }
}
type Nav = NativeStackNavigationProp<RootStackParamList>

const { width: W } = Dimensions.get('window')

const PERSONAS: Record<string, { name: string; color: string; initials: string }> = {
  aggressive_vc: { name: 'Marcus Reid', color: '#E24B4A', initials: 'MR' },
  angel:         { name: 'Priya Nair', color: '#1D9E75', initials: 'PN' },
  corporate:     { name: 'David Chen', color: '#378ADD', initials: 'DC' },
  skeptic:       { name: 'Sofia Bauer', color: '#EF9F27', initials: 'SB' },
  mentor:        { name: 'James Okoye', color: '#7F77DD', initials: 'JO' },
}

const AXIS_LABELS: Record<string, string> = {
  problemClarity: 'Problem',
  marketSizing: 'Market',
  solutionConfidence: 'Solution',
  objectionHandling: 'Objection',
  askSpecificity: 'Ask',
  storytelling: 'Story',
}

function scoreColor(score: number) {
  if (score >= 8) return '#1D9E75'
  if (score >= 6) return '#EF9F27'
  return '#E24B4A'
}

// ─── Mini score chart (last 7 sessions) ──────────────────────────────────────

function ScoreTrend({ sessions }: { sessions: SessionSummary[] }) {
  const recent = sessions.slice(0, 7).reverse()
  if (recent.length < 2) return null

  const max = 10
  const min = 0
  const chartH = 60
  const chartW = W - 80

  const points = recent.map((s, i) => ({
    x: (i / (recent.length - 1)) * chartW,
    y: chartH - ((s.overallScore - min) / (max - min)) * chartH,
    score: s.overallScore,
  }))

  const pathD = points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ')

  return (
    <View style={trendStyles.wrap}>
      <Text style={trendStyles.title}>Score trend</Text>
      <Text style={trendStyles.sub}>Last {recent.length} sessions</Text>
      <View style={trendStyles.chart}>
        {/* Grid lines */}
        {[2, 5, 8].map(v => (
          <View key={v} style={[trendStyles.gridLine, { bottom: ((v - min) / (max - min)) * chartH }]}>
            <Text style={trendStyles.gridLabel}>{v}</Text>
          </View>
        ))}
        {/* Score dots */}
        {points.map((p, i) => (
          <View
            key={i}
            style={[trendStyles.dot, {
              left: p.x - 5,
              top: p.y - 5,
              backgroundColor: scoreColor(p.score),
            }]}
          />
        ))}
        {/* Score labels on dots */}
        {points.map((p, i) => (
          <Text key={`label-${i}`} style={[trendStyles.dotLabel, { left: p.x - 10, top: p.y - 20 }]}>
            {p.score.toFixed(1)}
          </Text>
        ))}
      </View>
    </View>
  )
}

const trendStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 20, marginBottom: 24,
  },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 2 },
  sub: { color: 'rgba(255,255,255,0.35)', fontSize: 12, marginBottom: 16 },
  chart: { height: 60, position: 'relative' },
  gridLine: {
    position: 'absolute', left: 0, right: 0,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.07)',
  },
  gridLabel: { color: 'rgba(255,255,255,0.2)', fontSize: 9, marginTop: -6, marginLeft: -2 },
  dot: { position: 'absolute', width: 10, height: 10, borderRadius: 5 },
  dotLabel: { position: 'absolute', color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '600' },
})

// ─── Axis average bars ────────────────────────────────────────────────────────

function AxisAverages({ sessions }: { sessions: SessionSummary[] }) {
  if (sessions.length === 0) return null

  // We only have summaries here — show what we can from topStrength/topWeakness counts
  const strengthCounts: Record<string, number> = {}
  const weaknessCounts: Record<string, number> = {}

  sessions.forEach(s => {
    if (s.topStrength) strengthCounts[s.topStrength] = (strengthCounts[s.topStrength] ?? 0) + 1
    if (s.topWeakness) weaknessCounts[s.topWeakness] = (weaknessCounts[s.topWeakness] ?? 0) + 1
  })

  const topStrength = Object.entries(strengthCounts).sort((a, b) => b[1] - a[1])[0]?.[0]
  const topWeakness = Object.entries(weaknessCounts).sort((a, b) => b[1] - a[1])[0]?.[0]

  return (
    <View style={axStyles.wrap}>
      <Text style={axStyles.title}>Patterns across sessions</Text>
      <View style={axStyles.row}>
        {topStrength && (
          <View style={[axStyles.card, axStyles.strengthCard]}>
            <Text style={axStyles.cardIcon}>💪</Text>
            <Text style={axStyles.cardLabel}>Consistent strength</Text>
            <Text style={[axStyles.cardValue, { color: '#1D9E75' }]}>
              {AXIS_LABELS[topStrength] ?? topStrength}
            </Text>
          </View>
        )}
        {topWeakness && (
          <View style={[axStyles.card, axStyles.weaknessCard]}>
            <Text style={axStyles.cardIcon}>🎯</Text>
            <Text style={axStyles.cardLabel}>Focus area</Text>
            <Text style={[axStyles.cardValue, { color: '#E24B4A' }]}>
              {AXIS_LABELS[topWeakness] ?? topWeakness}
            </Text>
          </View>
        )}
      </View>
    </View>
  )
}

const axStyles = StyleSheet.create({
  wrap: { marginBottom: 24 },
  title: { color: '#fff', fontSize: 15, fontWeight: '600', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  card: { flex: 1, borderRadius: 16, padding: 16, gap: 6, borderWidth: 1 },
  strengthCard: { backgroundColor: 'rgba(29,158,117,0.08)', borderColor: 'rgba(29,158,117,0.25)' },
  weaknessCard: { backgroundColor: 'rgba(226,75,74,0.08)', borderColor: 'rgba(226,75,74,0.25)' },
  cardIcon: { fontSize: 20 },
  cardLabel: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase' },
  cardValue: { fontSize: 14, fontWeight: '700' },
})

// ─── Session card (tappable) ──────────────────────────────────────────────────

function SessionCard({ session, index, onPress }: {
  session: SessionSummary
  index: number
  onPress: () => void
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(16)).current
  const persona = PERSONAS[session.personaId] ?? { name: 'Unknown', color: '#7F77DD', initials: '??' }
  const overallColor = scoreColor(session.overallScore)

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 60, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 80, friction: 12, delay: index * 60, useNativeDriver: true }),
    ]).start()
  }, [])

  const date = new Date(session.createdAt)
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })
  const duration = Math.floor(session.durationSeconds / 60) + 'm'

  return (
    <Animated.View style={{ opacity, transform: [{ translateY: ty }] }}>
      <TouchableOpacity style={scStyles.card} onPress={onPress} activeOpacity={0.8}>
        {/* Left — persona avatar */}
        <View style={[scStyles.avatar, { backgroundColor: persona.color + '20', borderColor: persona.color + '50' }]}>
          <Text style={[scStyles.initials, { color: persona.color }]}>{persona.initials}</Text>
        </View>

        {/* Middle — info */}
        <View style={scStyles.info}>
          <Text style={scStyles.personaName}>{persona.name}</Text>
          <Text style={scStyles.date}>{dateStr} · {timeStr}</Text>
          <View style={scStyles.tags}>
            <View style={[scStyles.tag, { backgroundColor: '#1D9E7518' }]}>
              <Text style={[scStyles.tagText, { color: '#1D9E75' }]}>
                ↑ {AXIS_LABELS[session.topStrength] ?? session.topStrength}
              </Text>
            </View>
            <View style={[scStyles.tag, { backgroundColor: '#E24B4A18' }]}>
              <Text style={[scStyles.tagText, { color: '#E24B4A' }]}>
                ↓ {AXIS_LABELS[session.topWeakness] ?? session.topWeakness}
              </Text>
            </View>
          </View>
        </View>

        {/* Right — score + replay */}
        <View style={scStyles.right}>
          <Text style={[scStyles.score, { color: overallColor }]}>{session.overallScore.toFixed(1)}</Text>
          <Text style={scStyles.scoreLabel}>/ 10</Text>
          <View style={scStyles.replayBtn}>
            <Text style={scStyles.replayText}>Replay →</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  )
}

const scStyles = StyleSheet.create({
  card: {
    flexDirection: 'row', alignItems: 'center', gap: 12,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16, padding: 14, marginBottom: 10,
  },
  avatar: { width: 44, height: 44, borderRadius: 22, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 13, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  personaName: { color: '#fff', fontSize: 14, fontWeight: '600' },
  date: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 3, flexWrap: 'wrap' },
  tag: { borderRadius: 6, paddingHorizontal: 6, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '500' },
  right: { alignItems: 'flex-end', gap: 2 },
  score: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  scoreLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
  replayBtn: { backgroundColor: 'rgba(127,119,221,0.15)', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 4, marginTop: 4 },
  replayText: { color: '#7F77DD', fontSize: 10, fontWeight: '600' },
})

// ─── Filter tabs ──────────────────────────────────────────────────────────────

const FILTERS = ['All', 'Marcus', 'Priya', 'David', 'Sofia', 'James']
const FILTER_MAP: Record<string, string> = {
  'Marcus': 'aggressive_vc', 'Priya': 'angel',
  'David': 'corporate', 'Sofia': 'skeptic', 'James': 'mentor',
}

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ProgressScreen() {
  const navigation = useNavigation<Nav>()
  const profile = useUserStore(s => s.profile)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')

  useEffect(() => {
    if (profile?.uid) {
      getUserSessionSummaries(profile.uid, 50)
        .then(setSessions)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [profile])

  const filtered = filter === 'All'
    ? sessions
    : sessions.filter(s => s.personaId === FILTER_MAP[filter])

  const avgScore = sessions.length > 0
    ? (sessions.reduce((sum, s) => sum + s.overallScore, 0) / sessions.length).toFixed(1)
    : '—'

  const bestScore = sessions.length > 0
    ? Math.max(...sessions.map(s => s.overallScore)).toFixed(1)
    : '—'

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <View style={s.header}>
          <Text style={s.title}>Your progress</Text>
          <Text style={s.sub}>{sessions.length} session{sessions.length !== 1 ? 's' : ''} completed</Text>
        </View>

        {/* Top stats */}
        {sessions.length > 0 && (
          <View style={s.statsRow}>
            <View style={s.statBox}>
              <Text style={s.statNum}>{avgScore}</Text>
              <Text style={s.statLabel}>Avg score</Text>
            </View>
            <View style={[s.statDivider]} />
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: '#1D9E75' }]}>{bestScore}</Text>
              <Text style={s.statLabel}>Best score</Text>
            </View>
            <View style={s.statDivider} />
            <View style={s.statBox}>
              <Text style={[s.statNum, { color: '#EF9F27' }]}>{profile?.stats.streak ?? 0}</Text>
              <Text style={s.statLabel}>Day streak</Text>
            </View>
          </View>
        )}

        {/* Score trend chart */}
        {sessions.length >= 2 && <ScoreTrend sessions={sessions} />}

        {/* Patterns */}
        {sessions.length >= 3 && <AxisAverages sessions={sessions} />}

        {/* Filter tabs */}
        {sessions.length > 0 && (
          <>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.filterScroll} contentContainerStyle={s.filterContent}>
              {FILTERS.map(f => (
                <TouchableOpacity
                  key={f}
                  style={[s.filterTab, filter === f && s.filterTabActive]}
                  onPress={() => setFilter(f)}
                >
                  <Text style={[s.filterText, filter === f && s.filterTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <Text style={s.sectionTitle}>
              {filtered.length} session{filtered.length !== 1 ? 's' : ''}
              {filter !== 'All' ? ` with ${filter}` : ''}
            </Text>

            {filtered.map((session, i) => (
              <SessionCard
                key={session.id}
                session={session}
                index={i}
                onPress={() => navigation.navigate('SessionDetail', { sessionId: session.id })}
              />
            ))}
          </>
        )}

        {/* Empty state */}
        {!loading && sessions.length === 0 && (
          <View style={s.empty}>
            <Text style={s.emptyIcon}>📈</Text>
            <Text style={s.emptyTitle}>No sessions yet</Text>
            <Text style={s.emptyBody}>Complete your first pitch session to see your progress tracked here.</Text>
          </View>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

const BG = '#0C0C13'
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 24 },

  header: { marginBottom: 20 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 13, marginTop: 4 },

  statsRow: {
    flexDirection: 'row', alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, padding: 20, marginBottom: 24,
  },
  statBox: { flex: 1, alignItems: 'center', gap: 4 },
  statNum: { color: '#fff', fontSize: 28, fontWeight: '700', letterSpacing: -1 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0.5 },
  statDivider: { width: StyleSheet.hairlineWidth, height: 40, backgroundColor: 'rgba(255,255,255,0.1)' },

  filterScroll: { marginHorizontal: -20, marginBottom: 16 },
  filterContent: { paddingHorizontal: 20, gap: 8 },
  filterTab: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.05)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.08)',
  },
  filterTabActive: { backgroundColor: '#7F77DD', borderColor: '#7F77DD' },
  filterText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, fontWeight: '500' },
  filterTextActive: { color: '#fff' },

  sectionTitle: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 12 },

  empty: { alignItems: 'center', paddingTop: 60, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptyBody: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
})
