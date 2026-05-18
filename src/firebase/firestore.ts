import { collection, addDoc, query, where, orderBy, getDocs, doc, updateDoc, increment } from 'firebase/firestore'
import { db } from './config'
import type { Session } from '../types/session.types'

export async function saveSession(userId: string, session: Session) {
  await addDoc(collection(db, 'sessions'), {
    ...session,
    userId,
    createdAt: new Date(),
  })
  // Update user aggregate scores
  const userRef = doc(db, 'users', userId)
  await updateDoc(userRef, {
    totalSessions: increment(1),
  })
}

export async function getUserSessions(userId: string): Promise<Session[]> {
  const q = query(
    collection(db, 'sessions'),
    where('userId', '==', userId),
    orderBy('createdAt', 'desc')
  )
  const snap = await getDocs(q)
  return snap.docs.map(d => ({ id: d.id, ...d.data() } as Session))
}