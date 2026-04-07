// Frontend structured logger
// Logs to console in dev, stores in localStorage ring buffer for debugging

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  event: string;
  data?: Record<string, any>;
  userId?: string;
  path?: string;
}

const MAX_LOG_ENTRIES = 200;
const LOG_STORAGE_KEY = 'zimlivestock_logs';

class FrontendLogger {
  private getContext(): { userId?: string; path: string } {
    let userId: string | undefined;
    try {
      const auth = JSON.parse(localStorage.getItem('zimlivestock-auth') || '{}');
      userId = auth?.state?.user?.id;
    } catch {}
    return { userId, path: window.location.pathname };
  }

  private log(level: LogLevel, event: string, data?: Record<string, any>) {
    const ctx = this.getContext();
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      event,
      ...(data && { data }),
      ...(ctx.userId && { userId: ctx.userId }),
      path: ctx.path,
    };

    const msg = `[${level.toUpperCase()}] ${event}`;
    switch (level) {
      case 'error':
        console.error(msg, data || '');
        break;
      case 'warn':
        console.warn(msg, data || '');
        break;
      case 'debug':
        if (import.meta.env.DEV) console.debug(msg, data || '');
        break;
      default:
        if (import.meta.env.DEV) console.log(msg, data || '');
    }

    if (level === 'error' || level === 'warn' || import.meta.env.DEV) {
      this.persist(entry);
    }
  }

  private persist(entry: LogEntry) {
    try {
      const logs: LogEntry[] = JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
      logs.push(entry);
      if (logs.length > MAX_LOG_ENTRIES) {
        logs.splice(0, logs.length - MAX_LOG_ENTRIES);
      }
      localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(logs));
    } catch {
      // localStorage full or unavailable
    }
  }

  debug(event: string, data?: Record<string, any>) { this.log('debug', event, data); }
  info(event: string, data?: Record<string, any>) { this.log('info', event, data); }
  warn(event: string, data?: Record<string, any>) { this.log('warn', event, data); }
  error(event: string, data?: Record<string, any>) { this.log('error', event, data); }

  dump(): LogEntry[] {
    try {
      return JSON.parse(localStorage.getItem(LOG_STORAGE_KEY) || '[]');
    } catch {
      return [];
    }
  }

  clear() {
    localStorage.removeItem(LOG_STORAGE_KEY);
  }
}

export const frontendLogger = new FrontendLogger();

// Expose to window for debugging: window.__logs.dump()
if (typeof window !== 'undefined') {
  (window as any).__logs = {
    dump: () => frontendLogger.dump(),
    clear: () => frontendLogger.clear(),
  };
}
