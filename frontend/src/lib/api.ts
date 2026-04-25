const BASE = '/api';

export interface AgentSellerPayment {
  seller: string;
  type: string;
  amount: number;
  txHash: string;
  onChain: boolean;
}

export interface AgentReport {
  topOpportunity: {
    protocol: string;
    vault: string;
    chain: string;
    apy: number;
    riskLevel: string;
    whaleConfidence: string;
    sentimentScore: string;
  };
  reasoning: string;
  alternatives: string[];
  warnings: string[];
  rawAnalysis: string;
}

export interface AgentJob {
  success: boolean;
  demo?: boolean;
  jobId: string;
  query: string;
  report: AgentReport;
  payments: {
    humanPaid: number;
    currency: string;
    network: string;
    note?: string;
    sellerPayments: AgentSellerPayment[];
    totalSpent: number;
    agentProfit: number;
  };
  meta: {
    agentWallet: string;
    timestamp: string;
    datasetsQueried: number;
  };
}

export interface AgentInfo {
  success: boolean;
  agent: {
    name: string;
    version: string;
    description: string;
    agentWallet: string;
    fee: { amount: number; currency: string; network: string; description: string };
    sellers: { type: string; role: string; cost: number }[];
    agentProfit: number;
    escrowWallet: string;
  };
}

export interface DatasetMeta {
  id: string;
  name: string;
  description: string;
  type: string;
  pricePerQuery: number;
  sellerWallet: string;
  queriesServed: number;
  totalEarned: number;
  createdAt: string;
  thumbnail?: string;
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

export interface Stats {
  totalDatasets: number;
  totalQueries: number;
  totalUsdcEarned: number;
  totalTransactions: number;
}

export interface QueryResult {
  success: boolean;
  demo?: boolean;
  data: Record<string, unknown>;
  ai: { summary: string; answer?: string };
  transaction: {
    hash: string;
    amount: number;
    sellerReceived: number;
    platformFee: number;
  };
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30000);
  try {
    const res = await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...options,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: 'Network error' }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json();
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — please try again');
    }
    throw err;
  } finally {
    clearTimeout(timeout);
  }
}

export const api = {
  getDatasets: () =>
    request<{ success: boolean; datasets: DatasetMeta[] }>(`${BASE}/datasets`).then(
      (r) => r.datasets
    ),

  getStats: () =>
    request<{ success: boolean; stats: Stats }>(`${BASE}/datasets/stats`).then((r) => r.stats),

  getDataset: (id: string) =>
    request<{ success: boolean; dataset: DatasetMeta }>(`${BASE}/datasets/${id}`).then(
      (r) => r.dataset
    ),

  getTransactions: (datasetId?: string) => {
    const url = datasetId
      ? `${BASE}/datasets/${datasetId}/transactions`
      : `${BASE}/datasets/transactions`;
    return request<{ success: boolean; transactions: Transaction[] }>(url).then(
      (r) => r.transactions
    );
  },

  initiateQuery: (id: string) =>
    fetch(`${BASE}/query/${id}`, { method: 'POST' }).then((r) => r.json()),

  verifyPayment: (id: string, txHash: string, buyerQuestion?: string) =>
    request<QueryResult>(`${BASE}/verify/${id}`, {
      method: 'POST',
      body: JSON.stringify({ txHash, buyerQuestion }),
    }),

  demoQuery: (id: string, buyerQuestion?: string) =>
    request<QueryResult>(`${BASE}/verify/${id}/demo`, {
      method: 'POST',
      body: JSON.stringify({ buyerQuestion }),
    }),

  agentInfo: () =>
    request<AgentInfo>(`${BASE}/agent/info`),

  agentDemo: (query: string) =>
    request<AgentJob>(`${BASE}/agent/research/demo`, {
      method: 'POST',
      body: JSON.stringify({ query }),
    }),

  agentResearch: (query: string, txHash: string) =>
    request<AgentJob>(`${BASE}/agent/research`, {
      method: 'POST',
      body: JSON.stringify({ query, txHash }),
    }),

  createDataset: (payload: {
    name: string;
    description: string;
    type: string;
    pricePerQuery: number;
    sellerWallet: string;
    data: unknown;
  }) =>
    request<{ success: boolean; dataset: DatasetMeta }>(`${BASE}/datasets`, {
      method: 'POST',
      body: JSON.stringify(payload),
    }).then((r) => r.dataset),
};
