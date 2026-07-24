import { logger } from './logger';

export interface DatabaseOperationLog {
  operation: string;
  table?: string;
  duration: number;
  timestamp: Date;
  success: boolean;
  error?: string;
  details?: Record<string, any>;
}

export class DatabaseLogger {
  private static operationTimers = new Map<string, number>();

  static startOperation(operationId: string): void {
    this.operationTimers.set(operationId, Date.now());
  }

  static endOperation(
    operationId: string,
    operation: string,
    table: string | undefined,
    success: boolean,
    error?: string,
    details?: Record<string, any>
  ): DatabaseOperationLog {
    const startTime = this.operationTimers.get(operationId) || Date.now();
    const duration = Date.now() - startTime;
    this.operationTimers.delete(operationId);

    const log: DatabaseOperationLog = {
      operation,
      table,
      duration,
      timestamp: new Date(),
      success,
      error,
      details,
    };

    if (success) {
      logger.debug('DB Operation:', {
        operation,
        table,
        duration: `${duration}ms`,
        details,
      });
    } else {
      logger.error('DB Operation Failed:', {
        operation,
        table,
        duration: `${duration}ms`,
        error,
        details,
      });
    }

    // Warn if operation took longer than 5 seconds
    if (duration > 5000) {
      logger.warn('Slow DB Operation:', {
        operation,
        table,
        duration: `${duration}ms`,
        details,
      });
    }

    return log;
  }

  static logQuery(
    query: string,
    params?: any[],
    duration?: number,
    error?: string
  ): void {
    if (error) {
      logger.error('Query Error:', { query, params, error, duration: `${duration}ms` });
    } else {
      logger.debug('Query Executed:', { query, params, duration: `${duration}ms` });
    }
  }

  static logBatch(
    operation: string,
    count: number,
    duration: number,
    error?: string
  ): void {
    if (error) {
      logger.error(`Batch ${operation} failed:`, {
        count,
        duration: `${duration}ms`,
        error,
      });
    } else {
      logger.debug(`Batch ${operation} completed:`, {
        count,
        duration: `${duration}ms`,
      });
    }
  }
}
