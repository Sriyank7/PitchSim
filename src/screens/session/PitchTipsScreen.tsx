// =============================================================================
// screens/session/PitchTipsScreen.tsx
// PitchSim — Pre-session pitch tips (Feature 4)
// Swipeable 3-card screen showing what the investor cares about
// Sits between PersonaSelect → PitchTips → PitchRecord
// =============================================================================

import React, { useRef, useState } from 'react'
import {
  View, Text, StyleSheet, TouchableOpacity, ScrollView,
  SafeAreaView, Animated, Dimensions, Platform,
} from 'react-native'
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'

type RootStackParamList = {
  PitchTips: { personaId: string }
  PitchRecord: { personaId: string }
}
type TipsRoute = RouteProp<RootStackParamList, 'PitchTips'>
type TipsNav = NativeStackNavigationProp<RootStackParamList>

const { width: W } = Dimensions.get('window')

// ─── Persona tip content ──────────────────────────────────────────────────────

const PERSONA_TIPS: Record<string, {
  name: string
  title: string
  color: string
  icon: string
  intro: string
  cards: {
    title: string
    icon: string
    points: string[]
    warning?: string
  }[]
  closingAdvice: string
}> = {
  aggressive_vc: {
    name: 'Marcus Reid',
    title: 'Aggressive VC',
    color: '#E24B4A',
    icon: '⚡',
    intro: 'Marcus has seen 3,000+ pitches. He will push hard on every number you give. Be ready with data, not stories.',
    cards: [
      {
        title: 'What Marcus cares about',
        icon: '🎯',
        points: [
          'Bottom-up TAM calculation — not a market report',
          'Competitive moat — what stops a well-funded rival?',
          'Real traction — paying customers, not signups',
          'Unit economics — CAC, LTV, payback period',
        ],
      },
      {
        title: 'Questions he will ask',
        icon: '🔥',
        points: [
          '"Walk me through the bottom-up math on your TAM"',
          '"Your top competitor raised $200M — why won\'t they just build this?"',
          '"How many of your users are paying, and what did you have to do to get them?"',
          '"What\'s your CAC and payback period at current conversion rates?"',
        ],
        warning: 'Do NOT give vague answers. He will call it out.',
      },
      {
        title: 'How to impress Marcus',
        icon: '💡',
        points: [
          'Lead with a specific, defensible number — not a range',
          'Push back confidently when challenged — capitulation is a red flag',
          'Have your use-of-funds breakdown ready',
          'Know your 3 closest competitors and exactly why you win',
        ],
      },
    ],
    closingAdvice: 'Start with your traction number. It immediately tells Marcus you have proof, not just a theory.',
  },

  angel: {
    name: 'Priya Nair',
    title: 'Angel Investor',
    color: '#1D9E75',
    icon: '✨',
    intro: 'Priya was a founder herself. She believes the founder IS the company at the early stage. Tell your story authentically.',
    cards: [
      {
        title: 'What Priya cares about',
        icon: '💚',
        points: [
          'Why YOU — founder-market fit is everything',
          'Your personal connection to the problem',
          'Real conversations with customers — what did you learn?',
          'Long-term vision — where is this in 10 years?',
        ],
      },
      {
        title: 'Questions she will ask',
        icon: '🌱',
        points: [
          '"What was the moment you knew you HAD to build this?"',
          '"Tell me about the last time a customer surprised you"',
          '"How has your understanding of the problem evolved?"',
          '"If this fails, what do you do next — and does that tell you something?"',
        ],
      },
      {
        title: 'How to impress Priya',
        icon: '💡',
        points: [
          'Be vulnerable and authentic — she can detect inauthenticity',
          'Reference specific customer conversations with details',
          'Show how your thinking has evolved since you started',
          'Connect your personal story to why you\'re the right person',
        ],
      },
    ],
    closingAdvice: 'Open with your personal "why" — the moment that made this feel inevitable, not optional.',
  },

  corporate: {
    name: 'David Chen',
    title: 'Corporate Strategist',
    color: '#378ADD',
    icon: '🏢',
    intro: 'David needs to defend every investment decision to his CFO and board. Help him make the business case.',
    cards: [
      {
        title: 'What David cares about',
        icon: '📋',
        points: [
          'Enterprise fit — does this solve a real problem for large companies?',
          'Integration complexity — how hard is deployment?',
          'Risk profile — regulatory, contractual, reputational',
          'Revenue model — recurring, predictable, defensible margins',
        ],
      },
      {
        title: 'Questions he will ask',
        icon: '🔍',
        points: [
          '"Do you hold SOC 2 or ISO 27001 certification?"',
          '"What\'s your average contract value and sales cycle?"',
          '"How would this integrate with SAP or Salesforce?"',
          '"Describe a scenario where your product fails for an enterprise client"',
        ],
      },
      {
        title: 'How to impress David',
        icon: '💡',
        points: [
          'Have 2-3 enterprise logos ready — even pilots count',
          'Know your compliance posture cold',
          'Frame risks proactively — don\'t wait to be asked',
          'Show a clear 3-year roadmap, not just the current product',
        ],
      },
    ],
    closingAdvice: 'Lead with your enterprise customers — logos build instant credibility with David.',
  },

  skeptic: {
    name: 'Sofia Bauer',
    title: 'Skeptical Analyst',
    color: '#EF9F27',
    icon: '🔍',
    intro: 'Sofia\'s job is to find what\'s wrong with your pitch before the partners invest. Treat every number as something she will verify.',
    cards: [
      {
        title: 'What Sofia cares about',
        icon: '📊',
        points: [
          'Unit economics — LTV, CAC, gross margin after COGS',
          'Churn — cohort data, not just overall retention',
          'Growth assumptions — what\'s the math behind your projections?',
          'Burn rate — how much runway do you actually have?',
        ],
      },
      {
        title: 'Questions she will ask',
        icon: '⚠️',
        points: [
          '"What\'s your monthly churn rate for cohorts older than 6 months?"',
          '"Your deck shows 20% MoM growth — what were the absolute numbers month by month?"',
          '"What research firm published that $5B market figure and in what year?"',
          '"What\'s your gross margin after COGS including customer support?"',
        ],
        warning: 'Never cite a market report without knowing its methodology.',
      },
      {
        title: 'How to impress Sofia',
        icon: '💡',
        points: [
          'Bring a data sheet — actual numbers, not rounded figures',
          'Know your cohort retention chart by heart',
          'Acknowledge weak spots before she finds them',
          'Show the assumptions behind every projection',
        ],
      },
    ],
    closingAdvice: 'Lead with your best metric — the one number that is irrefutably impressive. Let the data speak first.',
  },

  mentor: {
    name: 'James Okoye',
    title: 'Mentor Investor',
    color: '#7F77DD',
    icon: '🎯',
    intro: 'James genuinely wants you to succeed. He will ask constructive questions about your execution plan and next steps. Be honest about what you don\'t know.',
    cards: [
      {
        title: 'What James cares about',
        icon: '🌟',
        points: [
          'Execution plan — what are the next 90 days, specifically?',
          'Go-to-market — how will you get your first 100 customers?',
          'Self-awareness — do you know what you don\'t know?',
          'Resilience — have you faced a setback and how did you handle it?',
        ],
      },
      {
        title: 'Questions he will ask',
        icon: '💬',
        points: [
          '"Walk me through exactly what you\'re doing this week to get your next 10 customers"',
          '"What\'s the one assumption that, if wrong, breaks your whole plan?"',
          '"What\'s the hardest feedback you\'ve received from a customer?"',
          '"A year from now, how will you know if this is working?"',
        ],
      },
      {
        title: 'How to impress James',
        icon: '💡',
        points: [
          'Be concrete about your next 90-day plan — not a 5-year vision',
          'Admit what you don\'t know — he respects self-awareness',
          'Reference a real setback and what you learned from it',
          'Name the single metric you\'ll use to measure success',
        ],
      },
    ],
    closingAdvice: 'James loves founders who are self-aware. Acknowledge your biggest uncertainty upfront — it builds trust.',
  },
}

// ─── Tip card ─────────────────────────────────────────────────────────────────

function TipCard({
  card,
  color,
  isActive,
}: {
  card: { title: string; icon: string; points: string[]; warning?: string }
  color: string
  isActive: boolean
}) {
  return (
    <View style={[tcStyles.card, { borderColor: isActive ? color + '60' : 'rgba(255,255,255,0.08)' }]}>
      <View style={[tcStyles.iconWrap, { backgroundColor: color + '18' }]}>
        <Text style={tcStyles.icon}>{card.icon}</Text>
      </View>
      <Text style={tcStyles.title}>{card.title}</Text>
      <View style={tcStyles.points}>
        {card.points.map((point, i) => (
          <View key={i} style={tcStyles.pointRow}>
            <View style={[tcStyles.bullet, { backgroundColor: color }]} />
            <Text style={tcStyles.pointText}>{point}</Text>
          </View>
        ))}
      </View>
      {card.warning && (
        <View style={tcStyles.warning}>
          <Text style={tcStyles.warningText}>⚠️ {card.warning}</Text>
        </View>
      )}
    </View>
  )
}

const tcStyles = StyleSheet.create({
  card: {
    width: W - 64,
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderWidth: 1, borderRadius: 24,
    padding: 24, gap: 16,
  },
  iconWrap: { width: 52, height: 52, borderRadius: 26, alignItems: 'center', justifyContent: 'center' },
  icon: { fontSize: 24 },
  title: { color: '#fff', fontSize: 18, fontWeight: '700', letterSpacing: -0.3 },
  points: { gap: 10 },
  pointRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  bullet: { width: 5, height: 5, borderRadius: 3, marginTop: 7, flexShrink: 0 },
  pointText: { color: 'rgba(255,255,255,0.7)', fontSize: 14, lineHeight: 22, flex: 1 },
  warning: { backgroundColor: 'rgba(239,159,39,0.12)', borderWidth: 1, borderColor: 'rgba(239,159,39,0.30)', borderRadius: 12, padding: 12 },
  warningText: { color: '#EF9F27', fontSize: 13, lineHeight: 20 },
})

// ─── Dot indicators ───────────────────────────────────────────────────────────

function DotIndicators({ total, active, color }: { total: number; active: number; color: string }) {
  return (
    <View style={dotStyles.row}>
      {Array.from({ length: total }, (_, i) => (
        <View
          key={i}
          style={[
            dotStyles.dot,
            i === active
              ? { backgroundColor: color, width: 24 }
              : { backgroundColor: 'rgba(255,255,255,0.2)' }
          ]}
        />
      ))}
    </View>
  )
}

const dotStyles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  dot: { height: 6, borderRadius: 3 , width: 6},
})

// ─── Main screen ───────────────────────────────────────────────────────────────

export default function PitchTipsScreen() {
  const navigation = useNavigation<TipsNav>()
  const route = useRoute<TipsRoute>()
  const { personaId } = route.params
  const tips = PERSONA_TIPS[personaId] ?? PERSONA_TIPS.mentor

  const [activeCard, setActiveCard] = useState(0)
  const scrollRef = useRef<ScrollView>(null)
  const progressAnim = useRef(new Animated.Value(0)).current

  const goToCard = (index: number) => {
    setActiveCard(index)
    scrollRef.current?.scrollTo({ x: index * (W - 40), animated: true })
    Animated.timing(progressAnim, {
      toValue: index / (tips.cards.length - 1),
      duration: 300, useNativeDriver: false,
    }).start()
  }

  const handleNext = () => {
    if (activeCard < tips.cards.length - 1) {
      goToCard(activeCard + 1)
    } else {
      navigation.navigate('PitchRecord', { personaId })
    }
  }

  const handleSkip = () => {
    navigation.navigate('PitchRecord', { personaId })
  }

  const progressWidth = progressAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['33%', '100%'],
  })

  const isLastCard = activeCard === tips.cards.length - 1

  return (
    <SafeAreaView style={s.safe}>
      {/* Header */}
      <View style={s.header}>
        <View style={[s.personaChip, { borderColor: tips.color + '55' }]}>
          <Text style={s.personaIcon}>{tips.icon}</Text>
          <Text style={[s.personaName, { color: tips.color }]}>{tips.name}</Text>
        </View>
        <TouchableOpacity onPress={handleSkip} style={s.skipBtn}>
          <Text style={s.skipText}>Skip →</Text>
        </TouchableOpacity>
      </View>

      {/* Progress bar */}
      <View style={s.progressTrack}>
        <Animated.View style={[s.progressFill, { width: progressWidth, backgroundColor: tips.color }]} />
      </View>

      {/* Intro */}
      <View style={s.intro}>
        <Text style={s.introLabel}>KNOW YOUR INVESTOR</Text>
        <Text style={s.introText}>{tips.intro}</Text>
      </View>

      {/* Cards carousel */}
      <ScrollView
        ref={scrollRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={s.carousel}
        contentContainerStyle={s.carouselContent}
      >
        {tips.cards.map((card, i) => (
          <View key={i} style={s.cardWrap}>
            <TipCard card={card} color={tips.color} isActive={i === activeCard} />
          </View>
        ))}
      </ScrollView>

      {/* Dot indicators */}
      <View style={s.dotsRow}>
        <DotIndicators total={tips.cards.length} active={activeCard} color={tips.color} />
      </View>

      {/* Closing advice — shows on last card */}
      {isLastCard && (
        <View style={[s.closingBox, { borderColor: tips.color + '40', backgroundColor: tips.color + '10' }]}>
          <Text style={[s.closingLabel, { color: tips.color }]}>PRO TIP</Text>
          <Text style={s.closingText}>{tips.closingAdvice}</Text>
        </View>
      )}

      {/* Bottom actions */}
      <View style={s.footer}>
        {activeCard > 0 && (
          <TouchableOpacity style={s.backBtn} onPress={() => goToCard(activeCard - 1)}>
            <Text style={s.backText}>← Back</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity
          style={[s.nextBtn, { backgroundColor: isLastCard ? tips.color : 'rgba(255,255,255,0.1)' }]}
          onPress={handleNext}
        >
          <Text style={[s.nextText, { color: isLastCard ? '#fff' : 'rgba(255,255,255,0.8)' }]}>
            {isLastCard ? `Start pitching to ${tips.name.split(' ')[0]} →` : 'Next →'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  )
}

const BG = '#0C0C13'
const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },

  header: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingHorizontal: 20, paddingTop: Platform.OS === 'ios' ? 8 : 20, paddingBottom: 12,
  },
  personaChip: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6,
  },
  personaIcon: { fontSize: 16 },
  personaName: { fontSize: 13, fontWeight: '600' },
  skipBtn: { paddingHorizontal: 12, paddingVertical: 6 },
  skipText: { color: 'rgba(255,255,255,0.35)', fontSize: 13 },

  progressTrack: { height: 3, backgroundColor: 'rgba(255,255,255,0.08)', marginHorizontal: 20, borderRadius: 2, overflow: 'hidden', marginBottom: 20 },
  progressFill: { height: 3, borderRadius: 2 },

  intro: { paddingHorizontal: 20, marginBottom: 20, gap: 6 },
  introLabel: { color: 'rgba(255,255,255,0.3)', fontSize: 10, fontWeight: '700', letterSpacing: 1.5 },
  introText: { color: 'rgba(255,255,255,0.65)', fontSize: 14, lineHeight: 22 },

  carousel: { flex: 1 },
  carouselContent: { paddingHorizontal: 20, gap: 20 },
  cardWrap: { width: W - 40, paddingRight: 20 },

  dotsRow: { alignItems: 'center', paddingVertical: 16 },

  closingBox: {
    marginHorizontal: 20, borderWidth: 1, borderRadius: 14,
    padding: 14, gap: 5, marginBottom: 8,
  },
  closingLabel: { fontSize: 10, fontWeight: '700', letterSpacing: 1 },
  closingText: { color: 'rgba(255,255,255,0.65)', fontSize: 13, lineHeight: 20 },

  footer: {
    flexDirection: 'row', gap: 10, paddingHorizontal: 20,
    paddingBottom: Platform.OS === 'ios' ? 24 : 16, paddingTop: 8,
  },
  backBtn: {
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)',
    borderRadius: 14, paddingVertical: 14, paddingHorizontal: 20,
  },
  backText: { color: 'rgba(255,255,255,0.5)', fontSize: 14, fontWeight: '500' },
  nextBtn: { flex: 1, borderRadius: 14, paddingVertical: 14, alignItems: 'center' },
  nextText: { fontSize: 14, fontWeight: '700' },
})
