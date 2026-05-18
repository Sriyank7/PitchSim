// =============================================================================
// screens/persona/PersonaSelectScreen.tsx
// PitchSim — Investor Persona Selection
// Feature 2: Difficulty rating + rich persona cards
// =============================================================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, Platform, Dimensions,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useSessionStore } from '../../store/sessionStore'
import { useUserStore } from '../../store/userStore'
import { getUserSessionSummaries } from '../../services/sessionService'
import type { SessionSummary } from '../../types/session.types'

type RootStackParamList = {
  PitchTips: { personaId: string }
  PitchRecord: { personaId: string }
}
type Nav = NativeStackNavigationProp<RootStackParamList>

const { width: W } = Dimensions.get('window')

// ─── Persona definitions with difficulty ─────────────────────────────────────

const PERSONAS = [
  {
    id: 'aggressive_vc',
    name: 'Marcus Reid',
    title: 'Aggressive VC',
    firm: 'Apex Ventures',
    initials: 'MR',
    color: '#E24B4A',
    icon: '⚡',
    difficulty: 5,
    difficultyLabel: 'Brutal',
    difficultyColor: '#E24B4A',
    tagline: 'Pushes hard on market size & moats',
    focusAreas: ['Market size', 'Competitive moat', 'Unit economics', 'Traction'],
    description: 'A senior partner who has seen 3,000+ pitches. Relentless on data, zero tolerance for vague answers. Will call out every weak assumption.',
    bestFor: 'Series A readiness',
    avgScore: null as number | null,
  },
  {
    id: 'skeptic',
    name: 'Sofia Bauer',
    title: 'Skeptical Analyst',
    firm: 'Steinberg Capital',
    initials: 'SB',
    color: '#EF9F27',
    icon: '🔍',
    difficulty: 4,
    difficultyLabel: 'Hard',
    difficultyColor: '#EF9F27',
    tagline: 'Questions every number and assumption',
    focusAreas: ['Unit economics', 'Churn data', 'Growth assumptions', 'Burn rate'],
    description: 'Due diligence specialist whose job is to find what\'s wrong. Demands precise numbers. Will not accept industry averages as evidence.',
    bestFor: 'Data & metrics prep',
    avgScore: null as number | null,
  },
  {
    id: 'corporate',
    name: 'David Chen',
    title: 'Corporate Strategist',
    firm: 'Meridian Group',
    initials: 'DC',
    color: '#378ADD',
    icon: '🏢',
    difficulty: 3,
    difficultyLabel: 'Medium',
    difficultyColor: '#378ADD',
    tagline: 'Evaluates enterprise fit & risk',
    focusAreas: ['Enterprise fit', 'Integration', 'Revenue model', 'Compliance'],
    description: 'VP evaluating startups for strategic partnership or acquisition. Systematic, risk-focused, needs you to defend every business model assumption.',
    bestFor: 'Enterprise sales pitch',
    avgScore: null as number | null,
  },
  {
    id: 'angel',
    name: 'Priya Nair',
    title: 'Angel Investor',
    firm: 'Independent',
    initials: 'PN',
    color: '#1D9E75',
    icon: '✨',
    difficulty: 2,
    difficultyLabel: 'Moderate',
    difficultyColor: '#1D9E75',
    tagline: 'Focuses on founder story & vision',
    focusAreas: ['Founder-market fit', 'Motivation', 'Customer empathy', 'Vision'],
    description: 'Successful founder turned investor. Warm but probing. Cares deeply about why you started and whether you truly understand your customer.',
    bestFor: 'Founder narrative',
    avgScore: null as number | null,
  },
  {
    id: 'mentor',
    name: 'James Okoye',
    title: 'Mentor Investor',
    firm: 'Okoye Ventures',
    initials: 'JO',
    color: '#7F77DD',
    icon: '🎯',
    difficulty: 1,
    difficultyLabel: 'Beginner',
    difficultyColor: '#7F77DD',
    tagline: 'Focuses on execution & next steps',
    focusAreas: ['Execution plan', 'Go-to-market', 'Milestones', 'Self-awareness'],
    description: 'Former founder turned mentor. Genuinely wants you to succeed. Asks constructive questions about your next 90 days and what keeps you up at night.',
    bestFor: 'First pitch practice',
    avgScore: null as number | null,
  },
]

// ─── Difficulty dots ───────────────────────────────────────────────────────────

function DifficultyDots({ level, color }: { level: number; color: string }) {
  return (
    <View style={ddStyles.row}>
      {Array.from({ length: 5 }, (_, i) => (
        <View
          key={i}
          style={[
            ddStyles.dot,
            i < level ? { backgroundColor: color } : { backgroundColor: 'rgba(255,255,255,0.12)' }
          ]}
        />
      ))}
    </View>
  )
}
const ddStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 4, alignItems: 'center' },
  dot: { width: 7, height: 7, borderRadius: 4 },
})

// ─── Persona card ─────────────────────────────────────────────────────────────

function PersonaCard({
  persona,
  index,
  onPress,
  userAvgScore,
}: {
  persona: typeof PERSONAS[0]
  index: number
  onPress: () => void
  userAvgScore: number | null
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(24)).current
  const [expanded, setExpanded] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 70, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start()
  }, [])

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1
    setExpanded(!expanded)
    Animated.spring(expandAnim, { toValue, tension: 80, friction: 12, useNativeDriver: false }).start()
  }

  const detailHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 140] })
  const detailOpacity = expandAnim.interpolate({ inputRange: [0, 0.5, 1], outputRange: [0, 0, 1] })

  return (
    <Animated.View style={[cStyles.wrap, { opacity, transform: [{ translateY: ty }] }]}>
      <View style={[cStyles.card, { borderColor: expanded ? persona.color + '60' : 'rgba(255,255,255,0.08)' }]}>
        {/* Accent bar */}
        <View style={[cStyles.accentBar, { backgroundColor: persona.color }]} />

        {/* Main row */}
        <View style={cStyles.mainRow}>
          {/* Avatar */}
          <View style={[cStyles.avatar, { backgroundColor: persona.color + '20', borderColor: persona.color + '50' }]}>
            <Text style={cStyles.avatarIcon}>{persona.icon}</Text>
          </View>

          {/* Info */}
          <View style={cStyles.info}>
            <View style={cStyles.nameRow}>
              <Text style={cStyles.name}>{persona.name}</Text>
              <View style={[cStyles.diffBadge, { backgroundColor: persona.difficultyColor + '18', borderColor: persona.difficultyColor + '40' }]}>
                <Text style={[cStyles.diffLabel, { color: persona.difficultyColor }]}>{persona.difficultyLabel}</Text>
              </View>
            </View>
            <Text style={[cStyles.title, { color: persona.color }]}>{persona.title} · {persona.firm}</Text>
            <Text style={cStyles.tagline}>{persona.tagline}</Text>
            <DifficultyDots level={persona.difficulty} color={persona.difficultyColor} />
          </View>
        </View>

        {/* Stats row */}
        <View style={cStyles.statsRow}>
          <View style={cStyles.statItem}>
            <Text style={cStyles.statLabel}>Best for</Text>
            <Text style={[cStyles.statValue, { color: persona.color }]}>{persona.bestFor}</Text>
          </View>
          {userAvgScore !== null && (
            <View style={cStyles.statItem}>
              <Text style={cStyles.statLabel}>Your avg</Text>
              <Text style={[cStyles.statValue, { color: userAvgScore >= 7 ? '#1D9E75' : userAvgScore >= 5 ? '#EF9F27' : '#E24B4A' }]}>
                {userAvgScore.toFixed(1)}/10
              </Text>
            </View>
          )}
          <TouchableOpacity style={cStyles.detailToggle} onPress={toggleExpand}>
            <Text style={[cStyles.detailToggleText, { color: persona.color }]}>
              {expanded ? 'Less ↑' : 'More ↓'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Expandable detail */}
        <Animated.View style={[cStyles.detail, { height: detailHeight, opacity: detailOpacity }]}>
          <Text style={cStyles.detailDesc}>{persona.description}</Text>
          <View style={cStyles.focusRow}>
            {persona.focusAreas.map(f => (
              <View key={f} style={[cStyles.focusChip, { borderColor: persona.color + '40' }]}>
                <Text style={[cStyles.focusText, { color: persona.color }]}>{f}</Text>
              </View>
            ))}
          </View>
        </Animated.View>

        {/* CTA */}
        <TouchableOpacity
          style={[cStyles.btn, { backgroundColor: persona.color }]}
          onPress={onPress}
          activeOpacity={0.85}
        >
          <Text style={cStyles.btnText}>Pitch to {persona.name.split(' ')[0]} →</Text>
        </TouchableOpacity>
      </View>
    </Animated.View>
  )
}

const cStyles = StyleSheet.create({
  wrap: { marginBottom: 12 },
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderRadius: 20,
    padding: 16, gap: 14, overflow: 'hidden', position: 'relative',
  },
  accentBar: { position: 'absolute', top: 0, left: 0, right: 0, height: 2 },
  mainRow: { flexDirection: 'row', gap: 14, alignItems: 'flex-start' },
  avatar: { width: 52, height: 52, borderRadius: 26, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  avatarIcon: { fontSize: 22 },
  info: { flex: 1, gap: 4 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  name: { color: '#fff', fontSize: 16, fontWeight: '700' },
  diffBadge: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 },
  diffLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 0.3 },
  title: { fontSize: 12, fontWeight: '500' },
  tagline: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 18 },
  statsRow: { flexDirection: 'row', alignItems: 'center', gap: 16 },
  statItem: { gap: 2 },
  statLabel: { color: 'rgba(255,255,255,0.35)', fontSize: 10, textTransform: 'uppercase', letterSpacing: 0.5 },
  statValue: { fontSize: 13, fontWeight: '600' },
  detailToggle: { marginLeft: 'auto' },
  detailToggleText: { fontSize: 12, fontWeight: '600' },
  detail: { overflow: 'hidden', gap: 8 },
  detailDesc: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20 },
  focusRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  focusChip: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 3 },
  focusText: { fontSize: 11, fontWeight: '500' },
  btn: { borderRadius: 14, paddingVertical: 13, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 14, fontWeight: '700' },
})

// ─── Difficulty legend ────────────────────────────────────────────────────────

function DifficultyLegend() {
  return (
    <View style={legStyles.wrap}>
      <Text style={legStyles.title}>Difficulty guide</Text>
      <View style={legStyles.row}>
        {[
          { dots: 1, label: 'Beginner', color: '#7F77DD' },
          { dots: 3, label: 'Medium', color: '#378ADD' },
          { dots: 5, label: 'Brutal', color: '#E24B4A' },
        ].map(item => (
          <View key={item.label} style={legStyles.item}>
            <DifficultyDots level={item.dots} color={item.color} />
            <Text style={legStyles.label}>{item.label}</Text>
          </View>
        ))}
      </View>
    </View>
  )
}
const legStyles = StyleSheet.create({
  wrap: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 14, padding: 14, marginBottom: 20,
  },
  title: { color: 'rgba(255,255,255,0.4)', fontSize: 11, fontWeight: '600', letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-around' },
  item: { alignItems: 'center', gap: 5 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 11 },
})

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function PersonaSelectScreen() {
  const navigation = useNavigation<Nav>()
  const setPersona = useSessionStore(s => s.setPersona)
  const profile = useUserStore(s => s.profile)
  const [sessionMap, setSessionMap] = useState<Record<string, number>>({})

  const headerOpacity = useRef(new Animated.Value(0)).current
  const headerTy = useRef(new Animated.Value(-16)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTy, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
    ]).start()

    // Load past session averages per persona
    if (profile?.uid) {
      getUserSessionSummaries(profile.uid, 50).then(sessions => {
        const map: Record<string, number[]> = {}
        sessions.forEach(s => {
          if (!map[s.personaId]) map[s.personaId] = []
          map[s.personaId].push(s.overallScore)
        })
        const avgMap: Record<string, number> = {}
        Object.entries(map).forEach(([id, scores]) => {
          avgMap[id] = scores.reduce((a, b) => a + b, 0) / scores.length
        })
        setSessionMap(avgMap)
      })
    }
  }, [profile])

  const handleSelect = (personaId: string) => {
    setPersona(personaId as any)
  navigation.navigate('PitchTips', { personaId })
  }

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[s.header, { opacity: headerOpacity, transform: [{ translateY: headerTy }] }]}>
          <Text style={s.title}>Choose your investor</Text>
          <Text style={s.sub}>Each persona asks different questions and scores differently. Start easy, work up to Marcus.</Text>
        </Animated.View>

        {/* Difficulty legend */}
        <DifficultyLegend />

        {/* Recommended for beginners banner */}
        {(profile?.stats.totalSessions ?? 0) === 0 && (
          <View style={s.tipBanner}>
            <Text style={s.tipIcon}>💡</Text>
            <View style={s.tipText}>
              <Text style={s.tipTitle}>First time? Start with James</Text>
              <Text style={s.tipBody}>James Okoye is the most supportive persona — perfect for your first session.</Text>
            </View>
          </View>
        )}

        {/* Persona cards — sorted by difficulty desc */}
        {PERSONAS.map((persona, i) => (
          <PersonaCard
            key={persona.id}
            persona={persona}
            index={i}
            onPress={() => handleSelect(persona.id)}
            userAvgScore={sessionMap[persona.id] ?? null}
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
  scroll: { flex: 1 },
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 24 },
  header: { marginBottom: 20, gap: 6 },
  title: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.4)', fontSize: 14, lineHeight: 22 },
  tipBanner: {
    flexDirection: 'row', alignItems: 'flex-start', gap: 12,
    backgroundColor: 'rgba(127,119,221,0.10)',
    borderWidth: 1, borderColor: 'rgba(127,119,221,0.30)',
    borderRadius: 14, padding: 14, marginBottom: 16,
  },
  tipIcon: { fontSize: 20 },
  tipText: { flex: 1, gap: 3 },
  tipTitle: { color: '#fff', fontSize: 13, fontWeight: '600' },
  tipBody: { color: 'rgba(255,255,255,0.45)', fontSize: 12, lineHeight: 18 },
})