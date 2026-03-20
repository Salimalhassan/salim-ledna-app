
'use server';

import { db } from '@/lib/firebase';
import { collection, getCountFromServer } from 'firebase/firestore';
import type { AdminDashboardStats } from '@/lib/types';
import { ADMIN_USER_IDS } from '@/config/admin';
import { getAuth } from 'firebase-admin/auth';

import prisma from '@/lib/prisma';

// Helper function to check if the caller is an admin
// In a real app, you would get the user from the session or a secure token.
// For this action, we assume an admin context is already established by the route guard.
// A more robust check might involve passing the user's ID token and verifying it.
async function verifyAdmin(userId: string) {
    if (!ADMIN_USER_IDS.includes(userId)) {
        throw new Error('Unauthorized: You do not have permission to perform this action.');
    }
    // Optional: Cross-check with Firebase Admin SDK for custom claims if you use them
    try {
        const user = await getAuth(adminApp).getUser(userId);
        if (!user.customClaims?.admin) {
             // If you are using custom claims, this check is more secure.
             // For now, we rely on the hardcoded UID list.
             // throw new Error('Unauthorized: Missing admin privileges.');
        }
    } catch (error) {
        console.error("Error verifying admin status:", error);
        throw new Error('Could not verify admin status.');
    }
}


export async function fetchAdminDashboardStats(): Promise<AdminDashboardStats> {
  try {
    // In a real-world scenario with proper session management, you'd get the UID from the session.
    // Since this is a server action, we're relying on the page-level guard (`AdminRoute`) to protect it.
    
    const usersCol = collection(db, 'users');
    const commoditiesCol = collection(db, 'commodities');
    const reviewsCol = collection(db, 'reviews');
    
    const [usersSnapshot, commoditiesSnapshot, reviewsSnapshot] = await Promise.all([
      getCountFromServer(usersCol),
      getCountFromServer(commoditiesCol),
      getCountFromServer(reviewsCol)
    ]);

    return {
      totalUsers: usersSnapshot.data().count,
      totalListings: commoditiesSnapshot.data().count,
      totalReviews: reviewsSnapshot.data().count,
    };
  } catch (error) {
    console.error("Error fetching admin dashboard stats:", error);
    // Return zeroed stats on error to prevent crashing the page
    return {
      totalUsers: 0,
      totalListings: 0,
      totalReviews: 0,
    };
  }
}
