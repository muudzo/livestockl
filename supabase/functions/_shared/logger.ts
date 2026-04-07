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

class Logger {
  private context: LogContext;
  private functionName: string;

  constructor(functionName: string, context: LogContext = {}) {
    this.functionName = functionName;
    this.context = context;
  }

  private log(level: LogLevel, message: string, data?: Record<string, any>) {
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
