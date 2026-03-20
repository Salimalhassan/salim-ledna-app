
'use server';

import { db } from '@/lib/firebase';
import { collection, addDoc, getDocs, query, where, serverTimestamp, Timestamp, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import type { Transaction } from '@/lib/types';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';

export interface TransactionActionResult {
  success: boolean;
  message: string;
  error?: string;
  transactionId?: string;
}

// Input for creating a new transaction - details to be finalized when UI is built
interface AddTransactionInput {
  commodityId: string;
  commodityName: string;
  sellerId: string;
  sellerName: string;
  buyerId: string;
  buyerName: string;
  quantity: number;
  unit: string;
  totalPrice: number;
  status: 'Completed' | 'Pending' | 'Cancelled';
}

function mapFirestoreDocToTransaction(doc: any): Transaction {
  const data = doc.data();
  return {
    id: doc.id,
    ...data,
    date: data.date instanceof Timestamp ? data.date.toDate().toISOString() : new Date().toISOString(),
  } as Transaction;
}

// Placeholder: Actual creation will depend on UI flow
export async function addTransaction(input: AddTransactionInput): Promise<TransactionActionResult> {
   if (!input.buyerId) {
    return { success: false, message: "User not authenticated.", error: "Authentication required to record transaction." };
  }
  // Add more validation as needed
  
  try {
    const transactionData = {
      ...input,
      date: serverTimestamp(),
    };
    const docRef = await addDoc(collection(db, 'transactions'), transactionData);
    
    // Revalidate paths for both buyer and seller
    revalidatePath('/dashboard/buyer/transactions');
    revalidatePath('/dashboard/seller/transactions'); 

    // Add notification for the seller
    await addDoc(collection(db, 'notifications'), {
        userId: input.sellerId,
        type: 'transaction_update',
        message: `You have a new pending order from ${input.buyerName} for "${input.commodityName}".`,
        link: `/dashboard/seller/transactions`,
        isRead: false,
        timestamp: serverTimestamp(),
    });

    return {
      success: true,
      message: "Transaction recorded successfully.",
      transactionId: docRef.id,
    };
  } catch (e) {
    console.error("Error adding transaction:", e);
    return {
      success: false,
      message: "Failed to record transaction.",
      error: e instanceof Error ? e.message : "An unknown error occurred."
    };
  }
}

export async function fetchUserTransactions(buyerId: string): Promise<Transaction[]> {
  if (!buyerId) return [];
  try {
    const transactionsCol = collection(db, 'transactions');
    const q = query(transactionsCol, where('buyerId', '==', buyerId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapFirestoreDocToTransaction(doc));
  } catch (error) {
    console.error("Error fetching user transactions:", error);
    return [];
  }
}

// Function to fetch transactions where the user is the seller
export async function fetchSellerTransactions(sellerId: string): Promise<Transaction[]> {
  if (!sellerId) return [];
  try {
    const transactionsCol = collection(db, 'transactions');
    const q = query(transactionsCol, where('sellerId', '==', sellerId), orderBy('date', 'desc'));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(doc => mapFirestoreDocToTransaction(doc));
  } catch (error) {
    console.error("Error fetching seller transactions:", error);
    return [];
  }
}

// Function to update the status of a transaction
export async function updateTransactionStatus(
  transactionId: string,
  status: 'Completed' | 'Pending' | 'Cancelled'
): Promise<TransactionActionResult> {
  if (!transactionId || !status) {
    return { success: false, message: 'Transaction ID and status are required.' };
  }

  try {
    const transactionRef = doc(db, 'transactions', transactionId);
    await updateDoc(transactionRef, { status: status });

    // Revalidate the path to ensure the seller's view is updated.
    revalidatePath('/dashboard/seller/transactions');

    // Send a notification to the buyer about the status update
    const transactionSnap = await getDoc(transactionRef);
    if(transactionSnap.exists()) {
        const transactionData = transactionSnap.data();
        const buyerId = transactionData.buyerId;
        if(buyerId) {
            revalidatePath(`/dashboard/buyer/transactions`); // Also revalidate buyer's view
            
            await addDoc(collection(db, 'notifications'), {
                userId: buyerId,
                type: 'transaction_update',
                message: `The status of your order for "${transactionData.commodityName}" has been updated to ${status}.`,
                link: `/dashboard/buyer/transactions`,
                isRead: false,
                timestamp: serverTimestamp(),
            });
        }
    }

    return {
      success: true,
      message: 'Transaction status updated successfully.',
    };
  } catch (e) {
    console.error("Error updating transaction status:", e);
    return {
      success: false,
      message: 'Failed to update transaction status.',
      error: e instanceof Error ? e.message : 'An unknown error occurred.'
    };
  }
}
