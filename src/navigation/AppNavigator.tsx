import React from 'react'
import { View, ActivityIndicator, StyleSheet } from 'react-native'
import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import { useAuth } from '../hooks/useAuth'
import LoginScreen from '../screens/auth/LoginScreen'
import MainTabs from './MainTabs'
import PersonaSelectScreen from '../screens/persona/PersonaSelectScreen'
import PitchTipsScreen from '../screens/session/PitchTipsScreen'
import PitchRecordScreen from '../screens/session/PitchRecordScreen'
import QAScreen from '../screens/session/QAScreen'
import ScoreReportScreen from '../screens/session/ScoreReportScreen'
import SessionDetailScreen from '../screens/session/SessionDetailScreen'
import type { RootStackParamList } from '../types/session.types'

const Stack = createNativeStackNavigator<RootStackParamList>()

function LoadingScreen() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator color="#7F77DD" size="large" />
    </View>
  )
}

export default function AppNavigator() {
  const { isAuthenticated, isLoading } = useAuth()

  if (isLoading) return <LoadingScreen />

  return (
    <NavigationContainer>
      <Stack.Navigator screenOptions={{ headerShown: false, animation: 'fade' }}>
        {isAuthenticated ? (
          <>
            <Stack.Screen name="Main" component={MainTabs} />
            <Stack.Screen name="PersonaSelect" component={PersonaSelectScreen} options={{ animation: 'slide_from_bottom' }} />
            <Stack.Screen name="PitchTips" component={PitchTipsScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="PitchRecord" component={PitchRecordScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="QA" component={QAScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="ScoreReport" component={ScoreReportScreen} options={{ animation: 'slide_from_right' }} />
            <Stack.Screen name="SessionDetail" component={SessionDetailScreen} options={{ animation: 'slide_from_right' }} />
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  )
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    backgroundColor: '#0C0C13',
    alignItems: 'center',
    justifyContent: 'center',
  },
})
