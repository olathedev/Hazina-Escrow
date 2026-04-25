import { Router, Request, Response } from "express";
import { v4 as uuidv4 } from "uuid";
import {
  getDataset,
  updateDataset,
  addTransaction,
  txHashUsed,
} from '../common/storage';
import { verifyStellarPayment } from './stellar.service';
import { generateDataSummary } from '../ai/claude.service';
import { sendUsdcPayment } from '../agent/agent.wallet';
import { logger } from '../lib/logger';

export const paymentsRouter = Router();

/**
 * @openapi
 * /api/query/{id}:
 *   post:
 *     summary: Initiate a dataset query
 *     description: Returns a 402 Payment Required response with payment instructions and memo
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       402:
 *         description: Payment Required
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 error:
 *                   type: string
 *                 x402:
 *                   type: boolean
 *                 dataset:
 *                   type: object
 *                 payment:
 *                   type: object
 *       404:
 *         description: Dataset not found
 */

/**
 * @openapi
 * /api/verify/{id}:
 *   post:
 *     summary: Verify payment and release data
 *     description: Verifies the Stellar payment transaction and releases the dataset content with an AI summary
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - txHash
 *             properties:
 *               txHash:
 *                 type: string
 *               buyerQuestion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Data released successfully
 *       400:
 *         description: Invalid transaction hash or payment
 *       404:
 *         description: Dataset not found
 */

/**
 * @openapi
 * /api/verify/{id}/demo:
 *   post:
 *     summary: Verify payment in demo mode (skip on-chain check)
 *     description: releases the dataset content with an AI summary without requiring a real Stellar transaction
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               buyerQuestion:
 *                 type: string
 *     responses:
 *       200:
 *         description: Data released successfully (demo mode)
 *       404:
 *         description: Dataset not found
 */


// POST /api/query/:id — initiate query, returns 402 Payment Required
paymentsRouter.post("/query/:id", (req: Request, res: Response) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  const timestamp = Date.now();
  const memo = `haz-${req.params.id.slice(0, 8)}-${timestamp}`;

  // x402 Payment Required response
  return res.status(402).json({
    error: "Payment Required",
    x402: true,
    dataset: {
      id: dataset.id,
      name: dataset.name,
      type: dataset.type,
    },
    payment: {
      paymentAddress: process.env.ESCROW_WALLET || dataset.sellerWallet,
      amount: dataset.pricePerQuery,
      currency: "USDC",
      network: "Stellar Testnet",
      memo,
      expiresIn: 300, // 5 minutes
      instructions: [
        `1. Open your Stellar wallet (Lobstr, StellarX, or testnet faucet)`,
        `2. Send exactly ${dataset.pricePerQuery} USDC to the address above`,
        `3. Include memo: ${memo}`,
        `4. Submit the transaction hash below to receive your data`,
      ],
    },
  });
});

// POST /api/verify/:id — verify payment and release data
paymentsRouter.post("/verify/:id", async (req: Request, res: Response) => {
  const { txHash, buyerQuestion } = req.body;
  const dataset = getDataset(req.params.id);

  if (!dataset) return res.status(404).json({ error: "Dataset not found" });
  if (!txHash) return res.status(400).json({ error: "txHash is required" });

  // Check replay
  if (txHashUsed(txHash)) {
    return res.status(400).json({ error: "Transaction hash already used" });
  }

  try {
    // Verify on Stellar testnet
    const verification = await verifyStellarPayment({
      txHash,
      expectedAmount: dataset.pricePerQuery,
      destinationAddress: process.env.ESCROW_WALLET || dataset.sellerWallet,
    });

    if (!verification.valid) {
      return res
        .status(400)
        .json({ error: verification.reason || "Payment verification failed" });
    }

    // Generate AI summary
    let summary = "";
    let answer: string | undefined;
    try {
      const result = await generateDataSummary(dataset.data, buyerQuestion);
      summary = result.summary;
      answer = result.answer;
    } catch (aiErr) {
      logger.warn({ aiErr }, 'AI summary failed, proceeding without');
      summary = 'Data delivered successfully. AI summary temporarily unavailable.';
    }

    // Forward 95% to seller on-chain
    let sellerTxHash: string | undefined;
    const sellerAmount = parseFloat((dataset.pricePerQuery * 0.95).toFixed(7));
    try {
      const payment = await sendUsdcPayment({
        destinationAddress: dataset.sellerWallet,
        amount: sellerAmount.toFixed(7),
        memo: `hazina-${dataset.id.slice(0, 10)}`,
      });
      sellerTxHash = payment.txHash;
      logger.info(
        { 
          sellerAmount, 
          sellerWallet: dataset.sellerWallet, 
          sellerTxHash 
        }, 
        `[Escrow] Paid seller ${sellerAmount} USDC → ${dataset.sellerWallet} (${sellerTxHash})`
      );
    } catch (payErr) {
      logger.warn(
        { payErr: payErr instanceof Error ? payErr.message : payErr }, 
        '[Escrow] Seller payment failed (data still delivered)'
      );
    }

    // Update dataset stats
    updateDataset(dataset.id, {
      queriesServed: dataset.queriesServed + 1,
      totalEarned: parseFloat((dataset.totalEarned + sellerAmount).toFixed(4)),
    });

    // Log transaction
    addTransaction({
      id: `tx-${uuidv4()}`,
      datasetId: dataset.id,
      txHash,
      amount: dataset.pricePerQuery,
      buyerQuery: buyerQuestion,
      aiSummary: summary,
      timestamp: new Date().toISOString(),
    });

    // Notify seller via webhooks
    notifySeller(dataset.sellerWallet, "payment.received", {
      datasetId: dataset.id,
      datasetName: dataset.name,
      buyerTxHash: txHash,
      amount: dataset.pricePerQuery,
      buyerQuery: buyerQuestion,
    }).catch(() => {});

    if (sellerTxHash) {
      notifySeller(dataset.sellerWallet, "payment.forwarded", {
        datasetId: dataset.id,
        datasetName: dataset.name,
        sellerTxHash,
        amount: sellerAmount,
      }).catch(() => {});
    }

    return res.json({
      success: true,
      data: dataset.data,
      ai: { summary, answer },
      transaction: {
        hash: txHash,
        amount: dataset.pricePerQuery,
        sellerReceived: sellerAmount,
        platformFee: parseFloat((dataset.pricePerQuery * 0.05).toFixed(4)),
        sellerTxHash: sellerTxHash ?? null,
      },
    });
  } catch (err) {
    logger.error({ err }, 'Verification error');
    return res.status(500).json({ error: 'Internal verification error' });
  }
});

// POST /api/verify/:id/demo — demo mode (skip Stellar check) for hackathon
paymentsRouter.post("/verify/:id/demo", async (req: Request, res: Response) => {
  const { buyerQuestion } = req.body;
  const dataset = getDataset(req.params.id);

  if (!dataset) return res.status(404).json({ error: "Dataset not found" });

  let summary = "";
  let answer: string | undefined;
  try {
    const result = await generateDataSummary(dataset.data, buyerQuestion);
    summary = result.summary;
    answer = result.answer;
  } catch (err) {
    logger.error({ err }, 'Demo mode AI error');
    summary = 'Demo mode: AI summary unavailable. Set ANTHROPIC_API_KEY to enable.';
  }

  updateDataset(dataset.id, {
    queriesServed: dataset.queriesServed + 1,
    totalEarned: parseFloat(
      (dataset.totalEarned + dataset.pricePerQuery * 0.95).toFixed(4),
    ),
  });

  addTransaction({
    id: `tx-demo-${uuidv4()}`,
    datasetId: dataset.id,
    txHash: `demo-${Date.now()}`,
    amount: dataset.pricePerQuery,
    buyerQuery: buyerQuestion,
    aiSummary: summary,
    timestamp: new Date().toISOString(),
  });

  return res.json({
    success: true,
    demo: true,
    data: dataset.data,
    ai: { summary, answer },
    transaction: {
      hash: `demo-${Date.now()}`,
      amount: dataset.pricePerQuery,
      sellerReceived: parseFloat((dataset.pricePerQuery * 0.95).toFixed(4)),
      platformFee: parseFloat((dataset.pricePerQuery * 0.05).toFixed(4)),
    },
  });
});
