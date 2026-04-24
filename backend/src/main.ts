import { initializeDatadog } from './common/datadog';
import dotenv from 'dotenv';

dotenv.config();
initializeDatadog();

import express from 'express';
import cors from 'cors';
import { datasetsRouter } from './datasets/datasets.router';
import { paymentsRouter } from './payments/payments.router';
import { agentRouter } from './agent/agent.router';
import { checkHealth } from './common/health';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '10mb' }));

// Health check with service monitoring
app.get('/health', async (_req, res) => {
  try {
    const health = await checkHealth();
    const statusCode = health.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(health);
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unknown error';
    res.status(500).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      service: 'Hazina Escrow API',
      error: message,
    });
  }
});

// Routes
app.use('/api/datasets', datasetsRouter);
app.use('/api', paymentsRouter);
app.use('/api/agent', agentRouter);

app.listen(PORT, () => {
  console.log(`\n  ██╗  ██╗ █████╗ ███████╗██╗███╗   ██╗ █████╗`);
  console.log(`  ██║  ██║██╔══██╗╚══███╔╝██║████╗  ██║██╔══██╗`);
  console.log(`  ███████║███████║  ███╔╝ ██║██╔██╗ ██║███████║`);
  console.log(`  ██╔══██║██╔══██║ ███╔╝  ██║██║╚██╗██║██╔══██║`);
  console.log(`  ██║  ██║██║  ██║███████╗██║██║ ╚████║██║  ██║`);
  console.log(`  ╚═╝  ╚═╝╚═╝  ╚═╝╚══════╝╚═╝╚═╝  ╚═══╝╚═╝  ╚═╝`);
  console.log(`\n  Data Escrow API running on http://localhost:${PORT}\n`);
});

export default app;
