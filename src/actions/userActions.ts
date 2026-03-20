
'use client';

import { db } from '@/lib/firebase';
import { collection, getDocs, query, where, limit, orderBy } from 'firebase/firestore';
import type { User } from '@/lib/types';
import prisma from '@/lib/prisma';

function mapFirestoreDocToUser(doc: any): User {
  const data = doc.data();
  return {
    uid: doc.id, // Ensure uid is set from doc.id
    ...data,
  } as User;
}

export async function fetchSellers(count: number = 6): Promise<User[]> {
  try {
    const usersCol = collection(db, 'users');
    // Fetch users who are sellers, order by name for consistency, and limit the count.
    const q = query(usersCol, where('userType', '==', 'seller'), orderBy('name'), limit(count));
    const snapshot = await getDocs(q);
    if (snapshot.empty) {
      console.log("No sellers found in Firestore.");
      return [];
    }
    return snapshot.docs.map(doc => mapFirestoreDocToUser(doc));
  } catch (error) {
    console.error("Error fetching sellers:", error);
    return [];
  }
}
