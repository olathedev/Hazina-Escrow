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

export const datasetsRouter = Router();

// GET /api/datasets — list all (without raw data)
datasetsRouter.get('/', (_req: Request, res: Response) => {
  const datasets = getAllDatasets().map(({ data: _data, ...rest }) => rest);
  res.json({ success: true, datasets });
});

// GET /api/datasets/stats — global platform stats
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

// GET /api/datasets/:id — single dataset metadata (no data)
datasetsRouter.get('/:id', (req: Request, res: Response) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  const { data: _data, ...meta } = dataset;
  return res.json({ success: true, dataset: meta });
});

// GET /api/datasets/:id/transactions — dataset transaction history
datasetsRouter.get('/:id/transactions', (req: Request, res: Response) => {
  const dataset = getDataset(req.params.id);
  if (!dataset) return res.status(404).json({ error: 'Dataset not found' });
  const transactions = getTransactions(req.params.id);
  return res.json({ success: true, transactions });
});

// POST /api/datasets — create new listing
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
