import { Request, Response, NextFunction } from 'express';

interface RateLimitInfo {
  count: number;
  resetAt: number;
}

interface RateLimitOptions {
  windowMs?: number;
  maxRequests?: number;
}

export const createRateLimitMiddleware = (options: RateLimitOptions = {}) => {
  const rateLimits = new Map<string, RateLimitInfo>();

  // Use options or environment variables with defaults
  const windowMs = options.windowMs || parseInt(process.env.RATE_LIMIT_WINDOW_MS || '900000', 10);
  const maxRequests = options.maxRequests || parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10);

  return (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();

    let info = rateLimits.get(ip);

    if (!info || now > info.resetAt) {
      info = {
        count: 0,
        resetAt: now + windowMs,
      };
    }

    info.count += 1;
    rateLimits.set(ip, info);

    const remaining = Math.max(0, maxRequests - info.count);
    const resetSeconds = Math.ceil(info.resetAt / 1000);

    res.setHeader('X-RateLimit-Limit', maxRequests);
    res.setHeader('X-RateLimit-Remaining', remaining);
    res.setHeader('X-RateLimit-Reset', resetSeconds);

    if (info.count > maxRequests) {
      return res.status(429).json({
        error: 'Too many requests',
        retryAfter: Math.ceil((info.resetAt - now) / 1000),
      });
    }

    next();
  };
};

// Export a default instance for convenience
export const rateLimitMiddleware = createRateLimitMiddleware();
