
'use server';

import { z } from 'zod';
import prisma from '@/lib/prisma';

const CreatePaystackTransactionSchema = z.object({
  commodityId: z.string(),
  commodityName: z.string(),
  priceInKobo: z.number().int().positive(), // Paystack uses kobo/cents
  userEmail: z.string().email(),
  currency: z.string().default('USD'), // Default to USD, can be NGN, GHS etc.
});

interface ActionResult {
  authorization_url?: string;
  error?: string;
}

export async function createPaystackTransaction(
  input: z.infer<typeof CreatePaystackTransactionSchema>
): Promise<ActionResult> {
  const validation = CreatePaystackTransactionSchema.safeParse(input);
  if (!validation.success) {
    return { error: 'Invalid input data.' };
  }

  const { commodityId, commodityName, priceInKobo, userEmail, currency } = validation.data;
  const secretKey = process.env.PAYSTACK_SECRET_KEY;

  if (!secretKey) {
    console.error("Paystack secret key is not set.");
    return { error: "Payment service is not configured correctly." };
  }

  const appUrl = process.env.NEXT_PUBLIC_APP_URL;
  if (!appUrl) {
    console.error("NEXT_PUBLIC_APP_URL environment variable is not set.");
    return { error: "Application URL is not configured." };
  }
  const callbackUrl = `${appUrl}/dashboard/commodities/my-listings?payment=success`;

  try {
    const response = await fetch('https://api.paystack.co/transaction/initialize', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${secretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: userEmail,
        amount: priceInKobo,
        currency: currency,
        metadata: {
          commodityId: commodityId,
          commodityName: commodityName,
          custom_fields: [
            {
              display_name: "Commodity ID",
              variable_name: "commodity_id",
              value: commodityId
            }
          ]
        },
        callback_url: callbackUrl
      }),
    });

    const data = await response.json();

    if (!response.ok || !data.status) {
       console.error("Paystack API error:", data);
       return { error: data.message || "Failed to initialize payment with Paystack." };
    }

    return { authorization_url: data.data.authorization_url };

  } catch (error) {
    console.error("Error creating Paystack transaction:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
    return { error: `Failed to create payment session: ${errorMessage}` };
  }
}
