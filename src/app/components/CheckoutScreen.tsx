import { useState } from "react";
import { useParams, useNavigate } from "react-router";
import { ArrowLeft, Lock, Loader2, ShieldAlert, PackageX, Truck } from "lucide-react";
import { useLivestockItem } from "../../hooks/useLivestock";
import { useBids } from "../../hooks/useBids";
import { useInitiatePayment } from "../../hooks/usePayments";
import { useAuthStore } from "../../stores/authStore";
import { supabase, isSupabaseConfigured } from "../../lib/supabase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Separator } from "./ui/separator";
import { toast } from "sonner";

type PaymentMethod = 'ecocash' | 'onemoney' | 'card';

function CheckoutSkeleton() {
  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-muted animate-pulse" />
        <div className="h-6 w-28 bg-muted rounded animate-pulse" />
      </div>
      <div className="p-4 space-y-6 pb-32">
        {/* Order summary skeleton */}
        <div>
          <div className="h-4 w-32 bg-muted rounded animate-pulse mb-3" />
          <div className="bg-card border rounded-xl p-4 flex gap-3">
            <div className="w-20 h-20 bg-muted rounded-lg animate-pulse flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-5 w-3/4 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
              <div className="h-4 w-1/3 bg-muted rounded animate-pulse" />
            </div>
          </div>
        </div>
        {/* Price breakdown skeleton */}
        <div className="space-y-3">
          <div className="flex justify-between">
            <div className="h-4 w-24 bg-muted rounded animate-pulse" />
            <div className="h-4 w-20 bg-muted rounded animate-pulse" />
          </div>
          <div className="flex justify-between">
            <div className="h-4 w-32 bg-muted rounded animate-pulse" />
            <div className="h-4 w-16 bg-muted rounded animate-pulse" />
          </div>
          <Separator />
          <div className="flex justify-between">
            <div className="h-5 w-16 bg-muted rounded animate-pulse" />
            <div className="h-5 w-24 bg-muted rounded animate-pulse" />
          </div>
        </div>
        <Separator className="my-6" />
        {/* Payment methods skeleton */}
        <div>
          <div className="h-4 w-36 bg-muted rounded animate-pulse mb-3" />
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="border rounded-xl p-4 flex items-center gap-3">
                <div className="w-5 h-5 rounded-full bg-muted animate-pulse" />
                <div className="w-8 h-8 bg-muted rounded animate-pulse" />
                <div className="flex-1 space-y-1">
                  <div className="h-4 w-24 bg-muted rounded animate-pulse" />
                  <div className="h-3 w-36 bg-muted rounded animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CheckoutScreen() {
  const { id } = useParams();
  const navigate = useNavigate();
  const user = useAuthStore((s) => s.user);
  const isZimPhone = /^(\+?263|0)[17]\d{8}$/.test((user?.phone || '').replace(/[\s\-().]/g, ''));
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>(isZimPhone ? 'ecocash' : 'card');
  const [phoneNumber, setPhoneNumber] = useState(user?.phone || '');

  type TransportQuote = { requestId: string; quoteUsd: number; distanceKm: number; dropoffLabel: string };
  const [wantsDelivery, setWantsDelivery] = useState(false);
  const [dropoffAddress, setDropoffAddress] = useState('');
  const [transportQuote, setTransportQuote] = useState<TransportQuote | null>(null);
  const [quotePending, setQuotePending] = useState(false);
  const [quoteError, setQuoteError] = useState('');

  const { data: item, isLoading } = useLivestockItem(id);
  const { data: bids, isLoading: bidsLoading } = useBids(id);
  const initiatePayment = useInitiatePayment();

  // Check if the current user has a winning bid on this item
  const hasWinningBid = !!(user && bids?.length && bids.some((b: any) => {
    const bidUserId = b.userId ?? b.user_id;
    const isWinner = b.isWinner ?? b.is_winner;
    return bidUserId === user.id && isWinner;
  }));

  if (isLoading || bidsLoading) {
    return <CheckoutSkeleton />;
  }

  if (!item) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center gap-4">
        <PackageX className="w-16 h-16 text-muted-foreground" />
        <h2 className="text-xl font-semibold">Item not found</h2>
        <p className="text-muted-foreground">This listing may have been removed or doesn't exist.</p>
        <Button onClick={() => navigate('/')} variant="outline">Browse Listings</Button>
      </div>
    );
  }

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

  const currentBid = (item as any).currentBid ?? (item as any).current_bid ?? 0;
  const imageUrl = (item as any).imageUrl ?? (item as any).image_urls?.[0] ?? '';
  // Cent-accurate math (matches supabase/functions/_shared/money.ts platformTotal).
  // Math.round on dollars zeroed out the fee for any bid under $10 and over-charged
  // for some midrange bids; toFixed(2) keeps both client and server in agreement.
  const platformFee = Number((currentBid * 0.05).toFixed(2));
  const transportFee = wantsDelivery && transportQuote ? transportQuote.quoteUsd : 0;
  const total = Number((currentBid + platformFee + transportFee).toFixed(2));

  const handleGetQuote = async () => {
    if (!dropoffAddress.trim() || dropoffAddress.trim().length < 3) {
      setQuoteError('Enter a delivery address (e.g. 12 Main St, Gweru)');
      return;
    }
    setQuoteError('');
    setQuotePending(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-transport-quote', {
        body: { item_id: id, dropoff_address: dropoffAddress.trim() },
      });
      if (error || data?.error) throw new Error(data?.error || error?.message || 'Quote failed');
      setTransportQuote({
        requestId: data.transport_request_id,
        quoteUsd: data.quote_usd,
        distanceKm: data.distance_km,
        dropoffLabel: data.dropoff_label,
      });
    } catch (err: any) {
      setQuoteError(err.message || 'Could not get a quote. Try a more specific address.');
    } finally {
      setQuotePending(false);
    }
  };
  const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const methodMap: Record<PaymentMethod, 'EcoCash' | 'OneMoney' | 'Card'> = {
    ecocash: 'EcoCash',
    onemoney: 'OneMoney',
    card: 'Card',
  };

  const handlePay = async () => {
    if (!user) {
      navigate('/auth');
      return;
    }

    let normalizedPhone = phoneNumber;
    if (paymentMethod === 'ecocash' || paymentMethod === 'onemoney') {
      // Strip spaces, dashes, parens, and leading +263 / 263 country code
      normalizedPhone = (phoneNumber || '')
        .replace(/[\s\-().]/g, '')
        .replace(/^\+?263/, '0');
      const phoneRegex = /^07[0-9]{8}$/;
      if (!normalizedPhone || !phoneRegex.test(normalizedPhone)) {
        toast.error('Enter a 10-digit Zimbabwe mobile number starting with 07 (e.g. 0771234567)');
        return;
      }
    }

    try {
      const result = await initiatePayment.mutateAsync({
        livestockId: id!,
        amount: total,
        livestockTitle: item?.title,
        method: methodMap[paymentMethod],
        phone: normalizedPhone || undefined,
        ...(wantsDelivery && transportQuote
          ? { transportRequestId: transportQuote.requestId, transportFee: transportQuote.quoteUsd }
          : {}),
      });

      navigate(`/payment-status/${result.reference}?method=${paymentMethod}&amount=${total}`);
    } catch (err: any) {
      // A "Failed to fetch" / TypeError during the browser-relay POST to Paynow
      // can fire AFTER Paynow has already accepted the payment — response just
      // didn't come back to the client (flaky mobile network, tab backgrounded,
      // Paynow + Cloudflare ~20-30s latency). In that case the payments row
      // was still created server-side and Paynow will (eventually) call the
      // webhook. If we can find the just-created pending payment, navigate to
      // the status page — usePaynowPoll will resolve the real state within 20s
      // instead of us flashing a scary "Failed to fetch" toast on a success.
      const looksLikeNetwork =
        err?.name === 'TypeError' ||
        /failed to fetch|network|load failed/i.test(err?.message || '');

      if (looksLikeNetwork && isSupabaseConfigured && user) {
        const { data: pending } = await supabase
          .from('payments')
          .select('reference')
          .eq('user_id', user.id)
          .eq('livestock_id', id!)
          .eq('status', 'pending')
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (pending?.reference) {
          toast.info('Network hiccup — checking with Paynow…');
          navigate(`/payment-status/${pending.reference}?method=${paymentMethod}&amount=${total}`);
          return;
        }
      }

      toast.error(err.message || 'Payment initiation failed');
    }
  };

  const getInstructions = () => {
    switch (paymentMethod) {
      case 'ecocash': return "You'll receive a USSD prompt on your phone. Dial *151# if you miss it.";
      case 'onemoney': return "You'll receive a USSD prompt on your phone. Follow the instructions to complete payment.";
      case 'card': return "You'll be redirected to Paynow's secure payment page.";
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
        <button
          onClick={() => navigate(-1)}
          aria-label="Go back"
          className="w-10 h-10 flex items-center justify-center rounded-full hover:bg-muted transition-all duration-200"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-bold text-xl">Checkout</h1>
      </div>

      <div className="p-4 space-y-6 pb-32">
        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Order Summary</h2>
          <div className="bg-card border rounded-xl p-4 flex gap-3">
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
            <span className="font-semibold">US${fmt(currentBid)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-muted-foreground">Platform Fee (5%)</span>
            <span className="font-semibold">US${fmt(platformFee)}</span>
          </div>
          {wantsDelivery && transportQuote && (
            <div className="flex justify-between text-emerald-700">
              <span>Delivery ({transportQuote.distanceKm} km)</span>
              <span className="font-semibold">US${fmt(transportQuote.quoteUsd)}</span>
            </div>
          )}
          <Separator />
          <div className="flex justify-between text-lg">
            <span className="font-semibold">Total</span>
            <span className="font-bold text-emerald-700">US${fmt(total)}</span>
          </div>
        </div>

        {(item as any).transport_available && (
          <div className="border rounded-xl p-4 space-y-3">
            <button
              type="button"
              onClick={() => {
                setWantsDelivery(!wantsDelivery);
                if (wantsDelivery) { setTransportQuote(null); setQuoteError(''); }
              }}
              className={`w-full flex items-start gap-3 text-left transition-all duration-150 ${wantsDelivery ? 'opacity-100' : ''}`}
            >
              <Truck className={`w-4 h-4 mt-0.5 shrink-0 ${wantsDelivery ? 'text-emerald-600' : 'text-slate-400'}`} />
              <div className="flex-1">
                <p className="text-sm font-semibold">Add delivery to my location</p>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Transport arranged from {(item as any).location}. Quote calculated by distance.
                </p>
              </div>
              <div className={`w-5 h-5 rounded border-2 shrink-0 flex items-center justify-center ${wantsDelivery ? 'bg-emerald-600 border-emerald-600' : 'border-slate-300'}`}>
                {wantsDelivery && <span className="text-white text-xs">✓</span>}
              </div>
            </button>

            {wantsDelivery && (
              <div className="space-y-2 pt-1">
                <div className="flex gap-2">
                  <Input
                    placeholder="e.g. 12 Manica Rd, Mutare"
                    value={dropoffAddress}
                    onChange={(e) => { setDropoffAddress(e.target.value); setTransportQuote(null); setQuoteError(''); }}
                    className="h-10 text-sm flex-1"
                  />
                  <button
                    type="button"
                    onClick={handleGetQuote}
                    disabled={quotePending}
                    className="px-3 py-2 text-sm font-medium bg-emerald-600 text-white rounded-lg disabled:opacity-60 flex items-center gap-1 whitespace-nowrap"
                  >
                    {quotePending ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    {quotePending ? 'Checking…' : 'Get Quote'}
                  </button>
                </div>
                {quoteError && <p className="text-xs text-red-500">{quoteError}</p>}
                {transportQuote && (
                  <p className="text-xs text-emerald-700 font-medium">
                    Delivery to {transportQuote.dropoffLabel.split(',')[0]} — US${fmt(transportQuote.quoteUsd)} ({transportQuote.distanceKm} km)
                  </p>
                )}
              </div>
            )}
          </div>
        )}

        <Separator className="my-6" />

        <div>
          <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">Payment Method</h2>
          <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
            <div className="space-y-3">
              {isZimPhone && (
                <>
                  <label htmlFor="ecocash" className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${paymentMethod === 'ecocash' ? 'border-emerald-500 bg-emerald-50' : 'hover:border-muted-foreground'}`}>
                    <RadioGroupItem value="ecocash" id="ecocash" />
                    <div className="flex items-center gap-2 flex-1">
                      <img src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/ecocash-badge.svg" alt="EcoCash" className="h-8 w-8 object-contain" />
                      <div>
                        <span className="font-medium">EcoCash</span>
                        <p className="text-xs text-muted-foreground">Pay via USSD on your phone</p>
                      </div>
                    </div>
                  </label>
                  <label htmlFor="onemoney" className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${paymentMethod === 'onemoney' ? 'border-emerald-500 bg-emerald-50' : 'hover:border-muted-foreground'}`}>
                    <RadioGroupItem value="onemoney" id="onemoney" />
                    <div className="flex items-center gap-2 flex-1">
                      <img src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/onemoney-badge.svg" alt="OneMoney" className="h-8 w-8 object-contain" />
                      <div>
                        <span className="font-medium">OneMoney</span>
                        <p className="text-xs text-muted-foreground">Pay via USSD on your phone</p>
                      </div>
                    </div>
                  </label>
                </>
              )}
              <label htmlFor="card" className={`flex items-center gap-3 border rounded-xl p-4 cursor-pointer transition-all duration-200 ${paymentMethod === 'card' ? 'border-emerald-500 bg-emerald-50' : 'hover:border-muted-foreground'}`}>
                <RadioGroupItem value="card" id="card" />
                <div className="flex items-center gap-2 flex-1">
                  <div className="flex gap-1">
                    <img src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/visa-badge.svg" alt="Visa" className="h-6" />
                    <img src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/mastercard-badge.svg" alt="Mastercard" className="h-6" />
                  </div>
                  <div>
                    <span className="font-medium">Pay Online (Card)</span>
                    <p className="text-xs text-muted-foreground">Visa, Mastercard via Paynow</p>
                  </div>
                </div>
              </label>
            </div>
          </RadioGroup>
        </div>

        {(paymentMethod === 'ecocash' || paymentMethod === 'onemoney') && (
          <div className="space-y-2">
            <Label htmlFor="phone">Phone Number</Label>
            <div className="relative">
              <Input
                id="phone"
                type="tel"
                placeholder="0771 234 567"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                className="h-11 transition-all duration-200"
                aria-label="Phone number"
                required
              />
            </div>
          </div>
        )}

        <div className="bg-emerald-50 border border-emerald-200 rounded-lg p-4">
          <div className="flex gap-2">
            <Lock className="w-3.5 h-3.5 text-emerald-600 inline flex-shrink-0 mt-0.5" />
            <p className="text-sm text-emerald-900">{getInstructions()}</p>
          </div>
        </div>

        {/* Paynow Official Trust Badge */}
        <div className="flex flex-col items-center gap-3 pt-2">
          <img
            src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/paynow-badge.png"
            alt="Pay securely with Paynow — EcoCash, OneMoney, Visa, Mastercard, ZimSwitch"
            className="h-14 object-contain"
          />
          <div className="flex items-center gap-2">
            {paymentMethod === 'ecocash' && (
              <img
                src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/ecocash-badge.svg"
                alt="EcoCash"
                className="h-8"
              />
            )}
            {paymentMethod === 'onemoney' && (
              <img
                src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/onemoney-badge.svg"
                alt="OneMoney"
                className="h-8"
              />
            )}
            {paymentMethod === 'card' && (
              <>
                <img
                  src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/visa-badge.svg"
                  alt="Visa"
                  className="h-6"
                />
                <img
                  src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/mastercard-badge.svg"
                  alt="Mastercard"
                  className="h-6"
                />
              </>
            )}
          </div>
        </div>
      </div>

      <div className="fixed bottom-16 left-0 right-0 bg-card border-t shadow-lg max-w-[480px] mx-auto">
        <div className="p-4 space-y-2">
          <Button
            onClick={handlePay}
            className="w-full h-12 text-lg font-semibold bg-emerald-600 hover:bg-emerald-700 active:scale-[0.98] transition-all duration-200"
            disabled={initiatePayment.isPending}
          >
            {initiatePayment.isPending ? (
              <><Loader2 className="w-4 h-4 mr-2 animate-spin text-white" />Processing...</>
            ) : `Pay US$${fmt(total)}${wantsDelivery && transportQuote ? ' (incl. delivery)' : ''}`}
          </Button>
          <div className="flex items-center justify-center gap-2 text-xs text-muted-foreground">
            <Lock className="w-3 h-3" />
            <span>Secured by</span>
            <img
              src="https://raw.githubusercontent.com/paynow/Paynow-for-WooCommerce/master/assets/images/icon.png"
              alt="Paynow"
              className="h-4 inline-block"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
