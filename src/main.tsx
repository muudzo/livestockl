
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { frontendLogger } from "./lib/logger";
  import { initSentry, reportException } from "./lib/sentry";

  // Initialize Sentry before any app code runs. No-op when VITE_SENTRY_DSN unset.
  initSentry();

  // Global unhandled error handlers
  window.addEventListener('unhandledrejection', (event) => {
    frontendLogger.error('unhandled_promise_rejection', {
      reason: event.reason?.message || String(event.reason),
    });
    reportException(event.reason, { source: 'unhandled_promise_rejection' });
  });

  window.addEventListener('error', (event) => {
    frontendLogger.error('unhandled_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
    });
    reportException(event.error ?? new Error(event.message), {
      source: 'unhandled_error',
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  createRoot(document.getElementById("root")!).render(<App />);
