import {
  PerformanceMonitor,
  MonitorPerformance,
  withPerformanceMonitoring,
  PerformanceMetrics,
} from '../performance.utils';

describe('PerformanceMonitor', () => {
  it('should start and end timer', () => {
    const monitor = new PerformanceMonitor();
    monitor.startTimer('op');
    expect(() => monitor.endTimer('op')).not.toThrow();
  });
  it('should throw if ending unknown timer', () => {
    const monitor = new PerformanceMonitor();
    expect(() => monitor.endTimer('missing')).toThrow();
  });
});

describe('withPerformanceMonitoring', () => {
  it('should measure successful async operation', async () => {
    const result = await withPerformanceMonitoring('op', async () => 42);
    expect(result).toBe(42);
  });
  it('should measure and throw on error', async () => {
    await expect(
      withPerformanceMonitoring('op', async () => {
        throw new Error('fail');
      })
    ).rejects.toThrow('fail');
  });
});

describe('MonitorPerformance', () => {
  it('should decorate and measure method', async () => {
    class Test {
      @MonitorPerformance()
      async foo(x: number) {
        return x * 2;
      }
    }
    const t = new Test();
    const result = await t.foo(3);
    expect(result).toBe(6);
  });
  it('should decorate and propagate error', async () => {
    class Test {
      @MonitorPerformance()
      async fail() {
        throw new Error('fail');
      }
    }
    const t = new Test();
    await expect(t.fail()).rejects.toThrow('fail');
  });
});

describe('PerformanceMetrics', () => {
  it('should measure and report metrics', async () => {
    const metrics = new PerformanceMetrics();
    class Test {
      @metrics.measure()
      async foo() {
        return 1;
      }
    }
    const t = new Test();
    await t.foo();
    await t.foo();
    const m = metrics.getMetrics();
    expect(m['Test.foo'].callCount).toBe(2);
    expect(m['Test.foo'].avgDuration).toBeGreaterThanOrEqual(0);
    metrics.reset();
    expect(Object.keys(metrics.getMetrics()).length).toBe(0);
  });
});
