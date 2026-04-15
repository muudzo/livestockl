import { useEffect, useMemo, useState, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router";
import {
  ArrowLeft, Zap, Phone, GraduationCap, Building2, Heart, Shield, Tv,
  Loader2, CheckCircle, Clock, XCircle, AlertTriangle, Copy,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Badge } from "./ui/badge";
import {
  useBillers, useBillPayAuth, useBillPayPay, useBillPayStatus,
  BILLER_ICONS,
  type BillerInfo, type AuthResult, type PayResult,
} from "../../hooks/useBillPay";
import { toast } from "sonner";

// ─── Icon mapping ───

const iconComponents: Record<string, React.ReactNode> = {
  Zap: <Zap className="w-7 h-7" />,
  Phone: <Phone className="w-7 h-7" />,
  GraduationCap: <GraduationCap className="w-7 h-7" />,
  Building2: <Building2 className="w-7 h-7" />,
  Heart: <Heart className="w-7 h-7" />,
  Shield: <Shield className="w-7 h-7" />,
  Tv: <Tv className="w-7 h-7" />,
};

function getBillerIcon(code: string) {
  const iconName = BILLER_ICONS[code] || 'Zap';
  return iconComponents[iconName] || <Zap className="w-7 h-7" />;
}

type Step = 'select' | 'details' | 'confirm' | 'result';

/**
 * HomeFeed Services row deep-links into this flow via ?service=<code>.
 * Single-biller services (zesa, airtime) pre-select the biller and skip the
 * picker. Category services (fees, water) filter the picker to just the
 * relevant subset instead of showing all 15 curated billers.
 */
const SERVICE_MAP: Record<string, { biller?: string; category?: string[]; label?: string }> = {
  zesa:    { biller: 'ZETDC' },
  airtime: { biller: 'AIRTIME' },
  fees:    { category: ['UZ', 'NUST', 'MSU', 'GZU'], label: 'School Fees' },
  water:   { category: ['COH', 'BCC', 'MAS', 'GWE'], label: 'Council / Water' },
};

export function BillPayFlow() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const serviceParam = (searchParams.get('service') || '').toLowerCase();
  const serviceCfg = SERVICE_MAP[serviceParam];

  // State
  const [step, setStep] = useState<Step>('select');
  const [selectedBiller, setSelectedBiller] = useState<BillerInfo | null>(null);
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  const [accountError, setAccountError] = useState('');
  const [amountError, setAmountError] = useState('');
  const [authResult, setAuthResult] = useState<AuthResult | null>(null);
  const [payResult, setPayResult] = useState<PayResult | null>(null);
  const [paySubmitted, setPaySubmitted] = useState(false);

  // Hooks
  const { data: billers = [], isLoading: billersLoading } = useBillers();
  const billPayAuth = useBillPayAuth();
  const billPayPay = useBillPayPay();
  const statusQuery = useBillPayStatus(
    payResult?.status === 'processing' || payResult?.status === 'flagged' ? payResult?.reference : undefined,
  );

  // Derive the live status from polling (overrides initial payResult)
  const liveStatus = statusQuery.data?.status;
  const resolvedPaid = liveStatus === 'paid';
  const resolvedFailed = liveStatus === 'failed';

  // ─── Handlers ───

  const handleSelectBiller = (biller: BillerInfo) => {
    setSelectedBiller(biller);
    setAccountNumber('');
    setAmount('');
    setAccountError('');
    setAmountError('');
    setStep('details');
  };

  // Filter the biller list for category services (fees/water). For single-
  // biller services (zesa/airtime) we auto-advance past 'select', so this
  // only matters when serviceCfg.category is set.
  const visibleBillers = useMemo(() => {
    if (serviceCfg?.category) {
      return billers.filter(b => serviceCfg.category!.includes(b.biller_code));
    }
    return billers;
  }, [billers, serviceCfg]);

  // Auto-preselect single-biller services once billers load. Runs exactly
  // once per session — guarded by step === 'select' so the user can still
  // navigate back without being re-routed.
  useEffect(() => {
    if (!serviceCfg?.biller) return;
    if (step !== 'select') return;
    if (billers.length === 0) return;
    const match = billers.find(b => b.biller_code === serviceCfg.biller);
    if (match) handleSelectBiller(match);
  }, [billers, serviceCfg, step]);

  const validateAccount = useCallback(() => {
    if (!selectedBiller || !accountNumber.trim()) {
      setAccountError('Required');
      return false;
    }
    const regex = selectedBiller.member_number_field_regex;
    if (regex) {
      try {
        if (!new RegExp(regex).test(accountNumber.trim())) {
          setAccountError(`Invalid format for ${selectedBiller.member_number_field_label || 'account number'}`);
          return false;
        }
      } catch { /* invalid regex from API — skip validation */ }
    }
    setAccountError('');
    return true;
  }, [selectedBiller, accountNumber]);

  const validateAmount = useCallback(() => {
    const product = selectedBiller?.products?.[0];
    if (!product) return true;

    // AuthAmountMandated === true means AUTH returns the price, user can't change it
    if (product.AuthAmountMandated === true) return true;

    const val = parseFloat(amount);
    if (!amount || isNaN(val) || val <= 0) {
      setAmountError('Enter a valid amount');
      return false;
    }
    if (product.MinAmount != null && val < product.MinAmount) {
      setAmountError(`Minimum: US$${product.MinAmount.toFixed(2)}`);
      return false;
    }
    if (product.MaxAmount != null && val > product.MaxAmount) {
      setAmountError(`Maximum: US$${product.MaxAmount.toFixed(2)}`);
      return false;
    }
    setAmountError('');
    return true;
  }, [selectedBiller, amount]);

  const handleAuth = async () => {
    if (!selectedBiller) return;
    if (!validateAccount()) return;

    const product = selectedBiller.products?.[0];
    const needsAmount = product?.AuthAmountMandated !== true;
    if (needsAmount && !validateAmount()) return;

    try {
      const result = await billPayAuth.mutateAsync({
        billerCode: selectedBiller.biller_code,
        accountNumber: accountNumber.trim(),
        amount: amount ? parseFloat(amount) : undefined,
      });
      setAuthResult(result);

      // If AUTH returned a mandated price, set the amount
      if (result.accountBalance != null && product?.AuthAmountMandated === true) {
        setAmount(String(result.accountBalance));
      }

      setStep('confirm');
    } catch (err: any) {
      toast.error(err.message || 'Account verification failed');
    }
  };

  const handlePay = async () => {
    if (!selectedBiller || !authResult?.reference || paySubmitted) return;
    const payAmount = parseFloat(amount);
    if (isNaN(payAmount) || payAmount <= 0) return;

    setPaySubmitted(true);
    try {
      const result = await billPayPay.mutateAsync({
        billerCode: selectedBiller.biller_code,
        accountNumber: accountNumber.trim(),
        amount: payAmount,
        reference: authResult.reference, // SAME reference from AUTH
        totalAmount: payAmount,
      });
      setPayResult(result);
      setStep('result');
    } catch (err: any) {
      toast.error(err.message || 'Payment failed');
      setPaySubmitted(false);
    }
  };

  const resetFlow = () => {
    setStep('select');
    setSelectedBiller(null);
    setAccountNumber('');
    setAmount('');
    setAccountError('');
    setAmountError('');
    setAuthResult(null);
    setPayResult(null);
    setPaySubmitted(false);
  };

  const goBack = () => {
    if (step === 'select') navigate('/payments');
    else if (step === 'details') { setStep('select'); setPaySubmitted(false); }
    else if (step === 'confirm') { setStep('details'); setPaySubmitted(false); }
    else resetFlow();
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success('Copied to clipboard');
  };

  // ─── Derived state ───
  const product = selectedBiller?.products?.[0];
  const amountMandated = product?.AuthAmountMandated === true;
  const showAmountInput = !amountMandated;

  return (
    <div className="min-h-screen bg-background pb-20">
      {/* Header */}
      <div className="sticky top-0 bg-background z-10 border-b p-4 flex items-center gap-3">
        <button onClick={goBack} className="w-10 h-10 flex items-center justify-center" aria-label="Go back">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="font-semibold text-lg">
          {step === 'select' && 'Pay a Bill'}
          {step === 'details' && (selectedBiller?.biller_name || 'Bill Payment')}
          {step === 'confirm' && 'Confirm Payment'}
          {step === 'result' && (
            resolvedPaid || payResult?.status === 'ok' ? 'Payment Complete' :
            resolvedFailed ? 'Payment Failed' :
            payResult?.status === 'flagged' ? 'Under Review' :
            'Processing'
          )}
        </h1>
      </div>

      <div className="p-4">
        {/* Step progress */}
        {(step === 'details' || step === 'confirm') && (
          <div className="flex gap-2 mb-6" role="progressbar" aria-valuenow={step === 'confirm' ? 2 : 1} aria-valuemin={1} aria-valuemax={2} aria-label={`Step ${step === 'confirm' ? '2' : '1'} of 2`}>
            <div className={`h-1 flex-1 rounded-full ${step === 'details' || step === 'confirm' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
            <div className={`h-1 flex-1 rounded-full ${step === 'confirm' ? 'bg-emerald-500' : 'bg-slate-200'}`} />
          </div>
        )}

        {/* ── STEP 1: Select Biller ── */}
        {step === 'select' && (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              {serviceCfg?.label
                ? `Choose a ${serviceCfg.label.toLowerCase()} biller`
                : 'Pay bills directly from your Mimoo account'}
            </p>
            {billersLoading ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
              </div>
            ) : !visibleBillers || visibleBillers.length === 0 ? (
              <div className="text-center py-12" role="alert">
                <p className="font-semibold text-slate-700">No billers available</p>
                <p className="text-sm text-slate-500 mt-1">Unable to load billers right now. Check your connection.</p>
                <button
                  onClick={() => window.location.reload()}
                  className="mt-4 px-6 py-3 bg-emerald-600 text-white rounded-lg font-medium hover:bg-emerald-700 active:scale-95 transition-all min-h-[44px]"
                >
                  Try Again
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {visibleBillers.map((biller) => (
                  <button
                    key={biller.biller_code}
                    onClick={() => handleSelectBiller(biller)}
                    className="flex flex-col items-center gap-3 p-5 border-2 border-slate-200 rounded-xl hover:border-emerald-500 hover:bg-emerald-50 transition-all duration-200 active:scale-95"
                  >
                    <div className="text-emerald-600">
                      {getBillerIcon(biller.biller_code)}
                    </div>
                    <span className="font-medium text-sm text-center">{biller.biller_name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── STEP 2: Enter Details ── */}
        {step === 'details' && selectedBiller && (
          <div className="space-y-5">
            <div className="flex items-center gap-3 p-4 bg-emerald-50 rounded-xl border border-emerald-200">
              <div className="text-emerald-600">{getBillerIcon(selectedBiller.biller_code)}</div>
              <div>
                <p className="font-semibold">{selectedBiller.biller_name}</p>
                <p className="text-sm text-muted-foreground">
                  {selectedBiller.member_number_field_desc || 'Enter your account details'}
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="account">
                {selectedBiller.member_number_field_label || 'Account Number'}
              </Label>
              <Input
                id="account"
                placeholder={selectedBiller.member_number_field_desc || 'Enter account number'}
                value={accountNumber}
                onChange={(e) => { setAccountNumber(e.target.value); setAccountError(''); }}
              />
              {accountError && <p className="text-sm text-red-500">{accountError}</p>}
            </div>

            {showAmountInput && (
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (US$)</Label>
                <Input
                  id="amount"
                  type="number"
                  step="0.01"
                  min={product?.MinAmount || 0.01}
                  max={product?.MaxAmount || undefined}
                  className="h-14 text-xl font-semibold tracking-wide"
                  placeholder={
                    product?.MinAmount != null && product?.MaxAmount != null
                      ? `US$${product.MinAmount} – US$${product.MaxAmount}`
                      : 'e.g., 20.00'
                  }
                  value={amount}
                  onChange={(e) => { setAmount(e.target.value); setAmountError(''); }}
                />
                {amountError && <p className="text-sm text-red-500">{amountError}</p>}
                {product?.MinAmount != null && product?.MaxAmount != null && !amountError && (
                  <p className="text-xs text-muted-foreground">
                    Min: US${product.MinAmount.toFixed(2)} — Max: US${product.MaxAmount.toFixed(2)}
                  </p>
                )}
              </div>
            )}

            {amountMandated && (
              <p className="text-sm text-muted-foreground bg-slate-50 p-3 rounded-lg">
                The payment amount will be determined after account verification.
              </p>
            )}

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

        {/* ── STEP 3: Confirm Payment ── */}
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
                  <span className="font-medium">{selectedBiller.biller_name}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">{selectedBiller.member_number_field_label || 'Account'}</span>
                  <span className="font-medium">{accountNumber}</span>
                </div>
                {authResult.accountBalance != null && (
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Account Balance</span>
                    <span className="font-medium">US${Number(authResult.accountBalance).toFixed(2)}</span>
                  </div>
                )}

                {/* Account details from AUTH */}
                {authResult.accountDetails && Object.entries(authResult.accountDetails).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{val}</span>
                  </div>
                ))}

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
              disabled={!amount || billPayPay.isPending || paySubmitted}
            >
              {billPayPay.isPending ? (
                <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Processing...</>
              ) : `Pay US$${Number(amount).toFixed(2)}`}
            </Button>

            <Button variant="outline" className="w-full" onClick={() => { setStep('details'); setPaySubmitted(false); }}>
              Change Details
            </Button>
          </div>
        )}

        {/* ── STEP 4: Result — Processing/Flagged (with live polling) ── */}
        {step === 'result' && (payResult?.status === 'processing' || payResult?.status === 'flagged') && !resolvedPaid && !resolvedFailed && (
          <div className="flex flex-col items-center text-center pt-8 space-y-5">
            <div className={`w-20 h-20 rounded-full flex items-center justify-center ${
              payResult.status === 'flagged' ? 'bg-orange-100' : 'bg-amber-100'
            }`}>
              {payResult.status === 'flagged'
                ? <AlertTriangle className="w-12 h-12 text-orange-600" />
                : <Clock className="w-12 h-12 text-amber-600" />}
            </div>
            <div>
              <h2 className="text-2xl font-bold">
                {payResult.status === 'flagged' ? 'Under Review' : 'Payment Processing'}
              </h2>
              <p className="text-muted-foreground mt-1">
                Your US${Number(amount).toFixed(2)} payment to {selectedBiller?.biller_name} is {payResult.status === 'flagged' ? 'under review' : 'being processed'}.
              </p>
              <p className="text-sm text-muted-foreground mt-2">
                {payResult.status === 'flagged'
                  ? 'This is taking longer than expected. We are monitoring this payment.'
                  : 'Auto-checking status every 10 seconds...'}
              </p>
              {statusQuery.data?.statusCheckCount != null && (
                <p className="text-xs text-muted-foreground mt-1">
                  Status check #{statusQuery.data.statusCheckCount}
                </p>
              )}
            </div>

            <div className="w-full bg-card border rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{payResult.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Account</span>
                <span>{accountNumber}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={
                  payResult.status === 'flagged' ? 'text-orange-600 border-orange-300' : 'text-amber-600 border-amber-300'
                }>
                  {payResult.status === 'flagged' ? 'Under Review' : 'Processing'}
                </Badge>
              </div>
            </div>

            <div className="w-full space-y-3 pt-4">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={resetFlow}>
                Pay Another Bill
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/payments')}>
                Back to Payments
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Result — Paid (immediate or after polling) ── */}
        {step === 'result' && (payResult?.status === 'ok' || resolvedPaid) && (
          <div className="flex flex-col items-center text-center pt-8 space-y-5">
            <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center">
              <CheckCircle className="w-12 h-12 text-emerald-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Payment Successful</h2>
              <p className="text-muted-foreground mt-1">
                US${Number(amount).toFixed(2)} paid to {selectedBiller?.biller_name}
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

              {/* Display Data from API */}
              {(statusQuery.data?.displayData || payResult?.displayData) &&
                Object.entries(statusQuery.data?.displayData || payResult?.displayData || {}).map(([key, val]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-muted-foreground">{key}</span>
                    <span className="font-medium">{val as string}</span>
                  </div>
                ))
              }

              {/* ALL voucher codes (multi-token ZETDC support) */}
              {(() => {
                const vouchers = statusQuery.data?.vouchers || payResult?.vouchers || [];
                if (vouchers.length === 0) return null;
                return (
                  <div className="border-t pt-3 space-y-3">
                    <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                      {vouchers.length > 1 ? `${vouchers.length} Tokens` : 'Token'}
                    </p>
                    {vouchers.map((v: any, i: number) => (
                      <div key={i} className="bg-emerald-50 border border-emerald-200 rounded-lg p-3">
                        <div className="flex items-center justify-between">
                          <p className="font-mono font-bold text-lg tracking-wider">
                            {v.VoucherCode || v.Pin}
                          </p>
                          <button
                            onClick={() => copyToClipboard(v.VoucherCode || v.Pin)}
                            className="p-3 hover:bg-emerald-100 rounded-lg min-w-[44px] min-h-[44px] flex items-center justify-center"
                            aria-label="Copy token to clipboard"
                          >
                            <Copy className="w-5 h-5 text-emerald-600" />
                          </button>
                        </div>
                        {v.ValidDays && (
                          <p className="text-xs text-muted-foreground mt-1">Valid for {v.ValidDays} days</p>
                        )}
                      </div>
                    ))}
                  </div>
                );
              })()}

              {/* SMS sent confirmation */}
              {((statusQuery.data?.receiptSmses?.length || 0) > 0 || (payResult?.receiptSmses?.length || 0) > 0) && (
                <p className="text-xs text-emerald-600 mt-2">Receipt SMS sent to your phone</p>
              )}

              {(payResult?.simulation || authResult?.simulation) && (
                <Badge variant="outline" className="text-amber-600 border-amber-300 mt-2">Simulated</Badge>
              )}
            </div>

            <div className="w-full space-y-3 pt-4">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={resetFlow}>
                Pay Another Bill
              </Button>
              <Button variant="outline" className="w-full" onClick={() => navigate('/payments')}>
                Back to Payments
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP 4: Result — Failed (immediate or after polling) ── */}
        {step === 'result' && (payResult?.status === 'error' || resolvedFailed) && (
          <div className="flex flex-col items-center text-center pt-8 space-y-5">
            <div className="w-20 h-20 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-12 h-12 text-red-600" />
            </div>
            <div>
              <h2 className="text-2xl font-bold">Payment Failed</h2>
              <p className="text-muted-foreground mt-1">
                {payResult?.message || 'Your payment could not be processed.'}
              </p>
            </div>

            <div className="w-full bg-card border rounded-xl p-4 text-left space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Reference</span>
                <span className="font-mono text-xs">{payResult?.reference || authResult?.reference}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className="text-red-600 border-red-300">Failed</Badge>
              </div>
            </div>

            <div className="w-full space-y-3 pt-4">
              <Button className="w-full bg-emerald-600 hover:bg-emerald-700" onClick={resetFlow}>
                Try Again
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
