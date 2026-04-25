import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  getAllDatasets,
  getDataset,
  addDataset,
  getTransactions,
  Dataset,
} from '../common/storage';
import { notifySeller } from '../webhooks/webhook.service';

/**
 * @openapi
 * components:
 *   schemas:
 *     Dataset:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *         name:
 *           type: string
 *         description:
 *           type: string
 *         type:
 *           type: string
 *         pricePerQuery:
 *           type: number
 *         sellerWallet:
 *           type: string
 *         queriesServed:
 *           type: integer
 *         totalEarned:
 *           type: number
 *         createdAt:
 *           type: string
 *           format: date-time
 */

export const datasetsRouter = Router();

/**
 * @openapi
 * /api/datasets:
 *   get:
 *     summary: List all datasets
 *     description: Retrieve all datasets excluding their raw data content
 *     responses:
 *       200:
 *         description: A list of datasets
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 datasets:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/Dataset'
 */


// GET /api/datasets — list all (without raw data)
datasetsRouter.get('/', (_req: Request, res: Response) => {
  const datasets = getAllDatasets().map(({ data: _data, ...rest }) => rest);
  res.json({ success: true, datasets });
});

/**
 * @openapi
 * /api/datasets/stats:
 *   get:
 *     summary: Get platform statistics
 *     description: Retrieve global statistics including total datasets, queries, and earnings
 *     responses:
 *       200:
 *         description: Platform statistics
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 stats:
 *                   type: object
 *                   properties:
 *                     totalDatasets:
 *                       type: integer
 *                     totalQueries:
 *                       type: integer
 *                     totalUsdcEarned:
 *                       type: number
 *                     totalTransactions:
 *                       type: integer
 */
datasetsRouter.get('/stats', (_req: Request, res: Response) => {
  const datasets = getAllDatasets();
  const transactions = getTransactions();
  res.json({
    success: true,
    stats: {
      totalDatasets: datasets.length,
      totalQueries: datasets.reduce((s, d) => s + d.queriesServed, 0),
      totalUsdcEarned: datasets.reduce((s, d) => s + d.totalEarned, 0),
      totalTransactions: transactions.length,
    },
  });
});

/**
 * @openapi
 * /api/datasets/{id}:
 *   get:
 *     summary: Get dataset by ID
 *     description: Retrieve single dataset metadata by ID (excludes raw data)
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Dataset metadata
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 dataset:
 *                   $ref: '#/components/schemas/Dataset'
 *       404:
 *         description: Dataset not found
 */
datasetsRouter.get('/:id', (req: Request, res: Response) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  const { data: _data, ...meta } = dataset;
  return res.json({ success: true, dataset: meta });
});

/**
 * @openapi
 * /api/datasets/{id}/transactions:
 *   get:
 *     summary: Get dataset transactions
 *     description: Retrieve transaction history for a specific dataset
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: List of transactions
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 transactions:
 *                   type: array
 *                   items:
 *                     type: object
 */
datasetsRouter.get('/:id/transactions', (req: Request, res: Response) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  const transactions = getTransactions(req.params.id);
  return res.json({ success: true, transactions });
});

/**
 * @openapi
 * /api/datasets:
 *   post:
 *     summary: Create a new dataset
 *     description: List a new dataset on the platform
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - description
 *               - type
 *               - pricePerQuery
 *               - sellerWallet
 *               - data
 *             properties:
 *               name:
 *                 type: string
 *               description:
 *                 type: string
 *               type:
 *                 type: string
 *               pricePerQuery:
 *                 type: number
 *               sellerWallet:
 *                 type: string
 *               data:
 *                 type: object
 *     responses:
 *       201:
 *         description: Dataset created successfully
 *       400:
 *         description: Missing required fields or invalid price
 */
datasetsRouter.post('/', (req: Request, res: Response) => {
  const { name, description, type, pricePerQuery, sellerWallet, data } = req.body;

  if (!name || !description || !type || !pricePerQuery || !sellerWallet || !data) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const price = parseFloat(pricePerQuery);
  if (isNaN(price) || price <= 0) {
    return res.status(400).json({ error: 'Invalid price' });
  }

  const dataset: Dataset = {
    id: `ds-${uuidv4()}`,
    name,
    description,
    type,
    pricePerQuery: price,
    sellerWallet,
    data: typeof data === 'string' ? JSON.parse(data) : data,
    queriesServed: 0,
    totalEarned: 0,
    createdAt: new Date().toISOString(),
  };

  addDataset(dataset);

  // Notify seller via webhook
  notifySeller(dataset.sellerWallet, 'dataset.created', {
    datasetId: dataset.id,
    datasetName: dataset.name,
    type: dataset.type,
    pricePerQuery: dataset.pricePerQuery,
  }).catch(() => {});

  const { data: _d, ...meta } = dataset;
  return res.status(201).json({ success: true, dataset: meta });
});
