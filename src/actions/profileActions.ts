
'use server';

import type * as z from 'zod';
import type { UserProfileSchema } from '@/lib/schemas';
import { db } from '@/lib/firebase'; // Import Firestore instance
import { doc, updateDoc, serverTimestamp, getDoc } from 'firebase/firestore';
import prisma from '@/lib/prisma';

export interface ProfileActionResult {
  success: boolean;
  message: string;
  error?: string;
}

export async function handleUpdateProfile(
  uid: string, // User's Firebase UID
  values: z.infer<typeof UserProfileSchema>
): Promise<ProfileActionResult> {
  if (!uid) {
    return {
      success: false,
      message: "User not authenticated.",
      error: "Authentication is required to update profile."
    };
  }

  console.log(`Server Action: User ${uid} attempting to update profile with:`);
  console.log(values);

  try {
    const userDocRef = doc(db, 'users', uid);
    
    // Prepare data for Firestore, filtering out undefined values if necessary
    // and ensuring email (if present and changed) is handled with care
    // For this example, we assume email is not changed here or managed via Firebase Auth directly.
    const profileDataToUpdate: Partial<z.infer<typeof UserProfileSchema>> = {};
    
    (Object.keys(values) as Array<keyof typeof values>).forEach(key => {
      if (values[key] !== undefined && key !== 'email') { // Exclude email from direct update here
        // @ts-ignore
        profileDataToUpdate[key] = values[key];
      }
    });

    // Add a timestamp for when the profile was last updated
    // @ts-ignore
    profileDataToUpdate.updatedAt = serverTimestamp();


    await updateDoc(userDocRef, {
      ...profileDataToUpdate
    });

    console.log(`Server Action: Profile for user ${uid} updated successfully.`);
    return {
      success: true,
      message: "Profile information has been updated successfully.",
    };

  } catch (e) {
    console.error("Error in handleUpdateProfile:", e);
    return {
      success: false,
      message: "Failed to update profile.",
      error: e instanceof Error ? e.message : "An unknown error occurred."
    };
  }
}
