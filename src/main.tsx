
  import { createRoot } from "react-dom/client";
  import App from "./app/App.tsx";
  import "./styles/index.css";
  import { frontendLogger } from "./lib/logger";

  // Global unhandled error handlers
  window.addEventListener('unhandledrejection', (event) => {
    frontendLogger.error('unhandled_promise_rejection', {
      reason: event.reason?.message || String(event.reason),
    });
  });

  window.addEventListener('error', (event) => {
    frontendLogger.error('unhandled_error', {
      message: event.message,
      filename: event.filename,
      lineno: event.lineno,
    });
  });

  createRoot(document.getElementById("root")!).render(<App />);
  