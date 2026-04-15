// Sentry error tracking — gated on VITE_SENTRY_DSN.
// When the DSN is unset (dev without a Sentry account, or test runs), every
// function here is a no-op. This matches the project's isSupabaseConfigured
// pattern — integrations should degrade silently, not crash on missing env.

import * as Sentry from "@sentry/react";

const dsn = (import.meta.env.VITE_SENTRY_DSN as string | undefined) || "";
const environment = import.meta.env.MODE; // "development" | "production"
const release = (import.meta.env.VITE_APP_VERSION as string | undefined) || "dev";

let initialized = false;

export const isSentryConfigured = Boolean(dsn);

export function initSentry(): void {
  if (!isSentryConfigured || initialized) return;
  Sentry.init({
    dsn,
    environment,
    release,
    // Lightweight config — no session replay, no performance tracing by default
    // to keep the free-tier quota intact. Enable selectively later if needed.
    tracesSampleRate: 0,
    replaysSessionSampleRate: 0,
    replaysOnErrorSampleRate: 0,
    // Don't capture console.log / console.warn automatically — the project
    // routes structured events through `frontendLogger`, which forwards to
    // Sentry explicitly. Double-capture would noise the dashboard.
    integrations: [],
    // Strip URLs from breadcrumb data that might contain PII (phone numbers,
    // references) per the project's "no third-party analytics on PII" stance.
    beforeBreadcrumb(breadcrumb) {
      if (breadcrumb.category === "navigation" && breadcrumb.data?.to) {
        breadcrumb.data.to = String(breadcrumb.data.to).split("?")[0];
      }
      return breadcrumb;
    },
  });
  initialized = true;
}

export function setSentryUser(userId: string | null): void {
  if (!initialized) return;
  Sentry.setUser(userId ? { id: userId } : null);
}

export function reportToSentry(
  level: "warning" | "error",
  event: string,
  data?: Record<string, unknown>,
): void {
  if (!initialized) return;
  Sentry.withScope(scope => {
    scope.setLevel(level === "error" ? "error" : "warning");
    scope.setTag("event", event);
    if (data) {
      for (const [k, v] of Object.entries(data)) {
        scope.setExtra(k, v);
      }
    }
    Sentry.captureMessage(event);
  });
}

export function reportException(err: unknown, context?: Record<string, unknown>): void {
  if (!initialized) return;
  Sentry.withScope(scope => {
    if (context) {
      for (const [k, v] of Object.entries(context)) {
        scope.setExtra(k, v);
      }
    }
    Sentry.captureException(err);
  });
}
