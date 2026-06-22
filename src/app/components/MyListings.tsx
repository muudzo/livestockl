import { useNavigate } from "react-router";
import { MessageCircle, Edit, Trash2, Package, Trophy, Bot, CheckCircle2, AlertTriangle } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Button } from "./ui/button";
import { Badge } from "./ui/badge";
import { useMyListings, useWonItems, useDeleteListing } from "../../hooks/useLivestock";
import { getThumbnailUrl } from "../../lib/imageUtils";
import { ImageWithFallback } from "./figma/ImageWithFallback";
import { useStartConversation } from "../../hooks/useMessages";
import { useState } from "react";
import { toast } from "sonner";

function SkeletonCard() {
  return (
    <div className="bg-card border rounded-xl p-5 animate-pulse">
      <div className="flex gap-3">
        <div className="w-24 h-24 bg-muted rounded-xl flex-shrink-0" />
        <div className="flex-1 min-w-0 space-y-3">
          <div className="h-4 bg-muted rounded w-3/4" />
          <div className="h-5 bg-muted rounded w-1/3" />
          <div className="h-4 bg-muted rounded w-1/2" />
        </div>
      </div>
      <div className="flex gap-2 mt-4">
        <div className="h-10 bg-muted rounded flex-1" />
        <div className="h-10 bg-muted rounded flex-1" />
      </div>
    </div>
  );
}

export function MyListings() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('selling');

  const { data: sellingItems, isLoading: loadingSelling, isError: errorSelling, refetch: refetchSelling } = useMyListings();
  const { data: wonItems, isLoading: loadingWon, isError: errorWon, refetch: refetchWon } = useWonItems();
  const deleteListing = useDeleteListing();
  const startConversation = useStartConversation();

  const handleChat = async (item: any) => {
    const sellerId = item.seller_id || item.sellerId;
    if (!sellerId) {
      toast.error('Seller information unavailable');
      return;
    }
    try {
      const conv = await startConversation.mutateAsync({ sellerId, livestockId: item.id });
      navigate(`/messages/${conv.id}`);
    } catch (err: any) {
      toast.error(err.message || 'Failed to start conversation');
    }
  };

  const getImageUrl = (item: any) => item.imageUrl ?? item.image_urls?.[0] ?? '';
  const getCurrentBid = (item: any) => item.currentBid ?? item.current_bid ?? 0;
  const getBidCount = (item: any) => item.bidCount ?? item.bid_count ?? 0;
  const getViewCount = (item: any) => item.viewCount ?? item.view_count ?? 0;

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b p-4">
        <h1 className="font-bold text-xl">My Marketplace</h1>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="p-4">
        <TabsList className="grid w-full grid-cols-2 mb-4">
          <TabsTrigger value="selling">Selling</TabsTrigger>
          <TabsTrigger value="won">Won</TabsTrigger>
        </TabsList>

        <TabsContent value="selling" className="space-y-5" forceMount>
          {loadingSelling ? (
            <div className="space-y-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : errorSelling ? (
            <div className="text-center py-16" role="alert">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4 font-medium">Couldn't load your listings</p>
              <Button variant="outline" onClick={() => refetchSelling()}>Retry</Button>
            </div>
          ) : !sellingItems?.length ? (
            <div className="text-center py-16">
              <Package className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-muted-foreground mb-1 font-medium">No listings yet</p>
              <p className="text-sm text-slate-500 mb-5">Start selling by posting your first livestock listing</p>
              <Button onClick={() => navigate('/post')}>Post Your First Listing</Button>
            </div>
          ) : (
            sellingItems.map((item: any) => (
              <div key={item.id} className="bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-md">
                <div className="flex gap-3">
                  <div className="w-24 h-24 bg-muted rounded-xl overflow-hidden flex-shrink-0">
                    <ImageWithFallback src={getThumbnailUrl(getImageUrl(item))} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold truncate">{item.title}</h3>
                    <p className="text-lg font-bold text-emerald-700">US${getCurrentBid(item).toLocaleString()}</p>
                    <Badge className={item.status === 'active' ? 'bg-emerald-600 hover:bg-emerald-600 text-white' : 'bg-slate-400 hover:bg-slate-400 text-white'}>
                      {item.status === 'active' ? 'Active' : 'Ended'}
                    </Badge>
                    <p className="text-sm text-slate-500 mt-1">{getBidCount(item)} bids • {getViewCount(item)} views</p>
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  <Button
                    variant="outline"
                    className="flex-1 h-10 border-slate-300 active:scale-[0.98] transition-all duration-150"
                    onClick={() => navigate(`/post?edit=${item.id}`)}
                    aria-label={`Edit listing: ${item.title}`}
                  >
                    <Edit className="w-4 h-4 mr-1" />Edit
                  </Button>
                  <Button
                    variant="outline"
                    className="flex-1 h-10 border-slate-300 active:scale-[0.98] transition-all duration-150"
                    disabled={getBidCount(item) > 0 || deleteListing.isPending}
                    onClick={async () => {
                      if (!window.confirm(`Delete "${item.title}"? This cannot be undone.`)) return;
                      try {
                        await deleteListing.mutateAsync({ id: item.id });
                        toast.success('Listing deleted');
                      } catch (err: any) {
                        toast.error(err.message || 'Failed to delete listing');
                      }
                    }}
                    aria-label={`Delete listing: ${item.title}`}
                  >
                    <Trash2 className="w-4 h-4 mr-1" />Delete
                  </Button>
                </div>
              </div>
            ))
          )}
        </TabsContent>

        <TabsContent value="won" className="space-y-5" forceMount>
          {loadingWon ? (
            <div className="space-y-5">
              <SkeletonCard />
              <SkeletonCard />
              <SkeletonCard />
            </div>
          ) : errorWon ? (
            <div className="text-center py-16" role="alert">
              <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
              <p className="text-muted-foreground mb-4 font-medium">Couldn't load won items</p>
              <Button variant="outline" onClick={() => refetchWon()}>Retry</Button>
            </div>
          ) : !wonItems?.length ? (
            <div className="text-center py-16">
              <Trophy className="w-12 h-12 text-slate-300 mx-auto mb-3" />
              <p className="text-muted-foreground mb-1 font-medium">No wins yet</p>
              <p className="text-sm text-slate-500 mb-5">Browse active auctions and place bids to win livestock</p>
              <Button onClick={() => navigate('/')}>Browse Listings</Button>
            </div>
          ) : (
            wonItems.map((item: any) => {
              const agent = item.__agent as { id: string; name: string; type: string; strategy?: string } | null;
              const order = item.__paymentOrder as { paynow_reference?: string; status?: string; method?: string } | null;
              const isPaid = order?.status === 'paid';
              return (
              <div key={item.id} className="bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-md">
                <div className="flex gap-3">
                  <div className="w-24 h-24 bg-muted rounded-xl overflow-hidden flex-shrink-0">
                    <ImageWithFallback src={getThumbnailUrl(getImageUrl(item))} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold truncate">{item.title}</h3>
                      {agent && (
                        <Badge variant="outline" className="text-[10px] font-medium border-indigo-300 text-indigo-700 bg-indigo-50 flex items-center gap-1 px-2 py-0.5">
                          <Bot className="w-3 h-3" />
                          {agent.name}
                        </Badge>
                      )}
                      {isPaid && (
                        <Badge variant="outline" className="text-[10px] font-medium border-emerald-300 text-emerald-700 bg-emerald-50 flex items-center gap-1 px-2 py-0.5">
                          <CheckCircle2 className="w-3 h-3" />
                          Paid
                        </Badge>
                      )}
                    </div>
                    <p className="text-lg font-bold text-emerald-700">Won at US${getCurrentBid(item).toLocaleString()}</p>
                    <p className="text-sm text-slate-500">{item.location} • {item.breed}</p>
                    {order?.paynow_reference && (
                      <p className="text-[11px] text-slate-500 font-mono truncate mt-1" title={order.paynow_reference}>
                        Ref: {order.paynow_reference}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex gap-2 mt-4">
                  {isPaid ? (
                    <Button
                      variant="outline"
                      className="flex-1 h-11 border-emerald-300 text-emerald-700"
                      onClick={() => navigate(`/item/${item.id}`)}
                      aria-label={`View receipt for: ${item.title}`}
                    >
                      View Receipt
                    </Button>
                  ) : (
                    <Button
                      className="flex-1 h-11 bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-150"
                      onClick={() => navigate(`/checkout/${item.id}`)}
                      aria-label={`Pay now for: ${item.title}`}
                    >
                      Pay Now
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    className="flex-1 h-11 border-slate-300 active:scale-[0.98] transition-all duration-150"
                    onClick={() => handleChat(item)}
                    disabled={startConversation.isPending}
                  >
                    <MessageCircle className="w-4 h-4 mr-1" />Chat
                  </Button>
                </div>
              </div>
              );
            })
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
