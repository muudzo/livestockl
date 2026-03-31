import { useState } from "react";
import { useNavigate } from "react-router";
import { ArrowLeft, Zap, Phone, GraduationCap, Droplet, Building2, Loader2, CheckCircle, AlertCircle } from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import { useBillPayAuth, useBillPayPay, BILLERS } from "../../hooks/useBillPay";
import { toast } from "sonner";

const iconMap: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-8 h-8" />,
  Phone: <Phone className="w-8 h-8" />,
  GraduationCap: <GraduationCap className="w-8 h-8" />,
  Droplet: <Droplet className="w-8 h-8" />,
  Building2: <Building2 className="w-8 h-8" />,
};

type Step = 'select' | 'details' | 'confirm' | 'result';

export function BillPayFlow() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('select');
  const [selectedBiller, setSelectedBiller] = useState<typeof BILLERS[0] | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [authResult, setAuthResult] = useState<any>(null);
  const [payResult, setPayResult] = useState<any>(null);

  const billPayAuth = useBillPayAuth();
  const billPayPay = useBillPayPay();

  const handleSelectBiller = (biller: typeof BILLERS[0]) => {
    setSelectedBiller(biller);
    setStep('details');
  };

  const handleAuth = async () => {
    if (!selectedBiller || !accountNumber.trim()) return;
    try {
      const result = await billPayAuth.mutateAsync({
        billerCode: selectedBiller.code,
        accountNumber: accountNumber.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      });
      setAuthResult(result);
      setStep('confirm');
    } catch (err: any) {
      toast.error(err.message || 'Account verification failed');
    }
  };

  const handlePay = async () => {
    if (!selectedBiller || !accountNumber || !amount) return;
    try {
      const result = await billPayPay.mutateAsync({
        billerCode: selectedBiller.code,
        accountNumber: accountNumber.trim(),
        amount: parseFloat(amount),
      });
      setPayResult(result);
      setStep('result');
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
    }
  };

  return (
    <div className="min-h-screen bg-background pb-20">
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
        <button onClick={() => step === 'select' ? navigate('/payments') : setStep(step === 'confirm' ? 'details' : step === 'details' ? 'select' : 'select')} className="w-10 h-10 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">
          {step === 'select' ? 'Pay a Bill' : step === 'result' ? 'Payment Complete' : selectedBiller?.name || 'Bill Payment'}
        </h1>
      </div>

      <div className="p-4">
        {/* Step indicators */}
        {step !== 'select' && step !== 'result' && (
          <div className="flex gap-2 mb-6">
            {['details', 'confirm'].map((s, i) => (
              <div key={s} className={`h-1 flex-1 rounded-full ${step === s || (step === 'confirm' && i === 0) ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            ))}
          </div>
        )}

        {/* STEP 1: Select Biller */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">Pay bills directly from your ZimLivestock account</p>
            <div className="grid grid-cols-2 gap-3">
              {BILLERS.map(biller => (
                <button
                  key={biller.code}
                  onClick={() => handleSelectBiller(biller)}
                  className="flex flex-col items-center gap-3 p-5 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 active:scale-95"
                >
                  <div className="text-emerald-600">
                    {iconMap[biller.icon] || <Zap className="w-8 h-8" />}
                  </div>
                  <span className="font-medium text-sm text-center">{biller.name}</span>
                </button>
              ))}
            </div>
            {authResult?.simulation && (
              <Badge variant="outline" className="text-amber-600 border-amber-300">Simulation Mode — BillPay credentials not configured</Badge>
            )}
          </div>
        )}

        {/* STEP 2: Enter Details */}
        {step === 'details' && selectedBiller && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-emerald-600">{iconMap[selectedBiller.icon]}</div>
              <div>
                <p className="font-semibold">{selectedBiller.name}</p>
                <p className="text-sm text-muted-foreground">Enter your account details</p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">{selectedBiller.accountLabel}</Label>
              <Input
                id="account"
                placeholder={selectedBiller.accountPlaceholder}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="amount">Amount (US$)</Label>
              <Input
                id="amount"
                type="number"
                placeholder="e.g., 20.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold"
              onClick={handleAuth}
              disabled={!accountNumber.trim() || billPayAuth.isPending}
            >
              {billPayAuth.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Verifying...</>
              ) : 'Verify Account'}
            </Button>
          </div>
        )}

        {/* STEP 3: Confirm Payment */}
        {step === 'confirm' && selectedBiller && authResult && (
          <div className="space-y-5">
            <div className="bg-card border rounded-xl p-5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-emerald-100 rounded-full flex items-center justify-center text-emerald-600">
                  <CheckCircle className="w-6 h-6" />
                </div>
                <div>
                  <p className="font-semibold">Account Verified</p>
                  <p className="text-sm text-muted-foreground">{authResult.memberName}</p>
                </div>
              </div>

              <div className="border-t pt-3 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Biller</span>
                  <span className="font-medium">{selectedBiller.name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedBiller.accountLabel}</span>
                  <span className="font-medium">{accountNumber}</span>
                </div>
                {authResult.accountBalance != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Balance</span>
                    <span className="font-medium">US${Number(authResult.accountBalance).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="font-semibold">Amount to Pay</span>
                  <span className="font-bold text-emerald-700 text-lg">US${Number(amount).toFixed(2)}</span>
                </div>
              </div>

              {authResult.simulation && (
                <Badge variant="outline" className="text-amber-600 border-amber-300">Simulation Mode</Badge>
              )}
            </div>

            <Button
              className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold"
              onClick={handlePay}
              disabled={!amount || billPayPay.isPending}
            >
              {billPayPay.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : `Pay US$${Number(amount).toFixed(2)}`}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => setStep('details')}>
              Change Details
            </Button>
          </div>
        )}

        {/* STEP 4: Result */}
        {step === 'result' && (
          <div className="flex flex-col items-center text-center pt-8 space-y-5">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Payment Successful</h2>
              <p className="text-muted-foreground mt-1">
                US${Number(amount).toFixed(2)} paid to {selectedBiller?.name}
              </p>
            </div>

            <div className="w-full bg-card border rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{payResult?.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account</span>
                <span>{accountNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Holder</span>
                <span>{authResult?.memberName}</span>
              </div>
              {payResult?.vouchers?.[0] && (
                <div className="border-t pt-2">
                  <p className="text-xs text-muted-foreground mb-1">ZESA Token</p>
                  <p className="font-mono font-bold text-lg tracking-wider">{payResult.vouchers[0].VoucherCode || payResult.vouchers[0].Pin}</p>
                </div>
              )}
              {payResult?.simulation && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 mt-2">Simulated</Badge>
              )}
            </div>

            <div className="w-full space-y-3 pt-4">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={() => { setStep('select'); setAccountNumber(''); setAmount(''); setAuthResult(null); setPayResult(null); }}>
                Pay Another Bill
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/payments')}>
                Back to Payments
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default BillPayFlow;
