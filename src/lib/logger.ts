/**
 * Logger utility for the application
 * Provides structured logging with different levels and categories
 */

export type LogLevel = 'debug' | 'info' | 'warn' | 'error';
export type LogCategory = 'payment' | 'webhook' | 'api' | 'user' | 'system';

interface LogEntry {
  timestamp: string;
  level: LogLevel;
  category: LogCategory;
  message: string;
  data?: any;
  userId?: string;
  sessionId?: string;
  traceId?: string;
}

class Logger {
  private isDevelopment = process.env.NODE_ENV === 'development';
  
  private formatLog(entry: LogEntry): string {
    const { timestamp, level, category, message, data, userId, sessionId, traceId } = entry;
    
    let logString = `[${timestamp}] [${level.toUpperCase()}] [${category}] ${message}`;
    
    if (userId) logString += ` userId=${userId}`;
    if (sessionId) logString += ` sessionId=${sessionId}`;
    if (traceId) logString += ` traceId=${traceId}`;
    
    if (data) {
      logString += `\nData: ${JSON.stringify(data, null, 2)}`;
    }
    
    return logString;
  }

  private log(level: LogLevel, category: LogCategory, message: string, data?: any, context?: {
    userId?: string;
    sessionId?: string;
    traceId?: string;
  }) {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      category,
      message,
      data,
      ...context
    };

    const logString = this.formatLog(entry);

    // Always log errors and warnings
    if (level === 'error') {
      console.error(logString);
      
      // In production, you might want to send critical errors to an external service
      if (!this.isDevelopment) {
        // TODO: Send to external logging service (e.g., Sentry, LogRocket, etc.)
        // this.sendToExternalService(entry);
      }
    } else if (level === 'warn') {
      console.warn(logString);
    } else if (this.isDevelopment || level === 'info') {
      // In development, log everything. In production, only log info and above
      console.log(logString);
    }
  }

  // Payment-specific logging methods
  paymentInitiated(data: {
    orderId: string;
    amount: number;
    paymentMethod: string;
    userId?: string;
    transactionId?: string;
  }) {
    this.log('info', 'payment', 'Payment initiated', data, {
      userId: data.userId,
      traceId: `payment_${data.orderId}_${Date.now()}`
    });
  }

  paymentCompleted(data: {
    orderId: string;
    transactionId: string;
    amount: number;
    userId?: string;
  }) {
    this.log('info', 'payment', 'Payment completed successfully', data, {
      userId: data.userId,
      traceId: `payment_${data.orderId}_${Date.now()}`
    });
  }

  paymentFailed(data: {
    orderId: string;
    transactionId?: string;
    error: string;
    userId?: string;
  }) {
    this.log('error', 'payment', 'Payment failed', data, {
      userId: data.userId,
      traceId: `payment_${data.orderId}_${Date.now()}`
    });
  }

  webhookReceived(data: {
    transactionId: string;
    status: string;
    reference: string;
  }) {
    this.log('info', 'webhook', 'KPay webhook received', data, {
      traceId: `webhook_${data.transactionId}_${Date.now()}`
    });
  }

  webhookProcessed(data: {
    transactionId: string;
    status: string;
    success: boolean;
  }) {
    this.log('info', 'webhook', 'KPay webhook processed', data, {
      traceId: `webhook_${data.transactionId}_${Date.now()}`
    });
  }

  webhookError(error: string, data?: any) {
    this.log('error', 'webhook', 'KPay webhook processing error', { error, ...data }, {
      traceId: `webhook_error_${Date.now()}`
    });
  }

  apiError(endpoint: string, error: string, data?: any) {
    this.log('error', 'api', `API error at ${endpoint}`, { error, ...data }, {
      traceId: `api_error_${Date.now()}`
    });
  }

  userAction(action: string, data?: any, userId?: string) {
    this.log('info', 'user', `User action: ${action}`, data, {
      userId,
      traceId: `user_${userId}_${Date.now()}`
    });
  }

  systemError(error: string, data?: any) {
    this.log('error', 'system', 'System error', { error, ...data }, {
      traceId: `system_error_${Date.now()}`
    });
  }

  debug(category: LogCategory, message: string, data?: any) {
    if (this.isDevelopment) {
      this.log('debug', category, message, data);
    }
  }

  info(category: LogCategory, message: string, data?: any) {
    this.log('info', category, message, data);
  }

  warn(category: LogCategory, message: string, data?: any) {
    this.log('warn', category, message, data);
  }

  error(category: LogCategory, message: string, data?: any) {
    this.log('error', category, message, data);
  }
}

// Export singleton instance
export const logger = new Logger();

// Export utility functions for common use cases
export const logPaymentEvent = (event: string, data: any, userId?: string) => {
  logger.info('payment', event, { ...data, userId });
};

export const logError = (category: LogCategory, error: Error | string, data?: any) => {
  const errorMessage = error instanceof Error ? error.message : error;
  const errorStack = error instanceof Error ? error.stack : undefined;
  
  logger.error(category, errorMessage, {
    ...data,
    stack: errorStack
  });
};

export default logger;