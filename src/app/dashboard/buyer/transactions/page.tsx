
'use client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShoppingCart, Loader2 } from "lucide-react";
import { format } from 'date-fns';
import { useSession } from '@supabase/auth-helpers-react';
import { useRouter } from 'next/navigation';
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useEffect, useState } from "react";
import type { Transaction } from "@/lib/types";
import { fetchUserTransactions } from "@/actions/transactionActions";
import { useToast } from "@/hooks/use-toast";
import { Skeleton } from "@/components/ui/skeleton";

export default function BuyerTransactionsPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const { toast } = useToast();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isLoadingTransactions, setIsLoadingTransactions] = useState(true);

  useEffect(() => {
    async function loadTransactions() {
      if (session?.user?.id && session.user.userType === 'buyer') {
        setIsLoadingTransactions(true);
        try {
          const fetchedTransactions = await fetchUserTransactions(session.user.id);
          setTransactions(fetchedTransactions);
        } catch (error) {
          console.error("Failed to fetch transactions:", error);
          toast({ variant: "destructive", title: "Error", description: "Could not load your transactions." });
        } finally {
          setIsLoadingTransactions(false);
        }
      } else if (session?.user && session.user.userType !== 'buyer') {
        setIsLoadingTransactions(false);
      } else if (!session && status !== 'loading') {
        setIsLoadingTransactions(false);
      }
    }
    if (status !== 'loading') {
      loadTransactions();
    }
  }, [session, status, toast]);

  if (status === 'loading' || (session?.user?.userType === 'buyer' && isLoadingTransactions && transactions.length === 0)) {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6">
        <Skeleton className="h-9 w-1/2 mb-8" />
        <Card className="shadow-xl">
          <CardHeader>
            <Skeleton className="h-7 w-1/3 mb-2" />
            <Skeleton className="h-4 w-1/2" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="flex justify-between items-center p-2 border-b">
                  <div className="space-y-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="h-3 w-60" />
                  </div>
                  <Skeleton className="h-6 w-20" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session) {
    router.push('/auth/login');
    return null;
  }

  if (session.user.userType !== 'buyer') {
    return (
      <div className="container mx-auto py-8 px-4 md:px-6 text-center">
        <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Access Denied</h2>
        <p className="text-muted-foreground mb-4">Only buyers can view transaction history.</p>
        <Button asChild>
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    );
  }

  return (
    <div className="container mx-auto py-8 px-4 md:px-6">
      <h1 className="text-3xl font-bold mb-8 font-headline flex items-center">
        <ShoppingCart className="mr-3 h-8 w-8 text-primary" />
        My Transaction History
      </h1>
      <Card className="shadow-xl">
        <CardHeader>
          <CardTitle>Your Past Orders</CardTitle>
          <CardDescription>Review your previous commodity purchases.</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoadingTransactions && transactions.length === 0 ? (
            <div className="text-center py-12">
              <Loader2 className="mx-auto h-12 w-12 animate-spin text-primary mb-4" />
              <p>Loading your transactions...</p>
            </div>
          ) : transactions.length > 0 ? (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Commodity</TableHead>
                  <TableHead>Seller</TableHead>
                  <TableHead className="text-right">Quantity</TableHead>
                  <TableHead className="text-right">Total Price</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((txn) => (
                  <TableRow key={txn.id}>
                    <TableCell>{format(new Date(txn.date), 'PPP')}</TableCell>
                    <TableCell className="font-medium">{txn.commodityName}</TableCell>
                    <TableCell>{txn.sellerName}</TableCell>
                    <TableCell className="text-right">{txn.quantity} {txn.unit}</TableCell>
                    <TableCell className="text-right">${txn.totalPrice.toFixed(2)}</TableCell>
                    <TableCell className="text-center">
                      <Badge variant={
                        txn.status === 'Completed' ? 'default' :
                          txn.status === 'Pending' ? 'secondary' : 'destructive'
                      }
                        className={
                          txn.status === 'Completed' ? 'bg-green-500/80 hover:bg-green-500/70 text-white' :
                            txn.status === 'Pending' ? 'bg-yellow-500/80 hover:bg-yellow-500/70 text-black' : ''
                        }
                      >
                        {txn.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          ) : (
            <div className="text-center py-12">
              <ShoppingCart className="mx-auto h-16 w-16 text-muted-foreground mb-4" />
              <h2 className="text-xl font-semibold mb-2">No Transactions Yet</h2>
              <p className="text-muted-foreground">You haven&apos;t made any purchases. Start exploring commodities!</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
