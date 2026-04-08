import { createBrowserRouter, Link } from "react-router";
import { lazy, Suspense } from "react";
import { Root } from "./components/Root";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { Loader2 } from "lucide-react";

// Auto-reload on stale chunk errors (happens after deploys when SW cache is outdated)
function lazyWithRetry(factory: () => Promise<any>) {
  return lazy(() =>
    factory().catch((err) => {
      if (
        err.message?.includes('Failed to fetch dynamically imported module') ||
        err.message?.includes('Importing a module script failed')
      ) {
        // Clear SW cache and reload once
        const reloaded = sessionStorage.getItem('chunk_reload');
        if (!reloaded) {
          sessionStorage.setItem('chunk_reload', '1');
          window.location.reload();
          return new Promise(() => {}); // never resolves — page is reloading
        }
        sessionStorage.removeItem('chunk_reload');
      }
      throw err;
    })
  );
}

const HomeFeed = lazyWithRetry(() => import('./components/HomeFeed').then(m => ({ default: m.HomeFeed })));
const AuthScreen = lazyWithRetry(() => import('./components/AuthScreen').then(m => ({ default: m.AuthScreen })));
const ItemDetail = lazyWithRetry(() => import('./components/ItemDetail').then(m => ({ default: m.ItemDetail })));
const CheckoutScreen = lazyWithRetry(() => import('./components/CheckoutScreen').then(m => ({ default: m.CheckoutScreen })));
const PaymentStatus = lazyWithRetry(() => import('./components/PaymentStatus').then(m => ({ default: m.PaymentStatus })));
const PostListing = lazyWithRetry(() => import('./components/PostListing').then(m => ({ default: m.PostListing })));
const MyListings = lazyWithRetry(() => import('./components/MyListings').then(m => ({ default: m.MyListings })));
const PaymentHistory = lazyWithRetry(() => import('./components/PaymentHistory').then(m => ({ default: m.PaymentHistory })));
const Notifications = lazyWithRetry(() => import('./components/Notifications').then(m => ({ default: m.Notifications })));
const MessagesScreen = lazyWithRetry(() => import('./components/MessagesScreen').then(m => ({ default: m.MessagesScreen })));

const AgentDashboard = lazyWithRetry(() => import('./components/AgentDashboard').then(m => ({ default: m.AgentDashboard })));
const AgentSetup = lazyWithRetry(() => import('./components/AgentSetup').then(m => ({ default: m.AgentSetup })));
const BillPayFlow = lazyWithRetry(() => import('./components/BillPayFlow'));
const TestBillPayPayment = lazyWithRetry(() => import('./components/TestBillPayPayment'));

function LazyLoad({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    }>
      {children}
    </Suspense>
  );
}

export const router = createBrowserRouter([
  {
    path: "/",
    Component: Root,
    children: [
      { index: true, element: <LazyLoad><HomeFeed /></LazyLoad> },
      { path: "item/:id", element: <LazyLoad><ItemDetail /></LazyLoad> },
      {
        path: "checkout/:id",
        element: <ProtectedRoute><LazyLoad><CheckoutScreen /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "payment-status/:ref",
        element: <ProtectedRoute><LazyLoad><PaymentStatus /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "post",
        element: <ProtectedRoute><LazyLoad><PostListing /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "my-listings",
        element: <ProtectedRoute><LazyLoad><MyListings /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "payments",
        element: <ProtectedRoute><LazyLoad><PaymentHistory /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "pay-bill",
        element: <ProtectedRoute><LazyLoad><BillPayFlow /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "notifications",
        element: <ProtectedRoute><LazyLoad><Notifications /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "messages",
        element: <ProtectedRoute><LazyLoad><MessagesScreen /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "messages/:conversationId",
        element: <ProtectedRoute><LazyLoad><MessagesScreen /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "agents",
        element: <ProtectedRoute><LazyLoad><AgentDashboard /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "agents/new",
        element: <ProtectedRoute><LazyLoad><AgentSetup /></LazyLoad></ProtectedRoute>,
      },
      {
        path: "test-billpay",
        element: <LazyLoad><TestBillPayPayment /></LazyLoad>,
      },
      {
        path: "*",
        element: (
          <div className="min-h-screen flex flex-col items-center justify-center p-4 text-center">
            <h1 className="text-4xl font-bold mb-4">404</h1>
            <p className="text-muted-foreground mb-6">Page not found</p>
            <Link to="/" className="text-primary underline">Go back home</Link>
          </div>
        ),
      },
    ],
  },
  {
    path: "/auth",
    element: <LazyLoad><AuthScreen /></LazyLoad>,
  },
]);
