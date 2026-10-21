import { doc, getDoc, onSnapshot, setDoc, updateDoc, type Unsubscribe } from 'firebase/firestore'
import type { User } from 'firebase/auth'
import { ADMIN_EMAILS, db } from '@/lib/firebase'
import type { UserProfile, UserRole } from '@/lib/types'

export function mapProfile(uid: string, data: Record<string, unknown>): UserProfile {
  const email = String(data.email ?? '')
  const storedRole: UserRole = (data.role as UserRole) === 'admin' ? 'admin' : 'student'
  // UI admin access: Firestore role, or email listed in NEXT_PUBLIC_ADMIN_EMAILS
  const role: UserRole =
    storedRole === 'admin' || ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'student'

  return {
    uid,
    email,
    displayName: String(data.displayName ?? ''),
    photoURL: String(data.photoURL ?? ''),
    role,
    votesUsed: Number(data.votesUsed ?? 0),
    votedTeacherIds: Array.isArray(data.votedTeacherIds)
      ? data.votedTeacherIds.map(String)
      : [],
    boostDay: String(data.boostDay ?? ''),
    boostsToday: Number(data.boostsToday ?? 0),
    commentDay: String(data.commentDay ?? ''),
    commentsToday: Number(data.commentsToday ?? 0),
    lastVoteAt: Number(data.lastVoteAt ?? 0),
    likedTeacherIds: Array.isArray(data.likedTeacherIds) ? data.likedTeacherIds.map(String) : [],
    createdAt: Number(data.createdAt ?? 0),
    updatedAt: Number(data.updatedAt ?? 0),
  }
}

export async function ensureUserProfile(user: User): Promise<UserProfile> {
  const ref = doc(db, 'users', user.uid)
  const snap = await getDoc(ref)
  const now = Date.now()

  if (snap.exists()) {
    const existing = mapProfile(user.uid, snap.data())
    const patch: Partial<UserProfile> = {}
    if (user.email && user.email !== existing.email) patch.email = user.email
    if (user.photoURL && user.photoURL !== existing.photoURL) patch.photoURL = user.photoURL
    if (Object.keys(patch).length) {
      await updateDoc(ref, { ...patch, updatedAt: now })
      return mapProfile(user.uid, { ...snap.data(), ...patch, updatedAt: now })
    }
    return existing
  }

  const email = user.email ?? ''
  const role: UserRole = ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'student'

  const profile: UserProfile = {
    uid: user.uid,
    email,
    displayName: user.displayName?.trim() || email.split('@')[0] || 'Student',
    photoURL: user.photoURL ?? '',
    role,
    votesUsed: 0,
    votedTeacherIds: [],
    boostDay: '',
    boostsToday: 0,
    commentDay: '',
    commentsToday: 0,
    lastVoteAt: 0,
    likedTeacherIds: [],
    createdAt: now,
    updatedAt: now,
  }

  await setDoc(ref, profile)
  return mapProfile(user.uid, profile)
}

export function subscribeUserProfile(
  uid: string,
  onChange: (profile: UserProfile | null) => void,
): Unsubscribe {
  return onSnapshot(doc(db, 'users', uid), (snap) => {
    onChange(snap.exists() ? mapProfile(uid, snap.data()) : null)
  })
}

export async function updateUserProfile(
  uid: string,
  patch: Partial<Pick<UserProfile, 'displayName' | 'photoURL'>>,
): Promise<void> {
  await updateDoc(doc(db, 'users', uid), {
    ...patch,
    updatedAt: Date.now(),
  })
}
