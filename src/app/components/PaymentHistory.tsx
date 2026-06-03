import { useNavigate } from "react-router";
import { CheckCircle, Clock, CreditCard, Loader2, XCircle, Receipt, AlertTriangle } from "lucide-react";
import { usePaymentHistory } from "../../hooks/usePayments";
import { Badge } from "./ui/badge";
import { Button } from "./ui/button";

function PaymentCardSkeleton() {
  return (
    <div className="bg-card border rounded-xl p-5 animate-pulse">
      <div className="flex items-start justify-between mb-2">
        <div className="flex items-center gap-2">
          <div className="w-5 h-5 rounded-full bg-slate-200" />
          <div>
            <div className="h-4 w-32 bg-slate-200 rounded mb-2" />
            <div className="h-3 w-24 bg-slate-200 rounded" />
          </div>
        </div>
        <div className="text-right">
          <div className="h-5 w-20 bg-slate-200 rounded mb-2" />
          <div className="h-5 w-14 bg-slate-200 rounded" />
        </div>
      </div>
      <div className="h-3 w-40 bg-slate-200 rounded mt-2" />
    </div>
  );
}

export function PaymentHistory() {
  const navigate = useNavigate();
  const { data: payments, isLoading, isError, refetch } = usePaymentHistory();

  const formatDate = (date: Date | string) => {
    return new Intl.DateTimeFormat('en-GB', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    }).format(new Date(date));
  };

  const getTitle = (payment: any) => payment.itemTitle ?? payment.livestock_items?.title ?? 'Unknown item';

  return (
    <div className="min-h-screen bg-background">
      <div className="sticky top-0 bg-background z-10 border-b p-4">
        <h1 className="font-bold text-xl">Payment History</h1>
      </div>

      <div className="px-4 pt-4">
        <Button onClick={() => navigate('/pay-bill')} className="w-full h-12 bg-emerald-600 hover:bg-emerald-700 font-semibold mb-4">
          <Receipt className="w-4 h-4 mr-2" />
          Pay a Bill
        </Button>
      </div>

      <div className="p-4 space-y-4">
        {isLoading ? (
          <>
            <PaymentCardSkeleton />
            <PaymentCardSkeleton />
            <PaymentCardSkeleton />
          </>
        ) : isError ? (
          <div className="text-center py-12" role="alert">
            <AlertTriangle className="w-12 h-12 text-amber-500 mx-auto mb-3" />
            <p className="font-semibold text-lg text-slate-700">Couldn't load payments</p>
            <p className="text-sm text-slate-500 mt-1 mb-4">Network or server error — your history is safe.</p>
            <Button variant="outline" onClick={() => refetch()}>Retry</Button>
          </div>
        ) : !payments?.length ? (
          <div className="text-center py-12">
            <CreditCard className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="font-semibold text-lg text-slate-700">No payments yet</p>
            <p className="text-sm text-slate-500 mt-1">Your payment history will appear here</p>
          </div>
        ) : (
          payments.map((payment: any) => (
            <div key={payment.id} className="bg-card border rounded-xl p-5 transition-all duration-200 hover:shadow-md">
              <div className="flex items-start justify-between mb-2">
                <div className="flex items-center gap-2">
                  {payment.status === 'paid' ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : payment.status === 'pending' ? (
                    <Clock className="w-5 h-5 text-yellow-600" />
                  ) : (
                    <XCircle className="w-5 h-5 text-red-600" />
                  )}
                  <div>
                    <p className="font-semibold font-mono text-sm text-slate-600">{payment.reference}</p>
                    <p className="text-sm text-slate-500">
                      {payment.method} • {formatDate(payment.date ?? payment.created_at)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <p
                    className="text-lg text-emerald-700 font-bold"
                    aria-label={`Payment amount US$${payment.amount.toLocaleString()}`}
                  >
                    US${payment.amount.toLocaleString()}
                  </p>
                  <Badge
                    variant={payment.status === 'paid' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'}
                    className={`mt-1${payment.status === 'paid' ? ' bg-emerald-600 hover:bg-emerald-700' : ''}`}
                  >
                    {payment.status === 'paid' ? 'Paid' : payment.status === 'pending' ? 'Pending' : 'Failed'}
                  </Badge>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-2">{getTitle(payment)}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
