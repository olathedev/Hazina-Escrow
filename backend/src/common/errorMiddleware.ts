import { Request, Response, NextFunction } from 'express';
import { logger } from '../lib/logger';

/**
 * Global error handling middleware.
 * Logs the error and returns a 500 status code.
 */
export function errorHandler(
  err: any,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  const statusCode = err.status || err.statusCode || 500;
  const message = err.message || 'Internal Server Error';

  logger.error(
    {
      err: {
        message: err.message,
        stack: err.stack,
        ...err,
      },
    },
    'Unhandled Exception'
  );

  res.status(statusCode).json({
    error: message,
    ...(process.env.NODE_ENV !== 'production' && { stack: err.stack }),
  });
}
