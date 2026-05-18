// =============================================================================
// screens/session/PitchRecordScreen.tsx — Placeholder
// =============================================================================
import React, { useState } from 'react'
import { View, Text, TextInput, TouchableOpacity, StyleSheet, SafeAreaView, ScrollView } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RouteProp } from '@react-navigation/native'
import type { RootStackParamList } from '../../types/session.types'
import { getPersona } from '../../constants/personas'

type Nav = NativeStackNavigationProp<RootStackParamList>
type Route = RouteProp<RootStackParamList, 'PitchRecord'>

export default function PitchRecordScreen() {
  const navigation = useNavigation<Nav>()
  const route = useRoute<Route>()
  const { personaId } = route.params
  const persona = getPersona(personaId)
  const [pitch, setPitch] = useState('')

  return (
    <SafeAreaView style={s.safe}>
      <ScrollView contentContainerStyle={s.content}>
        <Text style={s.title}>Deliver your pitch</Text>
        <View style={[s.personaTag, { borderColor: persona.color + '55' }]}>
          <View style={[s.dot, { backgroundColor: persona.color }]} />
          <Text style={s.personaName}>{persona.name} · {persona.title}</Text>
        </View>
        <Text style={s.instruction}>
          Type your 60-second elevator pitch below. Cover your problem, solution, market, and ask.
        </Text>
        <TextInput
          style={s.input}
          value={pitch}
          onChangeText={setPitch}
          placeholder="We're building a platform that..."
          placeholderTextColor="rgba(255,255,255,0.25)"
          multiline
          numberOfLines={8}
          textAlignVertical="top"
        />
        <Text style={s.charCount}>{pitch.length} characters</Text>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: pitch.trim().length > 20 ? persona.color : persona.color + '44' }]}
          onPress={() => {
            if (pitch.trim().length > 20) {
              navigation.navigate('QA', { personaId, pitchTranscript: pitch.trim() })
            }
          }}
          disabled={pitch.trim().length <= 20}
        >
          <Text style={s.btnText}>Start Q&A session →</Text>
        </TouchableOpacity>
        <Text style={s.hint}>Minimum 20 characters. Aim for a full 60-second pitch.</Text>
      </ScrollView>
    </SafeAreaView>
  )
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#0C0C13' },
  content: { padding: 24, gap: 16 },
  title: { color: '#fff', fontSize: 24, fontWeight: '700', marginTop: 20 },
  personaTag: { flexDirection: 'row', alignItems: 'center', gap: 8, borderWidth: 1, borderRadius: 20, paddingHorizontal: 12, paddingVertical: 6, alignSelf: 'flex-start' },
  dot: { width: 7, height: 7, borderRadius: 4 },
  personaName: { color: 'rgba(255,255,255,0.6)', fontSize: 13 },
  instruction: { color: 'rgba(255,255,255,0.5)', fontSize: 14, lineHeight: 22 },
  input: { backgroundColor: 'rgba(255,255,255,0.06)', borderWidth: 1, borderColor: 'rgba(255,255,255,0.12)', borderRadius: 16, padding: 16, color: '#fff', fontSize: 15, minHeight: 180, lineHeight: 24 },
  charCount: { color: 'rgba(255,255,255,0.25)', fontSize: 12, alignSelf: 'flex-end' },
  btn: { borderRadius: 16, paddingVertical: 16, alignItems: 'center' },
  btnText: { color: '#fff', fontSize: 16, fontWeight: '700' },
  hint: { color: 'rgba(255,255,255,0.25)', fontSize: 12, textAlign: 'center' },
})
