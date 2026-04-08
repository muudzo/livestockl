import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Heart, Share2, MapPin, Star, MessageCircle, Trophy, Loader2, SearchX } from "lucide-react";
import { useLivestockItem } from "../../hooks/useLivestock";
import { useBids, usePlaceBid } from "../../hooks/useBids";
import { useStartConversation } from "../../hooks/useMessages";
import { useIsFavorite, useToggleFavorite } from "../../hooks/useFavorites";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { Input } from "./ui/input";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { Separator } from "./ui/separator";
import { toast } from "sonner";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "./ui/alert-dialog";

export function ItemDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [bidAmount, setBidAmount] = useState('');
  const [showBidConfirm, setShowBidConfirm] = useState(false);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const user = useAuthStore((s) => s.user);

  const { data: item, isLoading } = useLivestockItem(id);
  const { data: bids } = useBids(id);
  const placeBid = usePlaceBid();
  const startConversation = useStartConversation();
  const isFavorite = useIsFavorite(id || '');
  const toggleFavorite = useToggleFavorite();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center justify-between">
          <div className="w-20 h-5 bg-slate-200 animate-pulse rounded" />
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-200 animate-pulse rounded-full" />
            <div className="w-10 h-10 bg-slate-200 animate-pulse rounded-full" />
          </div>
        </div>
        <div className="aspect-[4/3] bg-slate-200 animate-pulse" />
        <div className="p-4 space-y-4">
          <div className="space-y-2">
            <div className="h-7 bg-slate-200 animate-pulse rounded w-3/4" />
            <div className="h-7 bg-slate-200 animate-pulse rounded w-1/2" />
            <div className="h-4 bg-slate-200 animate-pulse rounded w-1/3" />
          </div>
          <div className="grid grid-cols-3 gap-3">
            <div className="h-16 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-16 bg-slate-200 animate-pulse rounded-lg" />
            <div className="h-16 bg-slate-200 animate-pulse rounded-lg" />
          </div>
          <div className="h-20 bg-slate-200 animate-pulse rounded-lg" />
          <div className="space-y-2">
            <div className="h-5 bg-slate-200 animate-pulse rounded w-1/4" />
            <div className="h-4 bg-slate-200 animate-pulse rounded w-full" />
            <div className="h-4 bg-slate-200 animate-pulse rounded w-5/6" />
          </div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
        <SearchX className="w-12 h-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">Item not found</h2>
        <p className="text-muted-foreground mb-6">This listing may have been removed or the link is incorrect.</p>
        <Button onClick={() => navigate('/')}>Browse listings</Button>
      </div>
    );
  }

  // Normalize data for both mock and Supabase formats
  const currentBid = item.currentBid ?? (item as any).current_bid ?? 0;
  const startingPrice = item.startingPrice ?? (item as any).starting_price ?? 0;
  const imageUrl = item.imageUrl ?? (item as any).image_urls?.[0] ?? '';
  const imageUrls: string[] = (item as any).image_urls ?? (item.imageUrl ? [item.imageUrl] : []);
  const status = item.status ?? 'active';
  const minBid = currentBid + 50;

  const getSellerInfo = () => {
    if (item.seller) return item.seller;
    if ((item as any).profiles) {
      const p = (item as any).profiles;
      return {
        name: `${p.first_name} ${p.last_name?.charAt(0) || ''}.`,
        avatar: `${p.first_name?.charAt(0) || ''}${p.last_name?.charAt(0) || ''}`,
        verified: p.verified,
        rating: p.rating,
        salesCount: p.sales_count,
      };
    }
    return { name: 'Seller', avatar: 'S', verified: false, rating: 0, salesCount: 0 };
  };

  const seller = getSellerInfo();
  const sellerId: string = (item as any).seller_id || (item as any).sellerId || '';
  const isOwnListing = user?.id === sellerId;

  const handleChat = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }
    if (!sellerId) {
      toast.error('Seller information unavailable');
      return;
    }
    try {
      const conv = await startConversation.mutateAsync({ sellerId, livestockId: id });
      navigate(`/messages/${conv.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  const getTimeLeft = () => {
    if (item.timeLeft) return item.timeLeft;
    if ((item as any).end_time) {
      const diff = new Date((item as any).end_time).getTime() - Date.now();
      if (diff <= 0) return 'Ended';
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 24) return `${hours}h`;
      return `${Math.floor(hours / 24)}d`;
    }
    return '';
  };

  // Normalize bids for display
  const displayBids = (bids || item.bids || []).map((b: any) => ({
    id: b.id,
    userName: b.userName ?? `${b.profiles?.first_name || ''} ${b.profiles?.last_name?.charAt(0) || ''}.`,
    amount: b.amount,
    isWinner: b.isWinner ?? b.is_winner,
    userId: b.userId ?? b.user_id,
  }));

  const isWinner = user ? displayBids.some((b: any) => {
    return b.userId === user.id && b.isWinner;
  }) : false;

  const handlePlaceBid = async () => {
    const amount = Number(bidAmount);
    if (amount < minBid) return;

    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await placeBid.mutateAsync({ livestockId: id!, amount });
      toast.success(`Bid placed: US$${amount}`);
      setBidAmount('');
    } catch (err: any) {
      toast.error(err.message || 'Failed to place bid');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center justify-between">
        <button onClick={() => navigate('/')} className="w-10 h-10 flex items-center justify-center gap-2 transition-colors duration-200" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-3">
          <button
            className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full active:scale-90 transition-all duration-200"
            onClick={() => {
              if (!user) { navigate('/auth'); return; }
              toggleFavorite.mutate(id!);
            }}
            aria-label={isFavorite ? "Remove from favorites" : "Add to favorites"}
          >
            <Heart className={`w-5 h-5 ${isFavorite ? 'fill-red-500 text-red-500' : ''}`} />
          </button>
          <button
            className="w-10 h-10 flex items-center justify-center hover:bg-muted rounded-full transition-colors duration-200"
            aria-label="Share listing"
            onClick={async () => {
              const shareData = { title: item?.title || 'Listing', url: window.location.href };
              if (navigator.share) {
                try { await navigator.share(shareData); } catch {}
              } else {
                await navigator.clipboard.writeText(window.location.href);
                toast.success('Link copied to clipboard');
              }
            }}
          >
            <Share2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      <div className="pb-32">
        <div className="relative aspect-[4/3] bg-muted">
          <img src={imageUrls[currentImageIndex] || imageUrl} alt={`${item.title} - ${item.breed} - image ${currentImageIndex + 1}`} className="w-full h-full object-cover" />
          {imageUrls.length > 1 && (
            <>
              <div className="absolute bottom-10 left-1/2 -translate-x-1/2 flex gap-1.5">
                {imageUrls.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentImageIndex(i)}
                    aria-label={`View image ${i + 1}`}
                    className={`h-2.5 rounded-full transition-all duration-200 ${i === currentImageIndex ? 'bg-white w-3' : 'bg-white/50 w-2.5'}`}
                  />
                ))}
              </div>
              <button
                onClick={() => setCurrentImageIndex(i => Math.max(0, i - 1))}
                className="absolute left-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 transition-colors duration-200 text-white rounded-full flex items-center justify-center"
                style={{ display: currentImageIndex === 0 ? 'none' : 'flex' }}
                aria-label="Previous image"
              >
                ‹
              </button>
              <button
                onClick={() => setCurrentImageIndex(i => Math.min(imageUrls.length - 1, i + 1))}
                className="absolute right-2 top-1/2 -translate-y-1/2 w-10 h-10 bg-black/50 hover:bg-black/70 transition-colors duration-200 text-white rounded-full flex items-center justify-center"
                style={{ display: currentImageIndex === imageUrls.length - 1 ? 'none' : 'flex' }}
                aria-label="Next image"
              >
                ›
              </button>
            </>
          )}
          <div className="absolute bottom-3 left-3">
            <Badge className="bg-emerald-700/90 text-white border-0">{item.breed}</Badge>
          </div>
          <div className="absolute bottom-3 right-3">
            <Badge variant="destructive" className="font-semibold">{getTimeLeft()}</Badge>
          </div>
        </div>

        <div className="p-4 space-y-5">
          <div>
            <h1 className="text-2xl font-bold">{item.title}</h1>
            <p className="text-2xl font-bold text-emerald-700 mt-1" aria-label={`Current bid: ${currentBid} US dollars`}><span className="text-sm font-normal text-slate-400">Current Bid </span>US${currentBid.toLocaleString()}</p>
            <p className="text-sm text-slate-400 mt-1">Starting: US${startingPrice.toLocaleString()}</p>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">Age</p>
              <p className="font-semibold text-slate-900 mt-1">{item.age}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">Weight</p>
              <p className="font-semibold text-slate-900 mt-1">{item.weight}</p>
            </div>
            <div className="bg-slate-50 rounded-xl p-4 text-center">
              <p className="text-xs text-slate-400">Location</p>
              <p className="font-semibold text-slate-900 mt-1">{item.location}</p>
            </div>
          </div>

          <div className="bg-card border rounded-lg p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Avatar className="w-12 h-12">
                  <AvatarFallback className="bg-emerald-600 text-white">{seller.avatar}</AvatarFallback>
                </Avatar>
                <div>
                  <div className="flex items-center gap-1">
                    <span className="font-semibold">{seller.name}</span>
                    {seller.verified && <Badge variant="secondary" className="text-xs">Verified</Badge>}
                  </div>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span>{seller.rating}</span>
                    <span>•</span>
                    <span>{seller.salesCount} sales</span>
                  </div>
                </div>
              </div>
              <Button size="sm" variant="outline" onClick={handleChat} disabled={startConversation.isPending} className="active:scale-[0.98] transition-all duration-150">
                <MessageCircle className="w-4 h-4 mr-1" />{startConversation.isPending ? '...' : 'Chat'}
              </Button>
            </div>
          </div>

          <div>
            <h3 className="font-semibold mb-2">Description</h3>
            <p className="text-muted-foreground">{item.description}</p>
          </div>

          <Separator />

          <div>
            <h3 className="font-semibold mb-3">Bid History</h3>
            <div className="space-y-2">
              {displayBids.map((bid: any) => (
                <div
                  key={bid.id}
                  className={`flex items-center justify-between p-4 rounded-lg transition-all duration-200 ${bid.isWinner ? 'bg-emerald-50 border border-emerald-500 hover:bg-emerald-100' : 'bg-muted hover:bg-slate-100'}`}
                >
                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-slate-400 text-white text-xs">{bid.userName.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <span className="font-medium">{bid.userName}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">US${bid.amount.toLocaleString()}</span>
                    {bid.isWinner && <Trophy className="w-4 h-4 text-emerald-600" />}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t shadow-lg max-w-[480px] mx-auto">
        {status === 'active' && getTimeLeft() !== 'Ended' && !isOwnListing ? (
          <div className="p-4 space-y-2">
            <p className="text-sm text-muted-foreground">Minimum bid: US${minBid.toLocaleString()}</p>
            <div className="flex gap-2">
              <div className="flex-1 relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm font-medium">US$</span>
                <Input
                  type="number"
                  placeholder={minBid.toString()}
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="pl-12 h-12 text-lg"
                  aria-label="Enter bid amount in US dollars"
                />
              </div>
              <AlertDialog open={showBidConfirm} onOpenChange={setShowBidConfirm}>
                <AlertDialogTrigger asChild>
                  <Button
                    onClick={() => {
                      if (!user) { navigate('/auth'); return; }
                      setShowBidConfirm(true);
                    }}
                    disabled={!bidAmount || Number(bidAmount) < minBid || placeBid.isPending}
                    className="px-8 h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold active:scale-[0.98] transition-all duration-150"
                  >
                    {placeBid.isPending ? 'Bidding...' : 'Bid Now'}
                  </Button>
                </AlertDialogTrigger>
                <AlertDialogContent>
                  <AlertDialogHeader>
                    <AlertDialogTitle>Confirm Bid</AlertDialogTitle>
                    <AlertDialogDescription>
                      Place bid of US${Number(bidAmount).toLocaleString()} on {item.title}? This action cannot be undone.
                    </AlertDialogDescription>
                  </AlertDialogHeader>
                  <AlertDialogFooter>
                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                    <AlertDialogAction onClick={() => { setShowBidConfirm(false); handlePlaceBid(); }}>
                      Confirm
                    </AlertDialogAction>
                  </AlertDialogFooter>
                </AlertDialogContent>
              </AlertDialog>
            </div>
          </div>
        ) : isWinner ? (
          <div className="p-4">
            <Button onClick={() => navigate(`/checkout/${item.id}`)} className="w-full bg-green-600 hover:bg-green-700 active:scale-[0.98] transition-all duration-150">
              Pay US${currentBid.toLocaleString()} — Stripe
            </Button>
          </div>
        ) : null}
      </div>
    </div>
  );
}
