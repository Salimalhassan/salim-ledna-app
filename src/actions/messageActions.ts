
'use server';

import { db } from '@/lib/firebase';
import type { User } from '@/lib/types';
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  serverTimestamp,
  doc,
  updateDoc,
  getDoc,
  orderBy,
  limit,
} from 'firebase/firestore';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export async function startOrGetConversation(
  user1Id: string,
  user2Id: string
): Promise<{ conversationId: string }> {
  if (!user1Id || !user2Id) {
    throw new Error('Both user IDs must be provided');
  }

  // Ensure consistent order for the query
  const participants = [user1Id, user2Id].sort();

  const conversationsRef = collection(db, 'conversations');
  const q = query(
    conversationsRef,
    where('participantIds', '==', participants)
  );

  const querySnapshot = await getDocs(q);

  if (!querySnapshot.empty) {
    // Conversation already exists
    return { conversationId: querySnapshot.docs[0].id };
  } else {
    // Create a new conversation
    const user1Doc = await getDoc(doc(db, 'users', user1Id));
    const user2Doc = await getDoc(doc(db, 'users', user2Id));

    if (!user1Doc.exists() || !user2Doc.exists()) {
      throw new Error('One or both users not found.');
    }

    const user1Data = user1Doc.data() as User;
    const user2Data = user2Doc.data() as User;

    const newConversationData = {
      participantIds: participants,
      participantInfo: {
        [user1Id]: {
          name: user1Data.name,
          avatarUrl: user1Data.avatarUrl || '',
        },
        [user2Id]: {
          name: user2Data.name,
          avatarUrl: user2Data.avatarUrl || '',
        },
      },
      lastMessage: null,
      updatedAt: serverTimestamp(),
    };

    const newConversationRef = await addDoc(conversationsRef, newConversationData);
    revalidatePath('/dashboard/messages');
    return { conversationId: newConversationRef.id };
  }
}

export async function sendMessage(
  conversationId: string,
  senderId: string,
  text: string
): Promise<void> {
  if (!conversationId || !senderId || !text.trim()) {
    throw new Error('Missing required fields to send a message.');
  }

  const messagesRef = collection(db, 'conversations', conversationId, 'messages');
  const conversationRef = doc(db, 'conversations', conversationId);

  const newMessage = {
    senderId,
    text: text.trim(),
    timestamp: serverTimestamp(),
  };

  await addDoc(messagesRef, newMessage);

  await updateDoc(conversationRef, {
    lastMessage: {
      text: text.trim(),
      senderId,
      timestamp: serverTimestamp(),
    },
    updatedAt: serverTimestamp(),
  });

  // --- Start: Add notification logic ---
  try {
    const conversationSnap = await getDoc(conversationRef);
    if (conversationSnap.exists()) {
      const conversationData = conversationSnap.data();
      const recipientId = conversationData.participantIds.find((id: string) => id !== senderId);

      if (recipientId) {
        const senderDoc = await getDoc(doc(db, 'users', senderId));
        const senderName = senderDoc.exists() ? senderDoc.data()?.name : 'Someone';
        
        await addDoc(collection(db, 'notifications'), {
          userId: recipientId,
          type: 'new_message',
          message: `You have a new message from ${senderName}.`,
          link: `/dashboard/messages/${conversationId}`,
          isRead: false,
          timestamp: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    console.error("Failed to create notification:", error);
    // Don't block message sending if notification fails
  }
  // --- End: Add notification logic ---

  revalidatePath(`/dashboard/messages`);
  revalidatePath(`/dashboard/messages/${conversationId}`);
}
