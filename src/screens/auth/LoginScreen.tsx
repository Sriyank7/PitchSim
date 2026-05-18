// =============================================================================
// screens/auth/LoginScreen.tsx
// PitchSim — Login Screen
//
// Handles Email/Password login, Google Sign-in, and new account creation.
// On success: creates/updates user profile in Firestore → navigates to Main.
// =============================================================================

import React, { useState, useRef, useEffect } from 'react'
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  Animated,
  Easing,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
} from 'react-native'
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  GoogleAuthProvider,
  signInWithCredential,
  updateProfile,
} from 'firebase/auth'
import { auth } from '../../firebase/config'
import { upsertUserProfile } from '../../services/sessionService'
import { useUserStore } from '../../store/userStore'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import type { RootStackParamList } from '../../types/session.types'

type LoginNavProp = NativeStackNavigationProp<RootStackParamList, 'Login'>

type Props = { navigation: LoginNavProp }

type AuthMode = 'login' | 'signup'

const BG = '#0C0C13'
const ACCENT = '#7F77DD'

// ─── Animated logo ────────────────────────────────────────────────────────────

function AnimatedLogo() {
  const pulse = useRef(new Animated.Value(1)).current
  const glow = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1.06, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 1, duration: 1800, easing: Easing.inOut(Easing.ease), useNativeDriver: true }),
      ])
    ).start()

    Animated.loop(
      Animated.sequence([
        Animated.timing(glow, { toValue: 1, duration: 2000, useNativeDriver: false }),
        Animated.timing(glow, { toValue: 0, duration: 2000, useNativeDriver: false }),
      ])
    ).start()
  }, [])

  const glowColor = glow.interpolate({
    inputRange: [0, 1],
    outputRange: [ACCENT + '33', ACCENT + '88'],
  })

  return (
    <Animated.View style={[styles.logoWrap, { transform: [{ scale: pulse }] }]}>
      <Animated.View style={[styles.logoGlow, { backgroundColor: glowColor }]} />
      <Text style={styles.logoIcon}>🎯</Text>
    </Animated.View>
  )
}

// ─── Input field ──────────────────────────────────────────────────────────────

function InputField({
  label,
  value,
  onChangeText,
  placeholder,
  secureTextEntry = false,
  keyboardType = 'default',
  autoCapitalize = 'none',
}: {
  label: string
  value: string
  onChangeText: (t: string) => void
  placeholder: string
  secureTextEntry?: boolean
  keyboardType?: any
  autoCapitalize?: any
}) {
  const [focused, setFocused] = useState(false)
  const borderAnim = useRef(new Animated.Value(0)).current

  useEffect(() => {
    Animated.timing(borderAnim, {
      toValue: focused ? 1 : 0,
      duration: 200,
      useNativeDriver: false,
    }).start()
  }, [focused])

  const borderColor = borderAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(255,255,255,0.12)', ACCENT],
  })

  return (
    <View style={styles.inputWrap}>
      <Text style={styles.inputLabel}>{label}</Text>
      <Animated.View style={[styles.inputBox, { borderColor }]}>
        <TextInput
          style={styles.input}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor="rgba(255,255,255,0.25)"
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
        />
      </Animated.View>
    </View>
  )
}

// ─── Main screen ──────────────────────────────────────────────────────────────

export default function LoginScreen({ navigation }: Props) {
  const [mode, setMode] = useState<AuthMode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')
  const [loading, setLoading] = useState(false)

  const setProfile = useUserStore(s => s.setProfile)

  const fadeIn = useRef(new Animated.Value(0)).current
  const slideUp = useRef(new Animated.Value(30)).current

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeIn, { toValue: 1, duration: 600, useNativeDriver: true }),
      Animated.spring(slideUp, { toValue: 0, tension: 60, friction: 10, useNativeDriver: true }),
    ]).start()
  }, [])

  // ── Handle email/password auth ─────────────────────────────────────────────
  const handleEmailAuth = async () => {
    if (!email.trim() || !password.trim()) {
      Alert.alert('Missing fields', 'Please enter your email and password.')
      return
    }
    if (mode === 'signup' && !name.trim()) {
      Alert.alert('Missing name', 'Please enter your name.')
      return
    }
    if (password.length < 6) {
      Alert.alert('Weak password', 'Password must be at least 6 characters.')
      return
    }

    setLoading(true)
    try {
      let userCredential

      if (mode === 'login') {
        userCredential = await signInWithEmailAndPassword(auth, email.trim(), password)
      } else {
        userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password)
        // Set display name for new accounts
        await updateProfile(userCredential.user, { displayName: name.trim() })
      }

      const { user } = userCredential

      // Create/update Firestore profile
      await upsertUserProfile({
        uid: user.uid,
        displayName: user.displayName ?? name.trim() ?? 'Founder',
        email: user.email ?? email.trim(),
        photoUrl: user.photoURL,
      })

      // Update Zustand store
      setProfile({
        uid: user.uid,
        displayName: user.displayName ?? name.trim() ?? 'Founder',
        email: user.email ?? email.trim(),
        photoUrl: user.photoURL,
        stats: {
          totalSessions: 0,
          avgOverall: 0,
          avgByAxis: {},
          persistentWeakness: null,
          persistentStrength: null,
          streak: 0,
          lastSessionAt: null,
        },
        createdAt: new Date().toISOString(),
      })


    } catch (error: any) {
      const msg = getAuthErrorMessage(error.code)
      Alert.alert('Error', msg)
    } finally {
      setLoading(false)
    }
  }

  // ── Toggle between login and signup ────────────────────────────────────────
  const toggleMode = () => {
    setMode(m => m === 'login' ? 'signup' : 'login')
    setEmail('')
    setPassword('')
    setName('')
  }

  return (
    <SafeAreaView style={styles.safe}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Animated.View
          style={[
            styles.container,
            { opacity: fadeIn, transform: [{ translateY: slideUp }] },
          ]}
        >
          {/* Logo */}
          <AnimatedLogo />

          {/* Header */}
          <View style={styles.header}>
            <Text style={styles.appName}>PitchSim</Text>
            <Text style={styles.tagline}>Practice pitching. Get investor-ready.</Text>
          </View>

          {/* Mode toggle */}
          <View style={styles.modeToggle}>
            {(['login', 'signup'] as AuthMode[]).map(m => (
              <TouchableOpacity
                key={m}
                style={[styles.modeBtn, mode === m && styles.modeBtnActive]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.modeBtnText, mode === m && styles.modeBtnTextActive]}>
                  {m === 'login' ? 'Sign in' : 'Create account'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === 'signup' && (
              <InputField
                label="Full name"
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                autoCapitalize="words"
              />
            )}
            <InputField
              label="Email"
              value={email}
              onChangeText={setEmail}
              placeholder="you@example.com"
              keyboardType="email-address"
            />
            <InputField
              label="Password"
              value={password}
              onChangeText={setPassword}
              placeholder="Min. 6 characters"
              secureTextEntry
            />
          </View>

          {/* Primary button */}
          <TouchableOpacity
            style={[styles.primaryBtn, loading && styles.primaryBtnDisabled]}
            onPress={handleEmailAuth}
            disabled={loading}
            activeOpacity={0.85}
          >
            {loading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <Text style={styles.primaryBtnText}>
                {mode === 'login' ? 'Sign in' : 'Create account'}
              </Text>
            )}
          </TouchableOpacity>

          {/* Divider */}
          <View style={styles.dividerRow}>
            <View style={styles.dividerLine} />
            <Text style={styles.dividerText}>or</Text>
            <View style={styles.dividerLine} />
          </View>

          {/* Google button */}
          <TouchableOpacity
            style={styles.googleBtn}
            onPress={() => Alert.alert(
              'Google Sign-in',
              'Google sign-in requires additional setup with SHA-1 fingerprint for Android. Use email/password for now.'
            )}
            activeOpacity={0.85}
          >
            <Text style={styles.googleIcon}>G</Text>
            <Text style={styles.googleBtnText}>Continue with Google</Text>
          </TouchableOpacity>

          {/* Switch mode */}
          <TouchableOpacity style={styles.switchWrap} onPress={toggleMode}>
            <Text style={styles.switchText}>
              {mode === 'login'
                ? "Don't have an account? "
                : 'Already have an account? '}
              <Text style={styles.switchLink}>
                {mode === 'login' ? 'Sign up' : 'Sign in'}
              </Text>
            </Text>
          </TouchableOpacity>

        </Animated.View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  )
}

// ─── Auth error messages ──────────────────────────────────────────────────────

function getAuthErrorMessage(code: string): string {
  switch (code) {
    case 'auth/user-not-found':
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
      return 'Incorrect email or password. Please try again.'
    case 'auth/email-already-in-use':
      return 'An account with this email already exists. Try signing in.'
    case 'auth/invalid-email':
      return 'Please enter a valid email address.'
    case 'auth/weak-password':
      return 'Password must be at least 6 characters.'
    case 'auth/too-many-requests':
      return 'Too many attempts. Please wait a moment and try again.'
    case 'auth/network-request-failed':
      return 'Network error. Check your connection and try again.'
    default:
      return 'Something went wrong. Please try again.'
  }
}

// ─── Styles ───────────────────────────────────────────────────────────────────

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: BG },
  container: {
    flex: 1,
    paddingHorizontal: 28,
    paddingTop: 40,
    paddingBottom: 24,
    alignItems: 'center',
  },

  logoWrap: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    position: 'relative',
  },
  logoGlow: {
    position: 'absolute',
    width: 80,
    height: 80,
    borderRadius: 40,
  },
  logoIcon: { fontSize: 36 },

  header: { alignItems: 'center', marginBottom: 32, gap: 6 },
  appName: {
    color: '#FFFFFF',
    fontSize: 30,
    fontWeight: '700',
    letterSpacing: -0.5,
  },
  tagline: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
  },

  modeToggle: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255,255,255,0.06)',
    borderRadius: 22,
    padding: 3,
    marginBottom: 28,
    width: '100%',
  },
  modeBtn: {
    flex: 1,
    paddingVertical: 9,
    borderRadius: 19,
    alignItems: 'center',
  },
  modeBtnActive: { backgroundColor: ACCENT },
  modeBtnText: {
    color: 'rgba(255,255,255,0.4)',
    fontSize: 14,
    fontWeight: '500',
  },
  modeBtnTextActive: { color: '#FFFFFF' },

  form: { width: '100%', gap: 14, marginBottom: 20 },

  inputWrap: { width: '100%', gap: 6 },
  inputLabel: { color: 'rgba(255,255,255,0.5)', fontSize: 12, fontWeight: '500' },
  inputBox: {
    borderWidth: 1,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.05)',
  },
  input: {
    color: '#FFFFFF',
    fontSize: 15,
    paddingHorizontal: 16,
    paddingVertical: 13,
  },

  primaryBtn: {
    width: '100%',
    backgroundColor: ACCENT,
    borderRadius: 16,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 20,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '700' },

  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    width: '100%',
    marginBottom: 16,
  },
  dividerLine: {
    flex: 1,
    height: StyleSheet.hairlineWidth,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  dividerText: { color: 'rgba(255,255,255,0.3)', fontSize: 13 },

  googleBtn: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    backgroundColor: 'rgba(255,255,255,0.07)',
    borderWidth: StyleSheet.hairlineWidth,
    borderColor: 'rgba(255,255,255,0.15)',
    borderRadius: 16,
    paddingVertical: 14,
    marginBottom: 24,
  },
  googleIcon: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  googleBtnText: { color: 'rgba(255,255,255,0.8)', fontSize: 15, fontWeight: '500' },

  switchWrap: { marginTop: 'auto' },
  switchText: { color: 'rgba(255,255,255,0.4)', fontSize: 14 },
  switchLink: { color: ACCENT, fontWeight: '600' },
})
