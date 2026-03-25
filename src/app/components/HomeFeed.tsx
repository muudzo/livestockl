import { useState } from "react";
import { useNavigate } from "react-router";
import { Heart, MapPin, Eye, MessageCircle, Gavel, CheckCircle, Loader2, Search } from "lucide-react";
import { categories } from "../data/mockData";
import { useLivestockList } from "../../hooks/useLivestock";
import { useFavorites, useToggleFavorite } from "../../hooks/useFavorites";
import { useStartConversation } from "../../hooks/useMessages";
import { useAuthStore } from "../../stores/authStore";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";
import { Avatar, AvatarFallback } from "./ui/avatar";
import { toast } from "sonner";

export function HomeFeed() {
  const navigate = useNavigate();
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');

  const { data: livestock, isLoading, error } = useLivestockList(selectedCategory);
  const { data: favoriteIds = [] } = useFavorites();
  const { mutate: toggleFavorite } = useToggleFavorite();
  const startConversation = useStartConversation();
  const user = useAuthStore((s) => s.user);

  const handleMessage = async (item: any) => {
    if (!user) {
      navigate('/auth');
      return;
    }
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

  const getSellerInfo = (item: any) => {
    // Handle both mock data format and Supabase joined format
    if (item.seller) return item.seller;
    if (item.profiles) {
      const p = item.profiles;
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

  const getTimeLeft = (item: any) => {
    if (item.timeLeft) return item.timeLeft;
    if (item.end_time) {
      const diff = new Date(item.end_time).getTime() - Date.now();
      if (diff <= 0) return 'Ended';
      const hours = Math.floor(diff / (1000 * 60 * 60));
      if (hours < 24) return `${hours}h`;
      return `${Math.floor(hours / 24)}d`;
    }
    return '';
  };

  const getCurrentBid = (item: any) => item.currentBid ?? item.current_bid ?? 0;
  const getImageUrl = (item: any) => item.imageUrl ?? item.image_urls?.[0] ?? '';
  const getBidCount = (item: any) => item.bidCount ?? item.bid_count ?? 0;
  const getViewCount = (item: any) => item.viewCount ?? item.view_count ?? 0;
  const getStartingPrice = (item: any) => item.startingPrice ?? item.starting_price ?? 0;

  return (
    <div className="min-h-screen bg-background pb-4">
      <div className="sticky top-0 bg-background z-10 border-b shadow-sm">
        <div className="px-4 pt-5 pb-3">
          <h1 className="text-2xl font-bold">Livestock Marketplace</h1>
          <p className="text-sm text-slate-500 mt-1">Find your next animal</p>
        </div>

        <div className="px-4 pb-3">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search by title, breed, location..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-4 py-2 rounded-xl border-0 bg-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto pb-3">
          <div className="flex gap-2 min-w-max pl-4 pr-4">
            <Badge
              variant={selectedCategory === 'All' ? 'default' : 'outline'}
              className={`cursor-pointer whitespace-nowrap ${selectedCategory === 'All' ? 'bg-emerald-600 text-white border-0 hover:bg-emerald-700' : 'bg-slate-100 text-slate-700 border-0 hover:bg-slate-200'}`}
              onClick={() => setSelectedCategory('All')}
            >
              All
            </Badge>
            {categories.map(cat => (
              <Badge
                key={cat}
                variant={selectedCategory === cat ? 'default' : 'outline'}
                className={`cursor-pointer whitespace-nowrap ${selectedCategory === cat ? 'bg-emerald-600 text-white border-0 hover:bg-emerald-700' : 'bg-slate-100 text-slate-700 border-0 hover:bg-slate-200'}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat}
              </Badge>
            ))}
          </div>
        </div>
      </div>

      <div className="px-4 pt-4 space-y-5">
        {isLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600" />
          </div>
        ) : error ? (
          <div className="text-center py-16 px-4 text-muted-foreground">
            <p>Failed to load listings</p>
          </div>
        ) : (() => {
          const filteredLivestock = (livestock || []).filter((item: any) => {
            if (!searchQuery.trim()) return true;
            const q = searchQuery.toLowerCase();
            return (
              item.title?.toLowerCase().includes(q) ||
              item.breed?.toLowerCase().includes(q) ||
              item.location?.toLowerCase().includes(q) ||
              item.description?.toLowerCase().includes(q) ||
              item.category?.toLowerCase().includes(q)
            );
          });
          return !filteredLivestock.length ? (
          <div className="text-center py-16 px-4 text-muted-foreground">
            <p>No listings found</p>
          </div>
        ) : (
          filteredLivestock.map((item: any) => {
            const seller = getSellerInfo(item);
            return (
              <div key={item.id} className="bg-card rounded-xl shadow-sm overflow-hidden border">
                <div className="relative aspect-[4/3] bg-muted cursor-pointer" onClick={() => navigate(`/item/${item.id}`)}>
                  <img src={getImageUrl(item)} alt={item.title} className="w-full h-full object-cover" loading="lazy" />
                  <div className="absolute bottom-2 left-2">
                    <Badge className="bg-emerald-700/90 text-white border-0">{item.breed}</Badge>
                  </div>
                  <div className="absolute bottom-2 right-2">
                    <Badge variant="destructive" className="font-semibold">{getTimeLeft(item)}</Badge>
                  </div>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(item.id); }}
                    className="absolute top-2 right-2 w-10 h-10 bg-white/90 rounded-full flex items-center justify-center shadow-md hover:bg-white transition-colors"
                  >
                    <Heart className={`w-5 h-5 ${favoriteIds.includes(item.id) ? 'fill-red-500 text-red-500' : 'text-gray-600'}`} />
                  </button>
                </div>

                <div className="p-4 space-y-3">
                  <div>
                    <h3 className="font-semibold text-lg">{item.title}</h3>
                    <p className="text-xl font-bold text-emerald-700">
                      <span className="text-xs font-normal text-slate-400">Current Bid: </span>US${getCurrentBid(item).toLocaleString()}
                    </p>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1">
                      <MapPin className="w-4 h-4" />
                      <span>{item.location}</span>
                    </div>
                    <span>•</span>
                    <span>{item.age}</span>
                    <span>•</span>
                    <span>{item.weight}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <Avatar className="w-8 h-8">
                      <AvatarFallback className="bg-emerald-600 text-white text-xs">
                        {seller.avatar}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex items-center gap-1">
                      <span className="text-sm font-medium">{seller.name}</span>
                      {seller.verified && <CheckCircle className="w-4 h-4 text-emerald-600 fill-emerald-600" />}
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm text-slate-400">
                    <div className="flex items-center gap-1">
                      <Gavel className="w-4 h-4" />
                      <span>{getBidCount(item)} bids</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4" />
                      <span>{getViewCount(item)} views</span>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <Button variant="outline" className="flex-1 border-slate-300" onClick={(e) => { e.stopPropagation(); handleMessage(item); }} disabled={startConversation.isPending}>
                      <MessageCircle className="w-4 h-4 mr-2" />
                      Message
                    </Button>
                    <Button className="flex-1 bg-emerald-600 hover:bg-emerald-700 font-semibold" onClick={(e) => { e.stopPropagation(); navigate(`/item/${item.id}`); }}>
                      Place Bid
                    </Button>
                  </div>
                </div>
              </div>
            );
          })
        );
        })()}
      </div>
    </div>
  );
}
