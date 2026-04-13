import { useState, useEffect, useRef } from 'react';
import { WifiOff, Wifi } from 'lucide-react';

// navigator.onLine + the `offline` event are famously unreliable — they fire
// on Wi-Fi → cellular handoffs, sleep/wake, low-power mode, VPN toggles, and
// other transient network changes that DON'T actually mean the app is broken.
//
// Two layers of defence below:
//   1. DEBOUNCE — if the browser fires `offline` and then `online` within
//      DEBOUNCE_MS, never show the banner. Kills ~80% of false positives.
//   2. ACTIVE PROBE — after the debounce expires and we still think we're
//      offline, HEAD-fetch Supabase. Only show the banner if the probe ALSO
//      fails. This catches the remaining cases where the OS says "offline"
//      but the app can actually reach the backend fine.
const DEBOUNCE_MS = 2_500;
const PROBE_URL = `${import.meta.env.VITE_SUPABASE_URL || ''}/rest/v1/`;

async function canReachBackend(): Promise<boolean> {
  if (!PROBE_URL.startsWith('http')) return navigator.onLine;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 3500);
    await fetch(PROBE_URL, {
      method: 'HEAD',
      mode: 'no-cors',
      cache: 'no-store',
      signal: controller.signal,
    });
    clearTimeout(timer);
    // no-cors yields an opaque response; reaching here means the network trip succeeded.
    return true;
  } catch {
    return false;
  }
}

export function ConnectionStatus() {
  const [showOffline, setShowOffline] = useState(false);
  const [showReconnected, setShowReconnected] = useState(false);
  const offlineTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const clearOfflineTimer = () => {
      if (offlineTimer.current) {
        clearTimeout(offlineTimer.current);
        offlineTimer.current = null;
      }
    };

    const handleOnline = () => {
      clearOfflineTimer();
      setShowOffline((wasOffline) => {
        if (wasOffline) {
          setShowReconnected(true);
          setTimeout(() => setShowReconnected(false), 3000);
        }
        return false;
      });
    };

    const handleOffline = () => {
      // Debounce: wait DEBOUNCE_MS. If `online` fires during that window,
      // handleOnline clears the timer and the banner never shows.
      clearOfflineTimer();
      offlineTimer.current = setTimeout(async () => {
        // Still offline after debounce — probe the actual backend before
        // committing to showing the banner.
        const reachable = await canReachBackend();
        if (!reachable) setShowOffline(true);
      }, DEBOUNCE_MS);
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      clearOfflineTimer();
    };
  }, []);

  if (!showOffline && !showReconnected) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className={`fixed top-0 left-0 right-0 z-50 px-4 py-2 text-center text-sm font-medium transition-colors ${
        showOffline ? 'bg-yellow-600 text-white' : 'bg-green-600 text-white'
      }`}
    >
      {showOffline ? (
        <span className="flex items-center justify-center gap-2">
          <WifiOff className="w-4 h-4" /> No internet — showing cached data
        </span>
      ) : (
        <span className="flex items-center justify-center gap-2">
          <Wifi className="w-4 h-4" /> Back online
        </span>
      )}
    </div>
  );
}
