// Structured logger for Edge Functions
// Outputs JSON to stdout for Supabase logs dashboard

type LogLevel = 'debug' | 'info' | 'warn' | 'error';

interface LogContext {
  requestId?: string;
  userId?: string;
  livestockId?: string;
  agentId?: string;
  reference?: string;
  [key: string]: any;
}

const LEVEL_ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

// Threshold from env (default 'info' in prod). A future debug() added for local
// troubleshooting won't ship verbose, possibly-PII output to the Supabase logs
// unless LOG_LEVEL=debug is explicitly set.
function thresholdLevel(): number {
  const raw = (globalThis as any).Deno?.env?.get?.("LOG_LEVEL")?.toLowerCase();
  return LEVEL_ORDER[raw as LogLevel] ?? LEVEL_ORDER.info;
}

class Logger {
  private context: LogContext;
  private functionName: string;

  constructor(functionName: string, context: LogContext = {}) {
    this.functionName = functionName;
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>) {
    if (LEVEL_ORDER[level] < thresholdLevel()) return;
    const entry = {
      timestamp: new Date().toISOString(),
      level,
      function: this.functionName,
      message,
      ...this.context,
      ...(data || {}),
    };
    const output = JSON.stringify(entry);
    switch (level) {
      case 'error': console.error(output); break;
      case 'warn': console.warn(output); break;
      default: console.log(output);
    }
  }

  debug(message: string, data?: Record<string, any>) { this.log('debug', message, data); }
  info(message: string, data?: Record<string, any>) { this.log('info', message, data); }
  warn(message: string, data?: Record<string, any>) { this.log('warn', message, data); }
  error(message: string, data?: Record<string, any>) { this.log('error', message, data); }

  child(context: LogContext): Logger {
    return new Logger(this.functionName, { ...this.context, ...context });
  }
}

export function generateRequestId(): string {
  return `req_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function createLogger(functionName: string, req?: Request): Logger {
  const requestId = req?.headers.get('x-request-id') || generateRequestId();
  return new Logger(functionName, { requestId });
}

export { Logger };
export type { LogContext, LogLevel };
