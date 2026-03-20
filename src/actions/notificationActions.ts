
'use server';

import { db } from '@/lib/firebase';
import { doc, updateDoc, writeBatch, collection, query, where, getDocs } from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function markNotificationAsRead(notificationId: string): Promise<{ success: boolean }> {
  try {
    const notificationRef = doc(db, 'notifications', notificationId);
    await updateDoc(notificationRef, { isRead: true });
    // This revalidation might not be strictly necessary since we'll use a real-time listener on the client,
    // but it's good practice for server-driven data.
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Error marking notification as read:", error);
    return { success: false };
  }
}

export async function markAllNotificationsAsRead(userId: string): Promise<{ success: boolean }> {
  if (!userId) return { success: false };

  try {
    const notificationsRef = collection(db, 'notifications');
    const q = query(notificationsRef, where('userId', '==', userId), where('isRead', '==', false));
    const querySnapshot = await getDocs(q);
    
    if (querySnapshot.empty) {
        return { success: true }; // No unread notifications to mark
    }

    const batch = writeBatch(db);
    querySnapshot.forEach((doc) => {
      batch.update(doc.ref, { isRead: true });
    });
    
    await batch.commit();
    revalidatePath('/dashboard');
    return { success: true };
  } catch (error) {
    console.error("Error marking all notifications as read:", error);
    return { success: false };
  }
}
