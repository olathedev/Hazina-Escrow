const RAW_API_URL = (import.meta.env.VITE_API_URL ?? '').toString().trim();
export const API_BASE_URL = RAW_API_URL
  ? `${RAW_API_URL.replace(/\/+$/, '')}/api`
  : '/api';

const BASE = API_BASE_URL;

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

export interface PaginatedDatasets {
  data: DatasetMeta[];
  total: number;
  page: number;
  totalPages: number;
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

export const DEFAULT_REQUEST_TIMEOUT_MS = 30_000;
export const AGENT_REQUEST_TIMEOUT_MS = 120_000;

const API_KEY = (import.meta.env.VITE_API_KEY ?? '').toString().trim();

interface RequestOptions extends RequestInit {
  /** Per-call override of the abort timeout, in milliseconds. */
  timeoutMs?: number;
}

function authHeaders(extra?: HeadersInit): HeadersInit {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (API_KEY) headers['Authorization'] = `Bearer ${API_KEY}`;
  return { ...headers, ...(extra as Record<string, string>) };
}

async function fetchWithTimeout(url: string, options?: RequestOptions): Promise<Response> {
  const { timeoutMs = DEFAULT_REQUEST_TIMEOUT_MS, ...init } = options ?? {};
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, {
      headers: { 'Content-Type': 'application/json' },
      signal: controller.signal,
      ...init,
    });
  } catch (err) {
    if (err instanceof Error && err.name === 'AbortError') {
      throw new Error('Request timed out — please try again');
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

async function request<T>(url: string, options?: RequestOptions): Promise<T> {
  const res = await fetchWithTimeout(url, options);
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Network error' }));
    throw new Error(err.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  getDatasets: (params?: {
    page?: number;
    limit?: number;
    search?: string;
    type?: string;
    sort?: string;
  }) => {
    const searchParams = new URLSearchParams();
    if (params) {
      if (params.page) searchParams.append('page', params.page.toString());
      if (params.limit) searchParams.append('limit', params.limit.toString());
      if (params.search) searchParams.append('search', params.search);
      if (params.type) searchParams.append('type', params.type);
      if (params.sort) searchParams.append('sort', params.sort);
    }
    const query = searchParams.toString();
    const url = `${BASE}/datasets${query ? `?${query}` : ''}`;
    return request<PaginatedDatasets>(url);
  },

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
    fetchWithTimeout(`${BASE}/query/${id}`, { method: 'POST' }).then((r) => r.json()),

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
      timeoutMs: AGENT_REQUEST_TIMEOUT_MS,
    }),

  agentResearch: (query: string, txHash: string) =>
    request<AgentJob>(`${BASE}/agent/research`, {
      method: 'POST',
      body: JSON.stringify({ query, txHash }),
      timeoutMs: AGENT_REQUEST_TIMEOUT_MS,
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
      headers: authHeaders(),
      body: JSON.stringify(payload),
    }).then((r) => r.dataset),
};
