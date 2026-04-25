import { initializeDatadog } from "./common/datadog";
import dotenv from "dotenv";

dotenv.config();
initializeDatadog();

import express from "express";
import cors from "cors";
import { datasetsRouter } from "./datasets/datasets.router";
import { paymentsRouter } from "./payments/payments.router";
import { agentRouter } from "./agent/agent.router";
import { webhooksRouter } from "./webhooks/webhook.router";
import { checkHealth } from "./common/health";
import express from 'express';
import cors from 'cors';
import pinoHttp from 'pino-http';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import path from 'path';
import { datasetsRouter } from './datasets/datasets.router';
import { paymentsRouter } from './payments/payments.router';
import { agentRouter } from './agent/agent.router';
import { checkHealth } from './common/health';
import { rateLimitMiddleware } from './common/rateLimit';
import { logger } from './lib/logger';
import { errorHandler } from './common/errorMiddleware';
import { BackupScheduler } from './common/backup.scheduler';
import { backupRouter, setBackupScheduler } from './common/backup.router';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(pinoHttp({ logger }));
app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Apply rate limiting to all API routes
app.use('/api', rateLimitMiddleware);

// Initialize backup scheduler
const backupEnabled = process.env.BACKUP_ENABLED !== 'false';
if (backupEnabled) {
  const backupScheduler = new BackupScheduler({
    enabled: true,
    backupDir: process.env.BACKUP_DIR || path.join(__dirname, '../../backups'),
    maxBackups: parseInt(process.env.BACKUP_MAX_BACKUPS || '30', 10),
    cronSchedule: process.env.BACKUP_CRON_SCHEDULE || '0 0 * * *', // Daily at midnight by default
  });
  
  backupScheduler.start();
  setBackupScheduler(backupScheduler);
  
  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('[Backup] Stopping backup scheduler...');
    backupScheduler.stop();
  });
  
  process.on('SIGINT', () => {
    console.log('[Backup] Stopping backup scheduler...');
    backupScheduler.stop();
    process.exit(0);
  });
}

const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'Hazina Escrow API',
      version: '1.0.0',
      description: 'API documentation for Hazina Data Escrow platform',
    },
    servers: [
      {
        url: `http://localhost:${PORT}`,
        description: 'Local development server',
      },
    ],
  },
  apis: ['./src/**/*.ts'], // Path to the API docs
};

const swaggerDocs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs));

// Health check with service monitoring
app.get("/health", async (_req, res) => {
  try {
    const health = await checkHealth();
    const statusCode = health.status === "healthy" ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    res.status(500).json({
      status: "unhealthy",
      timestamp: new Date().toISOString(),
      service: "Hazina Escrow API",
      error: message,
    });
  }
});

// Routes
app.use("/api/datasets", datasetsRouter);
app.use("/api", paymentsRouter);
app.use("/api/agent", agentRouter);
app.use("/api/webhooks", webhooksRouter);

// Global Error Handler (MUST be last)
app.use(errorHandler);

app.listen(PORT, () => {
  logger.info(`Data Escrow API running on http://localhost:${PORT}`);
});

export default app;
