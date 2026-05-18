// =============================================================================
// screens/home/HomeScreen.tsx
// PitchSim — Home Dashboard
// Aesthetic: Dark editorial — like a Bloomberg terminal meets a luxury watch app
// =============================================================================

import React, { useEffect, useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  Animated, Dimensions, SafeAreaView, StatusBar, Platform,
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../types/session.types'
import { useUserStore } from '../../store/userStore'
import { getUserSessionSummaries } from '../../services/sessionService'
import type { SessionSummary } from '../../types/session.types'

type Nav = NativeStackNavigationProp<RootStackParamList>

const { width: W } = Dimensions.get('window')

const PERSONAS: Record<string, { color: string; initials: string }> = {
  aggressive_vc: { color: '#E24B4A', initials: 'MR' },
  angel:         { color: '#1D9E75', initials: 'PN' },
  corporate:     { color: '#378ADD', initials: 'DC' },
  skeptic:       { color: '#EF9F27', initials: 'SB' },
  mentor:        { color: '#7F77DD', initials: 'JO' },
}

const AXIS_LABELS: Record<string, string> = {
  problemClarity:     'Clarity',
  marketSizing:       'Market',
  solutionConfidence: 'Solution',
  objectionHandling:  'Objection',
  askSpecificity:     'Ask',
  storytelling:       'Story',
}

// ─── Animated counter ─────────────────────────────────────────────────────────

function AnimatedNumber({ value, decimals = 0 }: { value: number; decimals?: number }) {
  const anim = useRef(new Animated.Value(0)).current
  const [display, setDisplay] = useState('0')

  useEffect(() => {
    Animated.timing(anim, { toValue: value, duration: 1200, useNativeDriver: false }).start()
    const listener = anim.addListener(({ value: v }) => {
      setDisplay(v.toFixed(decimals))
    })
    return () => anim.removeListener(listener)
  }, [value])

  return <Text>{display}</Text>
}

// ─── Score ring ────────────────────────────────────────────────────────────────

function MiniRing({ score, color, size = 44 }: { score: number; color: string; size?: number }) {
  return (
    <View style={[ringStyles.wrap, { width: size, height: size, borderRadius: size / 2, borderColor: color + '30' }]}>
      <View style={[ringStyles.fill, {
        width: size - 8, height: size - 8, borderRadius: (size - 8) / 2,
        borderColor: color,
        borderTopColor: score > 7.5 ? color : 'transparent',
        borderRightColor: score > 5 ? color : 'transparent',
      }]} />
      <Text style={[ringStyles.num, { color, fontSize: size * 0.22 }]}>{score.toFixed(1)}</Text>
    </View>
  )
}
const ringStyles = StyleSheet.create({
  wrap: { borderWidth: 1.5, alignItems: 'center', justifyContent: 'center', position: 'relative' },
  fill: { position: 'absolute', borderWidth: 2, transform: [{ rotate: '-90deg' }] },
  num: { fontWeight: '700' },
})

// ─── Stat card ─────────────────────────────────────────────────────────────────

function StatCard({ label, value, sub, color, delay }: {
  label: string; value: string | number; sub?: string; color: string; delay: number
}) {
  const opacity = useRef(new Animated.Value(0)).current
  const ty = useRef(new Animated.Value(16)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 500, delay, useNativeDriver: true }),
      Animated.spring(ty, { toValue: 0, tension: 80, friction: 12, delay, useNativeDriver: true }),
    ]).start()
  }, [])

  return (
    <Animated.View style={[statStyles.card, { opacity, transform: [{ translateY: ty }] }]}>
      <View style={[statStyles.accent, { backgroundColor: color }]} />
      <Text style={statStyles.label}>{label}</Text>
      <Text style={[statStyles.value, { color }]}>{value}</Text>
      {sub && <Text style={statStyles.sub}>{sub}</Text>}
    </Animated.View>
  )
}
const statStyles = StyleSheet.create({
  card: {
    flex: 1,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 16,
    padding: 14,
    gap: 4,
    position: 'relative',
    overflow: 'hidden',
  },
  accent: { position: 'absolute', top: 0, left: 0, right: 0, height: 2, borderRadius: 1 },
  label: { color: 'rgba(255,255,255,0.4)', fontSize: 10, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  value: { fontSize: 26, fontWeight: '700', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
})

// ─── Session history card ──────────────────────────────────────────────────────

function SessionCard({ session, index }: { session: SessionSummary; index: number }) {
  const opacity = useRef(new Animated.Value(0)).current
  const tx = useRef(new Animated.Value(20)).current
  const persona = PERSONAS[session.personaId] ?? { color: '#7F77DD', initials: '??' }

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, { toValue: 1, duration: 400, delay: index * 80, useNativeDriver: true }),
      Animated.spring(tx, { toValue: 0, tension: 80, friction: 12, delay: index * 80, useNativeDriver: true }),
    ]).start()
  }, [])

  const date = new Date(session.createdAt)
  const dateStr = date.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
  const timeStr = date.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })

  const scoreColor = session.overallScore >= 8 ? '#1D9E75' : session.overallScore >= 6 ? '#EF9F27' : '#E24B4A'

  return (
    <Animated.View style={[scStyles.wrap, { opacity, transform: [{ translateX: tx }] }]}>
      <View style={[scStyles.avatar, { backgroundColor: persona.color + '20', borderColor: persona.color + '50' }]}>
        <Text style={[scStyles.initials, { color: persona.color }]}>{persona.initials}</Text>
      </View>
      <View style={scStyles.info}>
        <Text style={scStyles.name}>{session.personaId.replace('_', ' ').replace(/\b\w/g, c => c.toUpperCase())}</Text>
        <Text style={scStyles.date}>{dateStr} · {timeStr}</Text>
        <View style={scStyles.tags}>
          <View style={[scStyles.tag, { backgroundColor: '#1D9E7518' }]}>
            <Text style={[scStyles.tagText, { color: '#1D9E75' }]}>↑ {session.topStrength?.replace(/([A-Z])/g, ' $1').trim()}</Text>
          </View>
          <View style={[scStyles.tag, { backgroundColor: '#E24B4A18' }]}>
            <Text style={[scStyles.tagText, { color: '#E24B4A' }]}>↓ {session.topWeakness?.replace(/([A-Z])/g, ' $1').trim()}</Text>
          </View>
        </View>
      </View>
      <View style={scStyles.scoreWrap}>
        <Text style={[scStyles.score, { color: scoreColor }]}>{session.overallScore.toFixed(1)}</Text>
        <Text style={scStyles.scoreLabel}>/ 10</Text>
      </View>
    </Animated.View>
  )
}
const scStyles = StyleSheet.create({
  wrap: { flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: 'rgba(255,255,255,0.06)' },
  avatar: { width: 40, height: 40, borderRadius: 20, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  initials: { fontSize: 12, fontWeight: '700' },
  info: { flex: 1, gap: 3 },
  name: { color: '#fff', fontSize: 13, fontWeight: '600' },
  date: { color: 'rgba(255,255,255,0.35)', fontSize: 11 },
  tags: { flexDirection: 'row', gap: 6, marginTop: 2 },
  tag: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  tagText: { fontSize: 10, fontWeight: '500' },
  scoreWrap: { alignItems: 'flex-end' },
  score: { fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  scoreLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10 },
})

// ─── Persona quick-pick ────────────────────────────────────────────────────────

const PERSONA_LIST = [
  { id: 'aggressive_vc', name: 'Marcus Reid', title: 'Aggressive VC', color: '#E24B4A', icon: '⚡' },
  { id: 'angel', name: 'Priya Nair', title: 'Angel Investor', color: '#1D9E75', icon: '✨' },
  { id: 'corporate', name: 'David Chen', title: 'Corporate', color: '#378ADD', icon: '🏢' },
  { id: 'skeptic', name: 'Sofia Bauer', title: 'Skeptic', color: '#EF9F27', icon: '🔍' },
  { id: 'mentor', name: 'James Okoye', title: 'Mentor', color: '#7F77DD', icon: '🎯' },
]

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function HomeScreen() {
  const navigation = useNavigation<Nav>()
  const profile = useUserStore(s => s.profile)
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)

  const headerOpacity = useRef(new Animated.Value(0)).current
  const headerTy = useRef(new Animated.Value(-20)).current
  const ctaScale = useRef(new Animated.Value(0.92)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(headerOpacity, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(headerTy, { toValue: 0, tension: 70, friction: 12, useNativeDriver: true }),
      Animated.spring(ctaScale, { toValue: 1, tension: 60, friction: 10, delay: 300, useNativeDriver: true }),
    ]).start()

    if (profile?.uid) {
      getUserSessionSummaries(profile.uid, 10)
        .then(setSessions)
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [profile])

  const hour = new Date().getHours()
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening'
  const firstName = profile?.displayName?.split(' ')[0] ?? 'Founder'

  const avgScore = profile?.stats.avgOverall ?? 0
  const totalSessions = profile?.stats.totalSessions ?? 0
  const streak = profile?.stats.streak ?? 0

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" />
      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <Animated.View style={[s.header, { opacity: headerOpacity, transform: [{ translateY: headerTy }] }]}>
          <View>
            <Text style={s.greeting}>{greeting},</Text>
            <Text style={s.name}>{firstName} 👋</Text>
          </View>
          <View style={s.streakBadge}>
            <Text style={s.streakFire}>🔥</Text>
            <Text style={s.streakNum}>{streak}</Text>
            <Text style={s.streakLabel}>day{streak !== 1 ? 's' : ''}</Text>
          </View>
        </Animated.View>

        {/* ── Stats row ───────────────────────────────────────────────── */}
        <View style={s.statsRow}>
          <StatCard
            label="Sessions"
            value={totalSessions}
            sub="total pitches"
            color="#7F77DD"
            delay={100}
          />
          <StatCard
            label="Avg Score"
            value={totalSessions > 0 ? avgScore.toFixed(1) : '—'}
            sub="out of 10"
            color="#1D9E75"
            delay={200}
          />
          <StatCard
            label="Streak"
            value={streak}
            sub="days active"
            color="#EF9F27"
            delay={300}
          />
        </View>

        {/* ── CTA ─────────────────────────────────────────────────────── */}
        <Animated.View style={{ transform: [{ scale: ctaScale }] }}>
          <TouchableOpacity
            style={s.cta}
            onPress={() => navigation.navigate('PersonaSelect')}
            activeOpacity={0.9}
          >
            <View style={s.ctaLeft}>
              <Text style={s.ctaLabel}>READY TO PITCH?</Text>
              <Text style={s.ctaTitle}>Start a session</Text>
              <Text style={s.ctaSub}>Choose your investor → pitch → get scored</Text>
            </View>
            <View style={s.ctaArrow}>
              <Text style={s.ctaArrowText}>→</Text>
            </View>
            {/* Decorative grid */}
            <View style={s.ctaGrid}>
              {Array.from({ length: 12 }, (_, i) => (
                <View key={i} style={s.ctaGridDot} />
              ))}
            </View>
          </TouchableOpacity>
        </Animated.View>

        {/* ── Quick persona pick ──────────────────────────────────────── */}
        <View style={s.sectionHeader}>
          <Text style={s.sectionTitle}>Pitch to</Text>
          <TouchableOpacity onPress={() => navigation.navigate('PersonaSelect')}>
            <Text style={s.sectionLink}>See all →</Text>
          </TouchableOpacity>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.personaScroll} contentContainerStyle={s.personaContent}>
          {PERSONA_LIST.map((p, i) => (
            <TouchableOpacity
              key={p.id}
              style={[s.personaChip, { borderColor: p.color + '55' }]}
              onPress={() => {
                navigation.navigate('PitchTips', { personaId: p.id })
                            }}
              activeOpacity={0.8}
            >
              <View style={[s.personaIcon, { backgroundColor: p.color + '20' }]}>
                <Text style={s.personaIconText}>{p.icon}</Text>
              </View>
              <Text style={s.personaChipName}>{p.name.split(' ')[0]}</Text>
              <Text style={[s.personaChipTitle, { color: p.color }]}>{p.title}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

        {/* ── Recent sessions ─────────────────────────────────────────── */}
        {totalSessions > 0 && (
          <>
            <View style={s.sectionHeader}>
              <Text style={s.sectionTitle}>Recent sessions</Text>
            </View>
            <View style={s.sessionsCard}>
              {loading ? (
                <Text style={s.loadingText}>Loading...</Text>
              ) : sessions.length === 0 ? (
                <Text style={s.emptyText}>No sessions yet — start your first pitch!</Text>
              ) : (
                sessions.slice(0, 5).map((session, i) => (
                  <SessionCard key={session.id} session={session} index={i} />
                ))
              )}
            </View>
          </>
        )}

        {/* ── First time empty state ───────────────────────────────────── */}
        {totalSessions === 0 && !loading && (
          <View style={s.emptyState}>
            <Text style={s.emptyIcon}>🎯</Text>
            <Text style={s.emptyTitle}>No sessions yet</Text>
            <Text style={s.emptyBody}>
              Practice pitching to AI investor personas. Get scored on 6 axes and track your improvement over time.
            </Text>
            <TouchableOpacity
              style={s.emptyBtn}
              onPress={() => navigation.navigate('PersonaSelect')}
            >
              <Text style={s.emptyBtnText}>Start your first pitch →</Text>
            </TouchableOpacity>
          </View>
        )}

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
  content: { paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 12 : 24 },

  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 24 },
  greeting: { color: 'rgba(255,255,255,0.4)', fontSize: 13, letterSpacing: 0.3 },
  name: { color: '#FFFFFF', fontSize: 26, fontWeight: '700', letterSpacing: -0.5, marginTop: 2 },

  streakBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    backgroundColor: 'rgba(239,159,39,0.12)', borderWidth: 1,
    borderColor: 'rgba(239,159,39,0.3)', borderRadius: 20,
    paddingHorizontal: 12, paddingVertical: 7,
  },
  streakFire: { fontSize: 14 },
  streakNum: { color: '#EF9F27', fontSize: 16, fontWeight: '700' },
  streakLabel: { color: 'rgba(239,159,39,0.7)', fontSize: 11 },

  statsRow: { flexDirection: 'row', gap: 10, marginBottom: 20 },

  cta: {
    backgroundColor: '#7F77DD',
    borderRadius: 20,
    padding: 22,
    marginBottom: 28,
    flexDirection: 'row',
    alignItems: 'center',
    overflow: 'hidden',
    position: 'relative',
  },
  ctaLeft: { flex: 1, gap: 4 },
  ctaLabel: { color: 'rgba(255,255,255,0.6)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  ctaTitle: { color: '#FFFFFF', fontSize: 22, fontWeight: '700', letterSpacing: -0.5 },
  ctaSub: { color: 'rgba(255,255,255,0.6)', fontSize: 12, marginTop: 2 },
  ctaArrow: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },
  ctaArrowText: { color: '#fff', fontSize: 20, fontWeight: '700' },
  ctaGrid: {
    position: 'absolute', right: 70, top: 10,
    flexDirection: 'row', flexWrap: 'wrap', width: 60, gap: 6, opacity: 0.15,
  },
  ctaGridDot: { width: 4, height: 4, borderRadius: 2, backgroundColor: '#fff' },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { color: '#FFFFFF', fontSize: 16, fontWeight: '600' },
  sectionLink: { color: '#7F77DD', fontSize: 13 },

  personaScroll: { marginHorizontal: -20, marginBottom: 28 },
  personaContent: { paddingHorizontal: 20, gap: 10 },
  personaChip: {
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderRadius: 16,
    padding: 14, alignItems: 'center', gap: 6, width: 100,
  },
  personaIcon: { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  personaIconText: { fontSize: 18 },
  personaChipName: { color: '#fff', fontSize: 12, fontWeight: '600' },
  personaChipTitle: { fontSize: 10, fontWeight: '500' },

  sessionsCard: {
    backgroundColor: 'rgba(255,255,255,0.03)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.08)',
    borderRadius: 20, paddingHorizontal: 16,
  },
  loadingText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, paddingVertical: 20, textAlign: 'center' },
  emptyText: { color: 'rgba(255,255,255,0.3)', fontSize: 13, paddingVertical: 20, textAlign: 'center' },

  emptyState: { alignItems: 'center', paddingTop: 40, gap: 12 },
  emptyIcon: { fontSize: 48 },
  emptyTitle: { color: '#fff', fontSize: 20, fontWeight: '700' },
  emptyBody: { color: 'rgba(255,255,255,0.4)', fontSize: 14, textAlign: 'center', lineHeight: 22, maxWidth: 280 },
  emptyBtn: { backgroundColor: '#7F77DD', borderRadius: 14, paddingVertical: 14, paddingHorizontal: 28, marginTop: 8 },
  emptyBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
})
