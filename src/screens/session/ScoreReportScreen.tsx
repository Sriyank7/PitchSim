// =============================================================================
// screens/session/ScoreReportScreen.tsx
// PitchSim — Score Report with improvement delta (Feature 3)
// =============================================================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  Animated, Easing, Platform, SafeAreaView, Share,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import { useUserStore } from '../../store/userStore'
import { getUserSessionSummaries } from '../../services/sessionService'

// ─── Types ────────────────────────────────────────────────────────────────────

type ScoreResult = {
  overall: number
  axes: Record<string, { score: number; note: string }>
  topStrength: string
  topWeakness: string
  summary: string
}

type RootStackParamList = {
  ScoreReport: {
    sessionId: string
    scores: ScoreResult
    personaId: string
    durationSeconds: number
  }
  Main: undefined
  PersonaSelect: undefined
}

type ReportRouteProp = RouteProp<RootStackParamList, 'ScoreReport'>
type ReportNavProp = NativeStackNavigationProp<RootStackParamList>

// ─── Constants ────────────────────────────────────────────────────────────────

const AXIS_META: Record<string, { label: string; description: string; icon: string }> = {
  problemClarity: { label: 'Problem Clarity', description: 'How clearly you defined the pain point', icon: '🎯' },
  marketSizing: { label: 'Market Sizing', description: 'Your TAM/SAM/SOM articulation', icon: '📊' },
  solutionConfidence: { label: 'Solution Confidence', description: 'How convincingly you pitched your product', icon: '💡' },
  objectionHandling: { label: 'Objection Handling', description: 'How well you addressed pushback', icon: '🛡️' },
  askSpecificity: { label: 'Ask Specificity', description: 'Clarity of your funding ask', icon: '💰' },
  storytelling: { label: 'Storytelling', description: 'Your narrative arc and founder-market fit', icon: '✨' },
}

const PERSONAS: Record<string, { name: string; title: string; color: string }> = {
  aggressive_vc: { name: 'Marcus Reid', title: 'Aggressive VC', color: '#E24B4A' },
  angel: { name: 'Priya Nair', title: 'Angel Investor', color: '#1D9E75' },
  corporate: { name: 'David Chen', title: 'Corporate Strategist', color: '#378ADD' },
  skeptic: { name: 'Sofia Bauer', title: 'Skeptical Analyst', color: '#EF9F27' },
  mentor: { name: 'James Okoye', title: 'Mentor Investor', color: '#7F77DD' },
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function scoreColor(score: number): string {
  if (score >= 8) return '#1D9E75'
  if (score >= 6) return '#EF9F27'
  return '#E24B4A'
}

function scoreGrade(score: number): string {
  if (score >= 9) return 'Exceptional'
  if (score >= 8) return 'Strong'
  if (score >= 7) return 'Good'
  if (score >= 6) return 'Decent'
  if (score >= 5) return 'Needs work'
  return 'Weak'
}

function overallLabel(score: number): string {
  if (score >= 9) return 'Investor Ready'
  if (score >= 7.5) return 'Promising'
  if (score >= 6) return 'Developing'
  return 'Early Stage'
}

// ─── Delta badge ──────────────────────────────────────────────────────────────

function DeltaBadge({ delta }: { delta: number | null }) {
  if (delta === null) return null
  const isPositive = delta > 0
  const isNeutral = delta === 0
  if (isNeutral) return null

  const color = isPositive ? '#1D9E75' : '#E24B4A'
  const bg = isPositive ? '#1D9E7520' : '#E24B4A20'
  const arrow = isPositive ? '↑' : '↓'

  return (
    <View style={[dbStyles.badge, { backgroundColor: bg, borderColor: color + '50' }]}>
      <Text style={[dbStyles.text, { color }]}>
        {arrow} {Math.abs(delta).toFixed(1)}
      </Text>
    </View>
  )
}

const dbStyles = StyleSheet.create({
  badge: {
    borderWidth: 1, borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  text: { fontSize: 11, fontWeight: '700' },
})

// ─── Animated score ring ──────────────────────────────────────────────────────

function ScoreRing({ score, color, delay = 0 }: { score: number; color: string; delay?: number }) {
  const anim = useRef(new Animated.Value(0)).current
  const SIZE = 140
  const countRef = useRef(new Animated.Value(0)).current
  const [displayScore, setDisplayScore] = useState(0)

  useEffect(() => {
    Animated.timing(anim, {
      toValue: score / 10, duration: 1000, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start()

    Animated.timing(countRef, {
      toValue: score, duration: 1000, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start()

    const listener = countRef.addListener(({ value }) => setDisplayScore(value))
    return () => countRef.removeListener(listener)
  }, [])

  return (
    <View style={ringStyles.wrap}>
      <View style={[ringStyles.track, { width: SIZE, height: SIZE, borderRadius: SIZE / 2 }]} />
      <View style={[ringStyles.center, { width: SIZE, height: SIZE }]}>
        <Text style={[ringStyles.scoreNum, { color }]}>{displayScore.toFixed(1)}</Text>
        <Text style={ringStyles.scoreLabel}>{overallLabel(score)}</Text>
      </View>
      <Animated.View
        style={[
          ringStyles.arc,
          {
            width: SIZE, height: SIZE, borderRadius: SIZE / 2,
            borderTopColor: color, borderRightColor: color,
            borderBottomColor: anim.interpolate({
              inputRange: [0, 0.5, 1],
              outputRange: ['transparent', color, color],
            }),
            borderLeftColor: anim.interpolate({
              inputRange: [0, 0.75, 1],
              outputRange: ['transparent', 'transparent', color],
            }),
            transform: [{
              rotate: anim.interpolate({
                inputRange: [0, 1], outputRange: ['-90deg', '270deg'],
              }),
            }],
          },
        ]}
      />
    </View>
  )
}

const ringStyles = StyleSheet.create({
  wrap: { alignItems: 'center', justifyContent: 'center', position: 'relative' },
  track: { borderWidth: 10, borderColor: 'rgba(255,255,255,0.07)', position: 'absolute' },
  arc: { position: 'absolute', borderWidth: 10 },
  center: { position: 'absolute', alignItems: 'center', justifyContent: 'center', gap: 2 },
  scoreNum: { fontSize: 38, fontWeight: '700', letterSpacing: -1 },
  scoreLabel: { fontSize: 12, color: 'rgba(255,255,255,0.45)', fontWeight: '500' },
})

// ─── Axis bar ─────────────────────────────────────────────────────────────────

function AxisBar({
  axisKey,
  data,
  delay,
  delta,
}: {
  axisKey: string
  data: { score: number; note: string }
  delay: number
  delta: number | null
}) {
  const meta = AXIS_META[axisKey] ?? { label: axisKey, description: '', icon: '📌' }
  const anim = useRef(new Animated.Value(0)).current
  const [expanded, setExpanded] = useState(false)
  const expandAnim = useRef(new Animated.Value(0)).current
  const color = scoreColor(data.score)

  useEffect(() => {
    Animated.timing(anim, {
      toValue: data.score / 10, duration: 800, delay,
      easing: Easing.out(Easing.cubic), useNativeDriver: false,
    }).start()
  }, [])

  const toggleExpand = () => {
    const toValue = expanded ? 0 : 1
    setExpanded(!expanded)
    Animated.spring(expandAnim, { toValue, tension: 80, friction: 10, useNativeDriver: false }).start()
  }

  const noteHeight = expandAnim.interpolate({ inputRange: [0, 1], outputRange: [0, 60] })

  return (
    <TouchableOpacity onPress={toggleExpand} activeOpacity={0.8} style={barStyles.card}>
      <View style={barStyles.row}>
        <View style={barStyles.left}>
          <Text style={barStyles.icon}>{meta.icon}</Text>
          <View>
            <Text style={barStyles.label}>{meta.label}</Text>
            <Text style={barStyles.desc}>{meta.description}</Text>
          </View>
        </View>
        <View style={barStyles.right}>
          <DeltaBadge delta={delta} />
          <View style={[barStyles.pill, { backgroundColor: color + '22', borderColor: color + '55' }]}>
            <Text style={[barStyles.pillScore, { color }]}>{data.score.toFixed(1)}</Text>
            <Text style={[barStyles.pillGrade, { color: color + 'BB' }]}>{scoreGrade(data.score)}</Text>
          </View>
        </View>
      </View>

      {/* Bar */}
      <View style={barStyles.track}>
        <Animated.View
          style={[
            barStyles.fill,
            {
              width: anim.interpolate({ inputRange: [0, 1], outputRange: ['0%', '100%'] }),
              backgroundColor: color,
            },
          ]}
        />
        {[0.3, 0.5, 0.7, 0.9].map(p => (
          <View key={p} style={[barStyles.marker, { left: `${p * 100}%` as any }]} />
        ))}
      </View>

      {/* Expandable note */}
      <Animated.View style={[barStyles.noteWrap, { height: noteHeight, opacity: expandAnim }]}>
        <View style={[barStyles.noteBox, { borderLeftColor: color }]}>
          <Text style={barStyles.noteText}>{data.note}</Text>
        </View>
      </Animated.View>

      <Text style={barStyles.tapHint}>{expanded ? 'tap to collapse' : 'tap for feedback'}</Text>
    </TouchableOpacity>
  )
}

const barStyles = StyleSheet.create({
  card: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.09)',
    borderRadius: 16, padding: 14, gap: 10, marginBottom: 10,
  },
  row: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  left: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  right: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  icon: { fontSize: 20 },
  label: { color: '#fff', fontSize: 13.5, fontWeight: '600' },
  desc: { color: 'rgba(255,255,255,0.38)', fontSize: 11, marginTop: 1 },
  pill: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 5, alignItems: 'center' },
  pillScore: { fontSize: 15, fontWeight: '700' },
  pillGrade: { fontSize: 10, fontWeight: '500' },
  track: {
    height: 6, backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: 3, overflow: 'hidden', position: 'relative',
    flexDirection: 'row', alignItems: 'center',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, borderRadius: 3 },
  marker: { position: 'absolute', width: 1, height: 6, backgroundColor: 'rgba(255,255,255,0.12)' },
  noteWrap: { overflow: 'hidden' },
  noteBox: { borderLeftWidth: 2, paddingLeft: 12, paddingTop: 8, paddingBottom: 4 },
  noteText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 20 },
  tapHint: { color: 'rgba(255,255,255,0.18)', fontSize: 10, alignSelf: 'flex-end' },
})

// ─── Improvement summary banner ───────────────────────────────────────────────

function ImprovementBanner({
  deltas,
  overallDelta,
}: {
  deltas: Record<string, number | null>
  overallDelta: number | null
}) {
  if (overallDelta === null) return null

  const improved = Object.entries(deltas).filter(([, d]) => d !== null && d > 0.5)
  const declined = Object.entries(deltas).filter(([, d]) => d !== null && d < -0.5)

  const isImproved = overallDelta > 0
  const color = isImproved ? '#1D9E75' : overallDelta < 0 ? '#E24B4A' : '#EF9F27'
  const bg = isImproved ? '#1D9E7512' : overallDelta < 0 ? '#E24B4A12' : '#EF9F2712'
  const border = color + '35'

  return (
    <View style={[impStyles.wrap, { backgroundColor: bg, borderColor: border }]}>
      <View style={impStyles.header}>
        <Text style={impStyles.icon}>{isImproved ? '📈' : overallDelta < 0 ? '📉' : '➡️'}</Text>
        <View style={impStyles.headerText}>
          <Text style={[impStyles.title, { color }]}>
            {isImproved
              ? `+${overallDelta.toFixed(1)} vs last session`
              : overallDelta < 0
              ? `${overallDelta.toFixed(1)} vs last session`
              : 'Same as last session'}
          </Text>
          <Text style={impStyles.sub}>
            {isImproved
              ? improved.length > 0
                ? `${improved.length} axis improved`
                : 'Overall score up'
              : declined.length > 0
              ? `${declined.length} axis declined — focus here`
              : 'Keep practicing'}
          </Text>
        </View>
      </View>
      {improved.length > 0 && (
        <View style={impStyles.row}>
          <Text style={[impStyles.rowLabel, { color: '#1D9E75' }]}>↑ Improved: </Text>
          <Text style={impStyles.rowValue}>
            {improved.map(([k]) => AXIS_META[k]?.label ?? k).join(', ')}
          </Text>
        </View>
      )}
      {declined.length > 0 && (
        <View style={impStyles.row}>
          <Text style={[impStyles.rowLabel, { color: '#E24B4A' }]}>↓ Declined: </Text>
          <Text style={impStyles.rowValue}>
            {declined.map(([k]) => AXIS_META[k]?.label ?? k).join(', ')}
          </Text>
        </View>
      )}
    </View>
  )
}

const impStyles = StyleSheet.create({
  wrap: { borderWidth: 1, borderRadius: 16, padding: 14, gap: 8, marginBottom: 20 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  icon: { fontSize: 24 },
  headerText: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '700' },
  sub: { color: 'rgba(255,255,255,0.45)', fontSize: 12 },
  row: { flexDirection: 'row', alignItems: 'center' },
  rowLabel: { fontSize: 12, fontWeight: '600' },
  rowValue: { color: 'rgba(255,255,255,0.5)', fontSize: 12, flex: 1 },
})

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function ScoreReportScreen() {
  const navigation = useNavigation<ReportNavProp>()
  const route = useRoute<ReportRouteProp>()
  const { scores, personaId, durationSeconds } = route.params
  const persona = PERSONAS[personaId] ?? PERSONAS.mentor
  const profile = useUserStore(s => s.profile)

  const [deltas, setDeltas] = useState<Record<string, number | null>>({})
  const [overallDelta, setOverallDelta] = useState<number | null>(null)
  const [prevSessionLoaded, setPrevSessionLoaded] = useState(false)

  const headerOpacity = useRef(new Animated.Value(0)).current
  const headerTy = useRef(new Animated.Value(20)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 500, useNativeDriver: true }),
      Animated.spring(headerTy, { toValue: 0, tension: 70, friction: 10, useNativeDriver: true }),
    ]).start()

    // Load previous session with same persona to compute deltas
    if (profile?.uid) {
      getUserSessionSummaries(profile.uid, 20).then(sessions => {
        const samePersona = sessions.filter(s => s.personaId === personaId)
        // samePersona[0] is the current session (just saved), [1] is the previous
        if (samePersona.length >= 2) {
          const prev = samePersona[1]
          setOverallDelta(scores.overall - prev.overallScore)

          // We only have axis data from the full session object
          // For now compute overall delta and note it
          const axisDeltaMap: Record<string, number | null> = {}
          Object.keys(scores.axes).forEach(key => {
            // Without full previous session axes we show null per axis
            // This will be populated properly once SessionDetail loads full data
            axisDeltaMap[key] = null
          })
          setDeltas(axisDeltaMap)
        }
        setPrevSessionLoaded(true)
      })
    } else {
      setPrevSessionLoaded(true)
    }
  }, [])

  const axisEntries = Object.entries(scores.axes)

  const handleShare = async () => {
    const lines = axisEntries
      .map(([k, v]) => `${AXIS_META[k]?.label ?? k}: ${v.score.toFixed(1)}/10`)
      .join('\n')
    await Share.share({
      message: `My PitchSim score: ${scores.overall.toFixed(1)}/10 (${persona.name})\n\n${lines}\n\n${scores.summary}\n\nPractice your pitch at PitchSim 🎯`,
    })
  }

  const duration = durationSeconds
    ? `${Math.floor(durationSeconds / 60)}m ${durationSeconds % 60}s`
    : null

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView style={s.scroll} contentContainerStyle={s.scrollContent} showsVerticalScrollIndicator={false}>

        {/* Header */}
        <Animated.View style={[s.header, { opacity: headerOpacity, transform: [{ translateY: headerTy }] }]}>
          <View style={[s.personaTag, { borderColor: persona.color + '55' }]}>
            <View style={[s.dot, { backgroundColor: persona.color }]} />
            <Text style={s.personaTagText}>{persona.name} · {persona.title}</Text>
          </View>
          <Text style={s.screenTitle}>Session Report</Text>
          {duration && <Text style={s.durationText}>⏱ {duration}</Text>}
        </Animated.View>

        {/* Overall ring */}
        <View style={s.ringSection}>
          <ScoreRing score={scores.overall} color={persona.color} delay={200} />
          <Text style={s.summaryText}>{scores.summary}</Text>
        </View>

        {/* Improvement banner */}
        {prevSessionLoaded && (
          <ImprovementBanner deltas={deltas} overallDelta={overallDelta} />
        )}

        {/* Strength / Weakness */}
        <View style={s.swRow}>
          <View style={[s.swCard, { backgroundColor: '#1D9E7518', borderColor: '#1D9E7540' }]}>
            <Text style={s.swIcon}>💪</Text>
            <Text style={s.swType}>Top strength</Text>
            <Text style={[s.swLabel, { color: '#1D9E75' }]}>
              {AXIS_META[scores.topStrength]?.icon} {AXIS_META[scores.topStrength]?.label ?? scores.topStrength}
            </Text>
          </View>
          <View style={[s.swCard, { backgroundColor: '#E24B4A18', borderColor: '#E24B4A40' }]}>
            <Text style={s.swIcon}>🎯</Text>
            <Text style={s.swType}>Key weakness</Text>
            <Text style={[s.swLabel, { color: '#E24B4A' }]}>
              {AXIS_META[scores.topWeakness]?.icon} {AXIS_META[scores.topWeakness]?.label ?? scores.topWeakness}
            </Text>
          </View>
        </View>

        {/* Axis bars */}
        <Text style={s.sectionTitle}>Breakdown</Text>
        <Text style={s.sectionSub}>Tap any row for detailed feedback</Text>

        {axisEntries.map(([key, data], i) => (
          <AxisBar
            key={key}
            axisKey={key}
            data={data}
            delay={300 + i * 80}
            delta={deltas[key] ?? null}
          />
        ))}

        {/* Score legend */}
        <View style={s.legend}>
          {[
            { label: '8–10', color: '#1D9E75', text: 'Strong' },
            { label: '6–7', color: '#EF9F27', text: 'Decent' },
            { label: '0–5', color: '#E24B4A', text: 'Needs work' },
          ].map(l => (
            <View key={l.label} style={s.legendItem}>
              <View style={[s.legendDot, { backgroundColor: l.color }]} />
              <Text style={s.legendText}>{l.label} · {l.text}</Text>
            </View>
          ))}
        </View>

        {/* Tip box */}
        <View style={s.tipBox}>
          <Text style={s.tipTitle}>💬 Improve faster</Text>
          <Text style={s.tipText}>
            Focus your next session on{' '}
            <Text style={{ color: '#E24B4A', fontWeight: '600' }}>
              {AXIS_META[scores.topWeakness]?.label ?? scores.topWeakness}
            </Text>
            . Try a different investor persona to get a fresh perspective on your pitch.
          </Text>
        </View>

        {/* Actions */}
        <View style={s.actions}>
          <TouchableOpacity
            style={[s.primaryBtn, { backgroundColor: persona.color }]}
            onPress={() => navigation.navigate('PersonaSelect')}
          >
            <Text style={s.primaryBtnText}>Practice again</Text>
          </TouchableOpacity>
          <View style={s.secondaryRow}>
            <TouchableOpacity style={s.secondaryBtn} onPress={handleShare}>
              <Text style={s.secondaryBtnText}>Share results</Text>
            </TouchableOpacity>
            <TouchableOpacity style={s.secondaryBtn} onPress={() => navigation.navigate('Main')}>
              <Text style={s.secondaryBtnText}>Go home</Text>
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  )
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const BG = '#0C0C13'
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  scroll: { flex: 1 },
  scrollContent: { padding: 20 },

  header: { alignItems: 'center', paddingTop: 8, paddingBottom: 24, gap: 8 },
  personaTag: { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 5 },
  dot: { width: 6, height: 6, borderRadius: 3 },
  personaTagText: { color: 'rgba(255,255,255,0.55)', fontSize: 12 },
  screenTitle: { color: '#fff', fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  durationText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },

  ringSection: { alignItems: 'center', gap: 20, paddingVertical: 20, marginBottom: 4 },
  summaryText: { color: 'rgba(255,255,255,0.6)', fontSize: 14, lineHeight: 22, textAlign: 'center', maxWidth: 320 },

  swRow: { flexDirection: 'row', gap: 10, marginBottom: 28 },
  swCard: { flex: 1, flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderRadius: 14, padding: 12 },
  swIcon: { fontSize: 20 },
  swType: { fontSize: 10, color: 'rgba(255,255,255,0.4)', marginBottom: 2 },
  swLabel: { fontSize: 13, fontWeight: '600' },

  sectionTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginBottom: 4 },
  sectionSub: { color: 'rgba(255,255,255,0.3)', fontSize: 12, marginBottom: 14 },

  legend: { flexDirection: 'row', justifyContent: 'center', gap: 16, marginTop: 4, marginBottom: 20 },
  legendItem: { flexDirection: 'row', alignItems: 'center', gap: 5 },
  legendDot: { width: 7, height: 7, borderRadius: 4 },
  legendText: { color: 'rgba(255,255,255,0.38)', fontSize: 11 },

  tipBox: { backgroundColor: 'rgba(255,255,255,0.04)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.09)', borderRadius: 16, padding: 16, gap: 8, marginBottom: 24 },
  tipTitle: { color: '#fff', fontSize: 14, fontWeight: '600' },
  tipText: { color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 20 },

  actions: { gap: 10 },
  primaryBtn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  primaryBtnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  secondaryRow: { flexDirection: 'row', gap: 10 },
  secondaryBtn: { flex: 1, backgroundColor: 'rgba(255,255,255,0.07)', borderWidth: StyleSheet.hairlineWidth, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  secondaryBtnText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, fontWeight: '500' },
})
