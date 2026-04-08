interface Logger {
  info: (message: string, data?: Record<string, unknown>) => void;
  error: (message: string, data?: Record<string, unknown>) => void;
  warn: (message: string, data?: Record<string, unknown>) => void;
}

export function createLogger(functionName: string, _req?: Request): Logger {
  const prefix = `[${functionName}]`;

  return {
    info: (message: string, data?: Record<string, unknown>) => {
      console.log(prefix, message, data ? JSON.stringify(data) : '');
    },
    error: (message: string, data?: Record<string, unknown>) => {
      console.error(prefix, message, data ? JSON.stringify(data) : '');
    },
    warn: (message: string, data?: Record<string, unknown>) => {
      console.warn(prefix, message, data ? JSON.stringify(data) : '');
    },
  };
}
