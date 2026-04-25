import fs from 'fs';
import path from 'path';

const DATA_PATH = path.join(__dirname, '../../../data/datasets.json');

export interface Dataset {
  id: string;
  name: string;
  description: string;
  type: string;
  pricePerQuery: number;
  sellerWallet: string;
  data: Record<string, unknown>;
  queriesServed: number;
  totalEarned: number;
  createdAt: string;
}

export interface Transaction {
  id: string;
  datasetId: string;
  txHash: string;
  amount: number;
  buyerQuery?: string;
  aiSummary?: string;
  timestamp: string;
}

export type WebhookEvent =
  | 'payment.received'
  | 'payment.forwarded'
  | 'dataset.queried'
  | 'dataset.created'
  | 'ping';

export interface WebhookSubscription {
  id: string;
  sellerWallet: string;
  url: string;
  secret: string;
  events: WebhookEvent[];
  active: boolean;
  createdAt: string;
}

export interface Store {
  datasets: Dataset[];
  transactions: Transaction[];
  webhooks: WebhookSubscription[];
}

function ensureStore(): Store {
  if (!fs.existsSync(DATA_PATH)) {
    const empty: Store = { datasets: [], transactions: [], webhooks: [] };
    fs.writeFileSync(DATA_PATH, JSON.stringify(empty, null, 2), 'utf-8');
    return empty;
  }
  const raw = fs.readFileSync(DATA_PATH, 'utf-8');
  const parsed = JSON.parse(raw) as Partial<Store>;
  if (!parsed.webhooks) parsed.webhooks = [];
  return parsed as Store;
}

export function readStore(): Store {
  return ensureStore();
}

export function writeStore(store: Store): void {
  fs.writeFileSync(DATA_PATH, JSON.stringify(store, null, 2), 'utf-8');
}

export function getDataset(id: string): Dataset | undefined {
  return readStore().datasets.find((d) => d.id === id);
}

export function getAllDatasets(): Dataset[] {
  return readStore().datasets;
}

export function updateDataset(id: string, updates: Partial<Dataset>): Dataset | null {
  const store = readStore();
  const idx = store.datasets.findIndex((d) => d.id === id);
  if (idx === -1) return null;
  store.datasets[idx] = { ...store.datasets[idx], ...updates };
  writeStore(store);
  return store.datasets[idx];
}

export function addDataset(dataset: Dataset): void {
  const store = readStore();
  store.datasets.push(dataset);
  writeStore(store);
}

export function addTransaction(tx: Transaction): void {
  const store = readStore();
  store.transactions.push(tx);
  writeStore(store);
}

export function getTransactions(datasetId?: string): Transaction[] {
  const store = readStore();
  if (datasetId) return store.transactions.filter((t) => t.datasetId === datasetId);
  return store.transactions;
}

export function txHashUsed(txHash: string): boolean {
  return readStore().transactions.some((t) => t.txHash === txHash);
}

/* ------------------------------------------------------------------ */
/*  Webhooks                                                           */
/* ------------------------------------------------------------------ */

export function getAllWebhooks(): WebhookSubscription[] {
  return readStore().webhooks;
}

export function getWebhooksForSeller(sellerWallet: string): WebhookSubscription[] {
  return readStore().webhooks.filter((w) => w.sellerWallet === sellerWallet && w.active);
}

export function getWebhookById(id: string): WebhookSubscription | undefined {
  return readStore().webhooks.find((w) => w.id === id);
}

export function addWebhook(webhook: WebhookSubscription): void {
  const store = readStore();
  store.webhooks.push(webhook);
  writeStore(store);
}

export function removeWebhook(id: string): boolean {
  const store = readStore();
  const idx = store.webhooks.findIndex((w) => w.id === id);
  if (idx === -1) return false;
  store.webhooks.splice(idx, 1);
  writeStore(store);
  return true;
}

export function updateWebhook(id: string, updates: Partial<WebhookSubscription>): WebhookSubscription | null {
  const store = readStore();
  const idx = store.webhooks.findIndex((w) => w.id === id);
  if (idx === -1) return null;
  store.webhooks[idx] = { ...store.webhooks[idx], ...updates };
  writeStore(store);
  return store.webhooks[idx];
}

