
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp, orderBy } from 'firebase/firestore';
import type { Review } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export interface ReviewActionResult {
  success: boolean;
  message: string;
  error?: string;
  reviewId?: string;
}

interface AddReviewInput {
  sellerId: string;
  reviewerUid: string;
  reviewerName: string;
  rating: number;
  comment: string;
}

function mapFirestoreDocToReview(doc: any): Review {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString(),
  } as Review;
}

export async function addReview(input: AddReviewInput): Promise<ReviewActionResult> {
  if (!input.reviewerUid) {
    return { success: false, message: "User not authenticated.", error: "Authentication required to add review." };
  }
  if (!input.sellerId || !input.reviewerName || input.rating == null || !input.comment) {
    return { success: false, message: "Missing required review fields.", error: "All fields are required." };
  }

  try {
    const reviewData = {
      ...input,
      date: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'reviews'), reviewData);
    revalidatePath(`/sellers/${input.sellerId}`);
    return {
      success: true,
      message: "Review submitted successfully.",
      reviewId: docRef.id,
    };
  } catch (e) {
    console.error("Error adding review:", e);
    return {
      success: false,
      message: "Failed to submit review.",
      error: e instanceof Error ? e.message : "An unknown error occurred."
    };
  }
}

export async function fetchReviewsBySellerId(sellerId: string): Promise<Review[]> {
  if (!sellerId) return [];
  try {
    const reviewsCol = collection(db, 'reviews');
    const q = query(reviewsCol, where('sellerId', '==', sellerId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapFirestoreDocToReview(doc));
  } catch (error) {
    console.error("Error fetching reviews by seller ID:", error);
    return [];
  }
}
