import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Lock, Loader2, ShieldAlert, CreditCard } from "lucide-react";
import { useLivestockItem } from "../../hooks/useLivestock";
import { useBids } from "../../hooks/useBids";
import { useInitiatePayment } from "../../hooks/usePayments";
import { useAuthStore } from "../../stores/authStore";
import { Button } from "./ui/button";
import { Separator } from "./ui/separator";
import { toast } from "sonner";

export function CheckoutScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);

  const { data: item, isLoading } = useLivestockItem(id);
  const { data: bids, isLoading: bidsLoading } = useBids(id);
  const initiatePayment = useInitiatePayment();

  const hasWinningBid = user && bids
    ? bids.some((b: any) => {
        const bidUserId = b.userId ?? b.user_id;
        const isWinner = b.isWinner ?? b.is_winner;
        return bidUserId === user.id && isWinner;
      })
    : false;

  if (isLoading || bidsLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!item) return <div className="p-4">Item not found</div>;

  if (!hasWinningBid) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center gap-4">
        <ShieldAlert className="w-12 h-12 text-destructive" />
        <h2 className="text-xl font-semibold">Unauthorized</h2>
        <p className="text-muted-foreground">You can only checkout items you have won at auction.</p>
        <Button onClick={() => navigate('/')} variant="outline">Back to Home</Button>
      </div>
    );
  }

  const currentBid = item.currentBid ?? (item as any).current_bid ?? 0;
  const imageUrl = item.imageUrl ?? (item as any).image_urls?.[0] ?? '';
  const platformFee = Math.round(currentBid * 0.05);
  const total = currentBid + platformFee;

  const handlePay = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    try {
      await initiatePayment.mutateAsync({
        livestockId: id!,
        amount: total,
        livestockTitle: item.title,
      });
    } catch (err: any) {
      toast.error(err.message || 'Payment initiation failed');
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
        <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="font-semibold text-lg">Checkout</h1>
      </div>

      <div className="p-4 space-y-6 pb-32">
        <div>
          <h2 className="font-semibold mb-3">ORDER SUMMARY</h2>
          <div className="bg-card border rounded-lg p-4 flex gap-3">
            <div className="w-20 h-20 bg-muted rounded-lg overflow-hidden flex-shrink-0">
              <img src={imageUrl} alt={item.title} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold truncate">{item.title}</h3>
              <p className="text-sm text-muted-foreground">{item.breed}</p>
              <p className="text-sm text-muted-foreground">{item.location}</p>
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Winning Bid</span>
            <span className="font-semibold">US${currentBid.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform Fee (5%)</span>
            <span className="font-semibold">US${platformFee.toLocaleString()}</span>
          </div>
          <Separator />
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-primary">US${total.toLocaleString()}</span>
          </div>
        </div>

        <Separator className="my-6" />

        <div>
          <h2 className="font-semibold mb-3">PAYMENT METHOD</h2>
          <div className="border rounded-lg p-4 border-primary bg-primary/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded bg-[#F5A623] flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-medium">Flutterwave Checkout</span>
                <p className="text-sm text-muted-foreground">Card, Bank Transfer, Mobile Money, USSD</p>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex gap-2">
            <span className="text-blue-600">i</span>
            <p className="text-sm text-blue-900">You'll be redirected to Flutterwave's secure checkout page to complete payment.</p>
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t shadow-lg max-w-[480px] mx-auto">
        <div className="p-4 space-y-2">
          <Button onClick={handlePay} className="w-full h-12 text-lg font-semibold" disabled={initiatePayment.isPending}>
            {initiatePayment.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Redirecting to Flutterwave...</>
            ) : `Pay US$${total.toLocaleString()}`}
          </Button>
          <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" /><span>Secured by Flutterwave</span>
          </div>
        </div>
      </div>
    </div>
  );
}
