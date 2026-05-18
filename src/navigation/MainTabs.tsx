// =============================================================================
// navigation/MainTabs.tsx
// PitchSim — Bottom Tab Navigator
// =============================================================================

import React from 'react'
import { View, Text, StyleSheet } from 'react-native'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from '../types/session.types'

// Screens
import HomeScreen from '../screens/home/HomeScreen'
import ProgressScreen from '../screens/progress/ProgressScreen'
import ProfileScreen from '../screens/profile/ProfileScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const ACCENT = '#7F77DD'
const BG = '#0C0C13'

function TabIcon({ label, focused }: { label: string; focused: boolean }) {
  const icons: Record<string, string> = {
    Home: '⚡',
    Progress: '📈',
    Profile: '👤',
  }
  return (
    <View style={tabStyles.iconWrap}>
      <Text style={[tabStyles.icon, focused && tabStyles.iconActive]}>
        {icons[label]}
      </Text>
      <Text style={[tabStyles.label, focused && tabStyles.labelActive]}>
        {label}
      </Text>
    </View>
  )
}

export default function MainTabs() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarStyle: tabStyles.bar,
        tabBarShowLabel: false,
      }}
    >
      <Tab.Screen
        name="Home"
        component={HomeScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Home" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Progress"
        component={ProgressScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Progress" focused={focused} />,
        }}
      />
      <Tab.Screen
        name="Profile"
        component={ProfileScreen}
        options={{
          tabBarIcon: ({ focused }) => <TabIcon label="Profile" focused={focused} />,
        }}
      />
    </Tab.Navigator>
  )
}

const tabStyles = StyleSheet.create({
  bar: {
    backgroundColor: '#13131F',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(255,255,255,0.08)',
    height: 72,
    paddingBottom: 10,
  },
  iconWrap: { alignItems: 'center', gap: 3, paddingTop: 8 },
  icon: { fontSize: 20, opacity: 0.35 },
  iconActive: { opacity: 1 },
  label: { fontSize: 10, color: 'rgba(255,255,255,0.35)', fontWeight: '500' },
  labelActive: { color: ACCENT },
})
