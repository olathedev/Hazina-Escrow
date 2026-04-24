import tracer from 'dd-trace';

export function initializeDatadog(): void {
  if (!process.env.DATADOG_ENABLED || process.env.DATADOG_ENABLED === 'false') {
    return;
  }

  tracer.init({
    service: process.env.DATADOG_SERVICE || 'hazina-escrow-api',
    env: process.env.NODE_ENV || 'development',
    version: process.env.DATADOG_VERSION || '1.0.0',
    enabled: true,
    logInjection: true,
  });

  tracer.use('express', {
    headers: ['x-datadog-trace-id', 'x-datadog-parent-id'],
  });

  tracer.use('http', {
    headers: ['x-datadog-trace-id', 'x-datadog-parent-id'],
  });
}

export { tracer };
