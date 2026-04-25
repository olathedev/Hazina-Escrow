import { Request, Response, NextFunction } from 'express';

function makeBearerMiddleware(envVar: string, label: string) {
  return function requireKey(req: Request, res: Response, next: NextFunction) {
    const key = process.env[envVar];

    if (!key) {
      if (process.env.NODE_ENV === 'production') {
        return res.status(503).json({ error: `Server misconfigured: ${envVar} is not set` });
      }
      console.warn(`[auth] ${envVar} not set — skipping ${label} check in non-production`);
      return next();
    }

    const authHeader = req.headers.authorization;
    if (!authHeader?.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Authorization header missing or not Bearer' });
    }

    const token = authHeader.slice(7);
    if (token !== key) {
      return res.status(403).json({ error: 'Invalid API key' });
    }

    next();
  };
}

/** Protects seller write operations (dataset creation, webhook management). */
export const requireApiKey = makeBearerMiddleware('API_KEY', 'seller');

/** Protects admin-only operations (backups). */
export const requireAdminKey = makeBearerMiddleware('ADMIN_API_KEY', 'admin');
