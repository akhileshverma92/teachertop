import {
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import { db } from '@/lib/firebase'
import { COMMENTS_PER_DAY, bumpDay, dayKey } from '@/lib/score'
import { mapTeacher } from '@/lib/teachers'

export type TeacherComment = {
  id: string
  teacherId: string
  userId: string
  displayName: string
  text: string
  createdAt: number
}

export function subscribeComments(
  teacherId: string,
  onChange: (comments: TeacherComment[]) => void,
): Unsubscribe {
  const q = query(collection(db, 'teachers', teacherId, 'comments'), orderBy('createdAt', 'desc'))
  return onSnapshot(
    q,
    (snap) => {
    onChange(
      snap.docs.map((item) => {
        const data = item.data()
        const created = data.createdAt?.toMillis?.() ?? Number(data.createdAt) ?? Date.now()
        return {
          id: item.id,
          teacherId,
          userId: String(data.userId ?? ''),
          displayName: String(data.displayName ?? 'Student'),
          text: String(data.text ?? ''),
          createdAt: created,
        }
      }),
    )
    },
    () => onChange([]),
  )
}

export async function addComment(input: {
  teacherId: string
  userId: string
  displayName: string
  text: string
}) {
  const text = input.text.trim()
  if (!text) throw new Error('Write a comment first')
  if (text.length > 400) throw new Error('Comment is too long')

  const userRef = doc(db, 'users', input.userId)
  const teacherRef = doc(db, 'teachers', input.teacherId)
  const commentRef = doc(collection(db, 'teachers', input.teacherId, 'comments'))

  await runTransaction(db, async (tx) => {
    const userSnap = await tx.get(userRef)
    const teacherSnap = await tx.get(teacherRef)
    if (!userSnap.exists()) throw new Error('Complete your profile before commenting.')
    if (!teacherSnap.exists()) throw new Error('Teacher not found.')

    const now = Date.now()
    const today = dayKey(now)
    const user = userSnap.data()
    const usedToday = user.commentDay === today ? Number(user.commentsToday ?? 0) : 0
    if (usedToday >= COMMENTS_PER_DAY) {
      throw new Error(`You have used all ${COMMENTS_PER_DAY} comments for today.`)
    }

    const mapped = mapTeacher(input.teacherId, teacherSnap.data())
    tx.set(commentRef, {
      teacherId: input.teacherId,
      userId: input.userId,
      displayName: input.displayName.trim().slice(0, 60) || 'Student',
      text,
      createdAt: serverTimestamp(),
    })
    tx.update(userRef, {
      commentDay: today,
      commentsToday: usedToday + 1,
      updatedAt: now,
    })
    tx.update(teacherRef, {
      support: {
        days: bumpDay(mapped.support.days, today, today, 'comments', 1),
        allTime: {
          ...mapped.support.allTime,
          comments: mapped.support.allTime.comments + 1,
        },
      },
      updatedAt: now,
    })
  })
}
