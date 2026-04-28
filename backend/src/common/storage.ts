import db from '../db/client';
import { datasets, transactions, webhooks } from '../db/schema';
import { eq, and, sql } from 'drizzle-orm';

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

/* ------------------------------------------------------------------ */
/*  Datasets                                                           */
/* ------------------------------------------------------------------ */

export async function getDataset(id: string): Promise<Dataset | undefined> {
  const result = await db.select().from(datasets).where(eq(datasets.id, id)).limit(1);
  if (!result.length) return undefined;

  const row = result[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    pricePerQuery: Number.parseFloat(row.pricePerQuery as string),
    sellerWallet: row.sellerWallet,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    queriesServed: row.queriesServed,
    totalEarned: Number.parseFloat(row.totalEarned as string),
    createdAt: row.createdAt,
  };
}

export async function getAllDatasets(): Promise<Dataset[]> {
  const results = await db
    .select()
    .from(datasets)
    .orderBy(sql`created_at DESC`);

  return results.map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    pricePerQuery: Number.parseFloat(row.pricePerQuery as string),
    sellerWallet: row.sellerWallet,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    queriesServed: row.queriesServed,
    totalEarned: Number.parseFloat(row.totalEarned as string),
    createdAt: row.createdAt,
  }));
}

export async function updateDataset(id: string, updates: Partial<Dataset>): Promise<Dataset | null> {
  if (Object.keys(updates).length === 0) {
    return (await getDataset(id)) ?? null;
  }

  const updateData: Record<string, any> = {};

  if (updates.name !== undefined) updateData.name = updates.name;
  if (updates.description !== undefined) updateData.description = updates.description;
  if (updates.type !== undefined) updateData.type = updates.type;
  if (updates.pricePerQuery !== undefined)
    updateData.pricePerQuery = updates.pricePerQuery.toString();
  if (updates.sellerWallet !== undefined) updateData.sellerWallet = updates.sellerWallet;
  if (updates.data !== undefined) updateData.data = JSON.stringify(updates.data);
  if (updates.queriesServed !== undefined) updateData.queriesServed = updates.queriesServed;
  if (updates.totalEarned !== undefined)
    updateData.totalEarned = updates.totalEarned.toString();
  if (updates.createdAt !== undefined) updateData.createdAt = updates.createdAt;

  const result = await db
    .update(datasets)
    .set(updateData)
    .where(eq(datasets.id, id))
    .returning();

  if (!result.length) return null;

  const row = result[0];
  return {
    id: row.id,
    name: row.name,
    description: row.description,
    type: row.type,
    pricePerQuery: Number.parseFloat(row.pricePerQuery as string),
    sellerWallet: row.sellerWallet,
    data: typeof row.data === 'string' ? JSON.parse(row.data) : row.data,
    queriesServed: row.queriesServed,
    totalEarned: Number.parseFloat(row.totalEarned as string),
    createdAt: row.createdAt,
  };
}

export async function addDataset(dataset: Dataset): Promise<void> {
  await db.insert(datasets).values({
    id: dataset.id,
    name: dataset.name,
    description: dataset.description,
    type: dataset.type,
    pricePerQuery: dataset.pricePerQuery.toString(),
    sellerWallet: dataset.sellerWallet,
    data: JSON.stringify(dataset.data),
    queriesServed: dataset.queriesServed,
    totalEarned: dataset.totalEarned.toString(),
    createdAt: dataset.createdAt,
  });
}

/* ------------------------------------------------------------------ */
/*  Transactions                                                       */
/* ------------------------------------------------------------------ */

export async function addTransaction(tx: Transaction): Promise<void> {
  await db.insert(transactions).values({
    id: tx.id,
    datasetId: tx.datasetId,
    txHash: tx.txHash,
    amount: tx.amount.toString(),
    buyerQuery: tx.buyerQuery ?? null,
    aiSummary: tx.aiSummary ?? null,
    timestamp: tx.timestamp,
  });
}

export async function getTransactions(
  datasetId?: string,
  limit?: number,
  offset?: number,
): Promise<Transaction[]> {
  let query = db.select().from(transactions);

  if (datasetId) {
    query = query.where(eq(transactions.datasetId, datasetId));
  }

  query = query.orderBy(sql`timestamp DESC`);

  if (limit !== undefined && limit > 0) {
    query = query.limit(limit);
  }

  if (offset !== undefined && offset > 0) {
    query = query.offset(offset);
  }

  const results = await query;

  return results.map((row) => ({
    id: row.id,
    datasetId: row.datasetId,
    txHash: row.txHash,
    amount: Number.parseFloat(row.amount as string),
    buyerQuery: row.buyerQuery ?? undefined,
    aiSummary: row.aiSummary ?? undefined,
    timestamp: row.timestamp,
  }));
}

export async function getTransactionsCount(datasetId?: string): Promise<number> {
  let query = db.select({ count: sql<number>`count(*)` }).from(transactions);

  if (datasetId) {
    query = query.where(eq(transactions.datasetId, datasetId));
  }

  const result = await query;
  return result[0]?.count ?? 0;
}

export async function txHashUsed(txHash: string): Promise<boolean> {
  const result = await db
    .select({ count: sql<number>`count(*)` })
    .from(transactions)
    .where(eq(transactions.txHash, txHash));

  return (result[0]?.count ?? 0) > 0;
}

/* ------------------------------------------------------------------ */
/*  Webhooks                                                           */
/* ------------------------------------------------------------------ */

export async function getAllWebhooks(): Promise<WebhookSubscription[]> {
  const results = await db.select().from(webhooks);

  return results.map((row) => {
    let events: WebhookEvent[] = [];
    if (typeof row.events === 'string') {
      try {
        events = JSON.parse(row.events);
      } catch {
        events = [];
      }
    } else if (Array.isArray(row.events)) {
      events = row.events;
    }

    return {
      id: row.id,
      sellerWallet: row.sellerWallet,
      url: row.url,
      secret: row.secret,
      events,
      active: typeof row.active === 'number' ? row.active === 1 : row.active,
      createdAt: row.createdAt,
    };
  });
}

export async function getWebhooksForSeller(sellerWallet: string): Promise<WebhookSubscription[]> {
  const isPostgres = (process.env.DATABASE_URL || '').startsWith('postgres');

  let results;
  if (isPostgres) {
    results = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.sellerWallet, sellerWallet), eq(webhooks.active, true as any)));
  } else {
    results = await db
      .select()
      .from(webhooks)
      .where(and(eq(webhooks.sellerWallet, sellerWallet), eq(webhooks.active, 1 as any)));
  }

  return results.map((row) => {
    let events: WebhookEvent[] = [];
    if (typeof row.events === 'string') {
      try {
        events = JSON.parse(row.events);
      } catch {
        events = [];
      }
    } else if (Array.isArray(row.events)) {
      events = row.events;
    }

    return {
      id: row.id,
      sellerWallet: row.sellerWallet,
      url: row.url,
      secret: row.secret,
      events,
      active: typeof row.active === 'number' ? row.active === 1 : row.active,
      createdAt: row.createdAt,
    };
  });
}

export async function getWebhookById(id: string): Promise<WebhookSubscription | undefined> {
  const result = await db.select().from(webhooks).where(eq(webhooks.id, id)).limit(1);

  if (!result.length) return undefined;

  const row = result[0];
  let events: WebhookEvent[] = [];
  if (typeof row.events === 'string') {
    try {
      events = JSON.parse(row.events);
    } catch {
      events = [];
    }
  } else if (Array.isArray(row.events)) {
    events = row.events;
  }

  return {
    id: row.id,
    sellerWallet: row.sellerWallet,
    url: row.url,
    secret: row.secret,
    events,
    active: typeof row.active === 'number' ? row.active === 1 : row.active,
    createdAt: row.createdAt,
  };
}

export async function addWebhook(webhook: WebhookSubscription): Promise<void> {
  await db.insert(webhooks).values({
    id: webhook.id,
    sellerWallet: webhook.sellerWallet,
    url: webhook.url,
    secret: webhook.secret,
    events: JSON.stringify(webhook.events) as any,
    active: (1 as any),
    createdAt: webhook.createdAt,
  });
}

export async function removeWebhook(id: string): Promise<boolean> {
  const result = await db.delete(webhooks).where(eq(webhooks.id, id));
  const rowCount = result.rowCount ?? (result as any).count ?? 0;
  return rowCount > 0; // eslint-disable-next-line @typescript-eslint/no-unnecessary-type-assertion
}

export async function updateWebhook(
  id: string,
  updates: Partial<WebhookSubscription>,
): Promise<WebhookSubscription | null> {
  if (Object.keys(updates).length === 0) {
    return (await getWebhookById(id)) ?? null;
  }

  const updateData: Record<string, any> = {};

  if (updates.sellerWallet !== undefined) updateData.sellerWallet = updates.sellerWallet;
  if (updates.url !== undefined) updateData.url = updates.url;
  if (updates.secret !== undefined) updateData.secret = updates.secret;
  if (updates.events !== undefined) updateData.events = JSON.stringify(updates.events);
  if (updates.active !== undefined) updateData.active = updates.active ? 1 : 0;
  if (updates.createdAt !== undefined) updateData.createdAt = updates.createdAt;

  const result = await db.update(webhooks).set(updateData).where(eq(webhooks.id, id)).returning();

  if (!result.length) return null;

  const row = result[0];
  let events: WebhookEvent[] = [];
  if (typeof row.events === 'string') {
    try {
      events = JSON.parse(row.events);
    } catch {
      events = [];
    }
  } else if (Array.isArray(row.events)) {
    events = row.events;
  }

  return {
    id: row.id,
    sellerWallet: row.sellerWallet,
    url: row.url,
    secret: row.secret,
    events,
    active: typeof row.active === 'number' ? row.active === 1 : row.active,
    createdAt: row.createdAt,
  };
}

/* ------------------------------------------------------------------ */
/*  Schema bootstrap (run once on startup)                            */
/* ------------------------------------------------------------------ */

export async function ensureSchema(): Promise<void> {
  // Drizzle handles migrations, this is a no-op
  // but kept for backward compatibility
}
