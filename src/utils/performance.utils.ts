import { logPerformance } from './logger';
import { logger } from './logger';

/**
 * Performance monitoring utility class
 */
export class PerformanceMonitor {
  private timers: Map<string, number>;

  constructor() {
    this.timers = new Map();
  }

  /**
   * Starts timing an operation
   */
  startTimer(operationId: string): void {
    this.timers.set(operationId, performance.now());
  }

  /**
   * Ends timing an operation and logs the duration
   */
  endTimer(operationId: string, metadata: Record<string, unknown> = {}): number {
    const startTime = this.timers.get(operationId);
    if (!startTime) {
      throw new Error(`No timer found for operation: ${operationId}`);
    }

    const duration = Math.round(performance.now() - startTime);
    logPerformance(operationId, duration, metadata);
    this.timers.delete(operationId);

    return duration;
  }
}

/**
 * Performance monitoring decorator for class methods
 */
export function MonitorPerformance(metadata: Record<string, unknown> = {}) {
  return function (
    target: object,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ): PropertyDescriptor {
    const originalMethod = descriptor.value;
    const monitor = new PerformanceMonitor();

    descriptor.value = async function (...args: unknown[]): Promise<unknown> {
      const operationId = `${target.constructor.name}.${propertyKey}`;
      monitor.startTimer(operationId);

      try {
        const result = await originalMethod.apply(this, args);
        monitor.endTimer(operationId, {
          ...metadata,
          success: true,
        });
        return result;
      } catch (error) {
        monitor.endTimer(operationId, {
          ...metadata,
          success: false,
          error: error instanceof Error ? error.message : String(error),
        });
        throw error;
      }
    };

    return descriptor;
  };
}

/**
 * Async operation wrapper with performance monitoring
 */
export async function withPerformanceMonitoring<T>(
  operation: string,
  fn: () => Promise<T>,
  metadata: Record<string, unknown> = {}
): Promise<T> {
  const monitor = new PerformanceMonitor();
  monitor.startTimer(operation);

  try {
    const result = await fn();
    monitor.endTimer(operation, {
      ...metadata,
      success: true,
    });
    return result;
  } catch (error) {
    monitor.endTimer(operation, {
      ...metadata,
      success: false,
      error: error instanceof Error ? error.message : String(error),
    });
    throw error;
  }
}

/**
 * Utility class for measuring and logging method performance
 */
export class PerformanceMetrics {
  private metrics: Map<string, { count: number; totalTime: number }>;

  constructor() {
    this.metrics = new Map();
  }

  /**
   * Method decorator for measuring execution time
   */
  measure() {
    return (target: object, propertyKey: string, descriptor: PropertyDescriptor) => {
      const originalMethod = descriptor.value;
      const metricsMap = this.metrics;

      descriptor.value = async function (...args: unknown[]) {
        const start = performance.now();
        try {
          return await originalMethod.apply(this, args);
        } finally {
          const end = performance.now();
          const duration = end - start;

          const metricKey = `${target.constructor.name}.${propertyKey}`;
          const current = metricsMap.get(metricKey) || { count: 0, totalTime: 0 };

          metricsMap.set(metricKey, {
            count: current.count + 1,
            totalTime: current.totalTime + duration,
          });

          logger.debug('Method performance', {
            method: metricKey,
            duration: `${duration.toFixed(2)}ms`,
            avgDuration: `${(current.totalTime / current.count).toFixed(2)}ms`,
            callCount: current.count + 1,
          });
        }
      };

      return descriptor;
    };
  }

  /**
   * Get performance metrics for all measured methods
   */
  getMetrics() {
    const result: Record<string, { avgDuration: number; callCount: number }> = {};

    for (const [key, value] of this.metrics.entries()) {
      result[key] = {
        avgDuration: value.totalTime / value.count,
        callCount: value.count,
      };
    }

    return result;
  }

  /**
   * Reset all performance metrics
   */
  reset() {
    this.metrics.clear();
  }
}
