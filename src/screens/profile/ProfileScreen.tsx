// =============================================================================
// screens/profile/ProfileScreen.tsx — Placeholder
// =============================================================================
import React from 'react'
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native'
import { signOut } from 'firebase/auth'
import { auth } from '../../firebase/config'
import { useUserStore } from '../../store/userStore'

export default function ProfileScreen() {
  const profile = useUserStore(s => s.profile)
  const clearProfile = useUserStore(s => s.clearProfile)

  const handleSignOut = async () => {
    await signOut(auth)
    clearProfile()
  }

  return (
    <View style={s.container}>
      <Text style={s.name}>{profile?.displayName ?? 'Founder'}</Text>
      <Text style={s.email}>{profile?.email}</Text>
      <Text style={s.stat}>Sessions: {profile?.stats.totalSessions ?? 0}</Text>
      <Text style={s.stat}>Streak: {profile?.stats.streak ?? 0} days</Text>
      <TouchableOpacity style={s.btn} onPress={handleSignOut}>
        <Text style={s.btnText}>Sign out</Text>
      </TouchableOpacity>
    </View>
  )
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0C0C13', alignItems: 'center', justifyContent: 'center', gap: 12 },
  name: { color: '#fff', fontSize: 22, fontWeight: '700' },
  email: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  stat: { color: 'rgba(255,255,255,0.6)', fontSize: 14 },
  btn: { marginTop: 20, backgroundColor: '#E24B4A', borderRadius: 12, paddingHorizontal: 28, paddingVertical: 12 },
  btnText: { color: '#fff', fontWeight: '600', fontSize: 15 },
})
