
'use client';

import Image from 'next/image';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import CommodityCard from '@/components/CommodityCard';
import ReviewCard from '@/components/ReviewCard';
import RatingStars from '@/components/RatingStars';
import PublicHeader from '@/components/layout/PublicHeader';
import AddReviewForm from '@/components/AddReviewForm';
import { Mail, MapPin, Phone, ShieldCheck, MessageSquare, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { User, Commodity, Review } from '@/lib/types';
import { useEffect, useState, useCallback } from 'react';
import { doc, getDoc } from 'firebase/firestore';

import { fetchCommoditiesBySellerId } from '@/actions/commodityActions';
import { fetchReviewsBySellerId } from '@/actions/reviewActions';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/context/AuthContext';
import { startOrGetConversation } from '@/actions/messageActions';

function ContactSellerButton({ sellerId }: { sellerId: string }) {
    const { currentUser } = useAuth();
    const router = useRouter();
    const { toast } = useToast();
    const [isLoading, setIsLoading] = useState(false);

    const handleContact = async () => {
        if (!currentUser) {
            toast({ variant: 'destructive', title: 'Not Logged In', description: 'You must be logged in to contact a seller.' });
            router.push('/auth/login');
            return;
        }

        setIsLoading(true);
        try {
            const { conversationId } = await startOrGetConversation(currentUser.uid, sellerId);
            router.push(`/dashboard/messages/${conversationId}`);
        } catch (error) {
            console.error("Failed to start conversation:", error);
            toast({ variant: 'destructive', title: 'Error', description: 'Could not start a conversation. Please try again.' });
            setIsLoading(false);
        }
    };
    
    // A user cannot contact themselves
    const isSelf = currentUser?.uid === sellerId;
    if (isSelf) return null;

    // Only buyers can contact sellers
    if (currentUser && currentUser.userType !== 'buyer') {
      return (
          <Button disabled className="w-full md:w-auto">
            <MessageSquare className="mr-2 h-4 w-4" /> Only Buyers Can Contact
          </Button>
      );
    }

    return (
        <Button onClick={handleContact} disabled={isLoading} className="w-full md:w-auto">
            {isLoading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <MessageSquare className="mr-2 h-4 w-4" />}
            {isLoading ? 'Starting...' : 'Contact Seller'}
        </Button>
    );
}


export default function SellerProfilePage({ params }: { params: { sellerId: string } }) {
  const { toast } = useToast();
  const { currentUser } = useAuth();
  const [seller, setSeller] = useState<User | null>(null);
  const [sellerCommodities, setSellerCommodities] = useState<Commodity[]>([]);
  const [sellerReviews, setSellerReviews] = useState<Review[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadSellerReviews = useCallback(async () => {
    try {
      const reviews = await fetchReviewsBySellerId(params.sellerId);
      setSellerReviews(reviews);
    } catch (error) {
       console.error("Failed to re-fetch reviews:", error);
       toast({ variant: "destructive", title: "Error", description: "Could not refresh reviews list." });
    }
  }, [params.sellerId, toast]);

  useEffect(() => {
    async function loadSellerData() {
      setIsLoading(true);
      try {
        const sellerDocRef = doc(db, 'users', params.sellerId);
        const sellerDocSnap = await getDoc(sellerDocRef);

        if (sellerDocSnap.exists()) {
          setSeller({ uid: sellerDocSnap.id, ...sellerDocSnap.data() } as User);
          
          const [commodities, reviews] = await Promise.all([
            fetchCommoditiesBySellerId(params.sellerId),
            fetchReviewsBySellerId(params.sellerId)
          ]);
          setSellerCommodities(commodities);
          setSellerReviews(reviews);

        } else {
          toast({ variant: "destructive", title: "Error", description: "Seller not found." });
          setSeller(null);
        }
      } catch (error) {
        console.error("Failed to load seller data:", error);
        toast({ variant: "destructive", title: "Error", description: "Could not load seller information." });
      } finally {
        setIsLoading(false);
      }
    }
    if (params.sellerId) {
      loadSellerData();
    }
  }, [params.sellerId, toast]);
  

  if (isLoading) {
    return (
      <>
        <PublicHeader />
        <main className="container mx-auto py-8 px-4 md:px-6">
          <Card className="mb-8 shadow-xl overflow-hidden">
            <Skeleton className="h-48 w-full" />
            <CardContent className="p-6 pt-0 relative">
              <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6">
                <Skeleton className="h-32 w-32 md:h-40 md:w-40 rounded-full border-4 border-background shadow-lg" />
                <div className="flex-1 text-center md:text-left pt-4">
                  <Skeleton className="h-9 w-3/4 mb-2" />
                  <Skeleton className="h-4 w-1/4 mb-1" />
                  <Skeleton className="h-4 w-1/2" />
                </div>
                <Skeleton className="h-10 w-32" />
              </div>
            </CardContent>
          </Card>
          <Skeleton className="h-8 w-1/3 mb-6" />
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {[...Array(4)].map((_,i) => <Skeleton key={i} className="h-80 w-full rounded-lg" />)}
          </div>
        </main>
      </>
    );
  }

  if (!seller) {
    return (
      <>
        <PublicHeader />
        <div className="container mx-auto py-12 text-center">
          <h1 className="text-2xl font-bold">Seller Not Found</h1>
          <p className="text-muted-foreground">The seller you are looking for does not exist or could not be loaded.</p>
          <Button asChild className="mt-4">
            <Link href="/">Go to Homepage</Link>
          </Button>
        </div>
      </>
    );
  }

  const averageRating = sellerReviews.length > 0
    ? sellerReviews.reduce((acc, r) => acc + r.rating, 0) / sellerReviews.length
    : 0;
  const sellerInitials = seller.name.split(' ').map(n => n[0]).join('').toUpperCase();
  const canLeaveReview = currentUser && currentUser.userType === 'buyer' && currentUser.uid !== seller.uid;


  return (
    <>
      <PublicHeader />
      <main className="container mx-auto py-8 px-4 md:px-6">
        <Card className="mb-8 shadow-xl overflow-hidden">
          <div className="relative h-48 bg-gradient-to-r from-primary/20 to-accent/20">
             <Image
                src="https://placehold.co/1200x300.png" 
                alt={`${seller.name}'s cover photo`}
                fill
                style={{objectFit: 'cover'}}
                className="opacity-50"
                data-ai-hint="farm pattern"
             />
          </div>
          <CardContent className="p-6 pt-0 relative">
            <div className="flex flex-col md:flex-row items-center md:items-end -mt-16 md:-mt-20 space-y-4 md:space-y-0 md:space-x-6">
              <Avatar className="h-32 w-32 md:h-40 md:w-40 border-4 border-background shadow-lg">
                <AvatarImage src={seller.avatarUrl || `https://avatar.vercel.sh/${seller.email}.png`} alt={seller.name} data-ai-hint={seller.dataAiHint || "person business"}/>
                <AvatarFallback className="text-5xl">{sellerInitials}</AvatarFallback>
              </Avatar>
              <div className="flex-grow text-center md:text-left pt-4">
                <CardTitle className="text-3xl font-bold font-headline">{seller.name}</CardTitle>
                {seller.isVerified && (
                  <span className="inline-flex items-center text-sm text-green-600 font-medium mt-1">
                    <ShieldCheck className="h-4 w-4 mr-1" /> Verified Seller
                  </span>
                )}
                <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-muted-foreground">
                  <MapPin className="h-4 w-4" /> {seller.location || 'Location not specified'}
                </div>
                 <div className="flex items-center justify-center md:justify-start gap-2 mt-1 text-muted-foreground">
                  <RatingStars rating={averageRating} size={5} />
                  <p className="text-sm text-muted-foreground ml-2">
                    {averageRating > 0 ? `${averageRating.toFixed(1)} (${sellerReviews.length} reviews)` : 'No reviews yet'}
                  </p>
                </div>
              </div>
              <div className="flex flex-col items-center md:items-end flex-shrink-0">
                 <ContactSellerButton sellerId={seller.uid} />
              </div>
            </div>

            <div className="mt-6 border-t pt-6 space-y-2 text-sm text-foreground/80">
                <p className="flex items-center"><Mail className="h-4 w-4 mr-2 text-primary/50" /> <span className="italic text-muted-foreground">Email: {seller.email || "Not available"}</span></p>
                {seller.phone && <p className="flex items-center"><Phone className="h-4 w-4 mr-2 text-primary/50" /> <span className="italic text-muted-foreground">Phone: {seller.phone}</span></p>}
                {seller.address && <p className="flex items-center"><MapPin className="h-4 w-4 mr-2 text-primary/50" /> <span className="italic text-muted-foreground">Address: {seller.address}, {seller.city}, {seller.country}</span></p>}
            </div>
          </CardContent>
        </Card>

        <section className="mb-12">
          <h2 className="text-2xl font-bold mb-6 font-headline">Commodities by {seller.name}</h2>
          {sellerCommodities.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
              {sellerCommodities.map((commodity) => (
                <CommodityCard 
                  key={commodity.id} 
                  commodity={commodity}
                />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">This seller has no active listings.</p>
          )}
        </section>

        <section>
          <h2 className="text-2xl font-bold mb-6 font-headline">Seller Reputation & Reviews</h2>

          {canLeaveReview && (
            <AddReviewForm sellerId={params.sellerId} onReviewSubmit={loadSellerReviews} />
          )}

          {sellerReviews.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {sellerReviews.map((review) => (
                <ReviewCard key={review.id} review={review} />
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">This seller has not received any reviews yet.</p>
          )}
        </section>
      </main>
    </>
  );
}
