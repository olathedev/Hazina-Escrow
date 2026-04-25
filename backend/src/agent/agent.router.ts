import { Router, Request, Response } from 'express';
import { runResearchAgent, runResearchAgentDemo } from './agent.service';
import { getAgentPublicKey } from './agent.wallet';
import { logger } from '../lib/logger';

export const agentRouter = Router();

/**
 * @openapi
 * /api/agent/info:
 *   get:
 *     summary: Get agent information
 *     description: Retrieve details about the Hazina Research Agent, including its wallet address and fee structure
 *     responses:
 *       200:
 *         description: Agent information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 agent:
 *                   type: object
 *                   properties:
 *                     name:
 *                       type: string
 *                     version:
 *                       type: string
 *                     description:
 *                       type: string
 *                     agentWallet:
 *                       type: string
 *                     fee:
 *                       type: object
 *                     sellers:
 *                       type: array
 *                       items:
 *                         type: object
 */

/**
 * @openapi
 * /api/agent/research:
 *   post:
 *     summary: Run autonomous research job
 *     description: Starts a research job using the autonomous agent. Requires a 1 USDC Stellar payment.
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *               - txHash
 *             properties:
 *               query:
 *                 type: string
 *                 minLength: 5
 *               txHash:
 *                 type: string
 *     responses:
 *       200:
 *         description: Research job completed
 *       400:
 *         description: Invalid query or transaction hash
 *       402:
 *         description: Payment Required or verification failed
 */

/**
 * @openapi
 * /api/agent/research/demo:
 *   post:
 *     summary: Run research job in demo mode
 *     description: Simulates an autonomous research job without requiring real payments
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - query
 *             properties:
 *               query:
 *                 type: string
 *                 minLength: 5
 *     responses:
 *       200:
 *         description: Research job completed (demo mode)
 *       400:
 *         description: Invalid query
 */


// GET /api/agent/info — agent wallet address and capabilities
agentRouter.get('/info', (_req: Request, res: Response) => {
  res.json({
    success: true,
    agent: {
      name: 'Hazina Research Agent',
      version: '1.0.0',
      description: 'Autonomous DeFi yield researcher. Pays data sellers via x402 on Stellar, synthesises with Claude AI.',
      agentWallet: getAgentPublicKey() ?? 'Not configured (demo-only mode)',
      fee: {
        amount: 1,
        currency: 'USDC',
        network: 'Stellar',
        description: 'Flat fee per research job',
      },
      sellers: [
        { type: 'yield-data',    role: 'APY & protocol data',      cost: 0.02 },
        { type: 'whale-wallets', role: 'Whale wallet movements',    cost: 0.05 },
        { type: 'risk-scores',   role: 'Protocol risk scores',      cost: 0.03 },
        { type: 'sentiment',     role: 'Social market sentiment',   cost: 0.04 },
      ],
      agentProfit: 0.86,
      escrowWallet: process.env.ESCROW_WALLET ?? 'Not configured',
    },
  });
});

// POST /api/agent/research — real mode (requires Stellar payment + funded agent wallet)
// Body: { query: string, txHash: string }
agentRouter.post('/research', async (req: Request, res: Response) => {
  const { query, txHash } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    return res.status(400).json({ error: 'query is required (min 5 chars)' });
  }
  if (!txHash || typeof txHash !== 'string') {
    return res.status(400).json({ error: 'txHash of your 1 USDC payment is required' });
  }

  // Respond with 402 first if no ESCROW_WALLET configured
  if (!process.env.ESCROW_WALLET) {
    return res.status(402).json({
      error: 'Payment Required',
      x402: true,
      message: 'ESCROW_WALLET not configured. Use /api/agent/research/demo for testing.',
    });
  }

  try {
    logger.info({ query }, `[Agent] New research job: "${query}"`);
    const job = await runResearchAgent(query.trim(), txHash.trim());

    return res.json({
      success: true,
      jobId: job.jobId,
      query: job.query,
      report: job.report,
      payments: {
        humanPaid: 1,
        currency: 'USDC',
        network: 'Stellar',
        humanTxHash: job.humanTxHash,
        sellerPayments: job.purchases.map((p) => ({
          seller: p.datasetName,
          type: p.type,
          amount: p.amountPaid,
          txHash: p.txHash,
          onChain: !p.demo,
        })),
        totalSpent: job.totalSpent,
        agentProfit: job.agentProfit,
      },
      meta: {
        agentWallet: job.agentWallet,
        timestamp: job.timestamp,
        datasetsQueried: job.purchases.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Research agent error';
    logger.error({ err }, '[Agent] Error');

    if (message.includes('Payment verification failed') || message.includes('verification failed')) {
      return res.status(402).json({ error: message });
    }
    if (message.includes('already used')) {
      return res.status(400).json({ error: message });
    }
    return res.status(500).json({ error: message });
  }
});

// POST /api/agent/research/demo — demo mode, no real payments needed
// Body: { query: string }
agentRouter.post('/research/demo', async (req: Request, res: Response) => {
  const { query } = req.body;

  if (!query || typeof query !== 'string' || query.trim().length < 5) {
    return res.status(400).json({ error: 'query is required (min 5 chars)' });
  }

  try {
    logger.info({ query }, `[Agent][Demo] New research job: "${query}"`);
    const job = await runResearchAgentDemo(query.trim());

    return res.json({
      success: true,
      demo: true,
      jobId: job.jobId,
      query: job.query,
      report: job.report,
      payments: {
        humanPaid: 1,
        currency: 'USDC',
        network: 'Stellar (simulated)',
        note: 'Demo mode — no real Stellar transactions. All payments simulated.',
        sellerPayments: job.purchases.map((p) => ({
          seller: p.datasetName,
          type: p.type,
          amount: p.amountPaid,
          txHash: p.txHash,
          onChain: false,
        })),
        totalSpent: job.totalSpent,
        agentProfit: job.agentProfit,
      },
      meta: {
        agentWallet: job.agentWallet ?? 'demo-wallet',
        timestamp: job.timestamp,
        datasetsQueried: job.purchases.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Research agent error';
    logger.error({ err }, '[Agent][Demo] Error');
    return res.status(500).json({ error: message });
  }
});
