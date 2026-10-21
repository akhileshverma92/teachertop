'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut as firebaseSignOut,
  updateProfile,
  type User,
} from 'firebase/auth'
import { ADMIN_EMAILS, auth, googleProvider } from '@/lib/firebase'
import { ensureUserProfile, subscribeUserProfile, updateUserProfile } from '@/lib/users'
import type { UserProfile } from '@/lib/types'

function assertAdminProfile(profile: UserProfile): UserProfile {
  if (profile.role !== 'admin') {
    throw new Error('This account is not an admin. Use the student login instead.')
  }
  return profile
}

type AuthContextValue = {
  user: User | null
  profile: UserProfile | null
  loading: boolean
  isAdmin: boolean
  signInWithGoogle: () => Promise<void>
  signInWithEmail: (email: string, password: string) => Promise<void>
  signUpWithEmail: (email: string, password: string, displayName: string) => Promise<void>
  /** Admin portal only — rejects non-admin accounts after sign-in. */
  signInAdmin: (email: string, password: string) => Promise<UserProfile>
  signOut: () => Promise<void>
  saveProfile: (patch: { displayName: string }) => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [profile, setProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let unsubProfile: (() => void) | undefined

    const unsubAuth = onAuthStateChanged(auth, async (next) => {
      unsubProfile?.()
      unsubProfile = undefined
      setUser(next)

      if (!next) {
        setProfile(null)
        setLoading(false)
        return
      }

      try {
        const ensured = await ensureUserProfile(next)
        setProfile(ensured)
        unsubProfile = subscribeUserProfile(next.uid, setProfile)
      } catch (err) {
        console.error('Failed to load profile', err)
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      unsubAuth()
      unsubProfile?.()
    }
  }, [])

  const signInWithGoogle = useCallback(async () => {
    await signInWithPopup(auth, googleProvider)
  }, [])

  const signInWithEmail = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email.trim(), password)
  }, [])

  const signUpWithEmail = useCallback(
    async (email: string, password: string, displayName: string) => {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password)
      const name = displayName.trim() || email.split('@')[0]
      await updateProfile(cred.user, { displayName: name })
      await ensureUserProfile(cred.user)
    },
    [],
  )

  const signInAdmin = useCallback(async (email: string, password: string) => {
    const normalized = email.trim().toLowerCase()
    if (ADMIN_EMAILS.length && !ADMIN_EMAILS.includes(normalized)) {
      throw new Error('This email is not authorized for admin access.')
    }
    const cred = await signInWithEmailAndPassword(auth, email.trim(), password)
    try {
      const profile = await ensureUserProfile(cred.user)
      return assertAdminProfile(profile)
    } catch (err) {
      await firebaseSignOut(auth)
      throw err
    }
  }, [])

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth)
  }, [])

  const saveProfile = useCallback(
    async (patch: { displayName: string }) => {
      if (!user) throw new Error('Not signed in')
      const displayName = patch.displayName.trim()
      if (!displayName) throw new Error('Display name is required')
      await updateProfile(user, { displayName })
      await updateUserProfile(user.uid, { displayName })
    },
    [user],
  )

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      profile,
      loading,
      isAdmin: profile?.role === 'admin',
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInAdmin,
      signOut,
      saveProfile,
    }),
    [
      user,
      profile,
      loading,
      signInWithGoogle,
      signInWithEmail,
      signUpWithEmail,
      signInAdmin,
      signOut,
      saveProfile,
    ],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
