import Anthropic from '@anthropic-ai/sdk';

export interface ResearchInput {
  userQuery: string;
  budget: number;
  riskTolerance: 'low' | 'medium' | 'high';
  yieldData: Record<string, unknown>;
  whaleData: Record<string, unknown>;
  riskData: Record<string, unknown>;
  sentimentData: Record<string, unknown>;
}

export interface ResearchReport {
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

export async function synthesizeResearch(input: ResearchInput): Promise<ResearchReport> {
  const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
  const prompt = `You are the Hazina Research Agent — an autonomous DeFi yield researcher. You have just purchased data from four specialised on-chain data sellers using micro-payments on Stellar. Synthesise all four datasets into a single, actionable research report for the user.

USER QUERY: "${input.userQuery}"
BUDGET: $${input.budget} USDC
RISK TOLERANCE: ${input.riskTolerance}

---
DATASET 1 — YIELD DATA (purchased for 0.02 USDC):
${JSON.stringify(input.yieldData, null, 2)}

---
DATASET 2 — WHALE WALLET MOVEMENTS (purchased for 0.05 USDC):
${JSON.stringify(input.whaleData, null, 2)}

---
DATASET 3 — RISK SCORES (purchased for 0.03 USDC):
${JSON.stringify(input.riskData, null, 2)}

---
DATASET 4 — MARKET SENTIMENT (purchased for 0.04 USDC):
${JSON.stringify(input.sentimentData, null, 2)}

---
INSTRUCTIONS:
1. Identify the single best USDC yield opportunity that matches the user's risk tolerance and budget.
2. Cross-reference: does whale activity confirm confidence? Does sentiment support? Does risk score match tolerance?
3. Flag any red flags or warnings.
4. Suggest 2 alternatives if the top pick doesn't suit.

Respond ONLY with valid JSON in this exact shape (no markdown fences):
{
  "topOpportunity": {
    "protocol": "Protocol name",
    "vault": "Vault or pool name",
    "chain": "Chain name",
    "apy": 7.2,
    "riskLevel": "Low | Medium | High",
    "whaleConfidence": "High | Medium | Low | Neutral",
    "sentimentScore": "Bullish | Neutral | Bearish"
  },
  "reasoning": "2-3 sentence explanation of why this is the best pick, citing specific data from the datasets",
  "alternatives": ["Alternative 1: brief description", "Alternative 2: brief description"],
  "warnings": ["Warning if any — empty array if none"],
  "rawAnalysis": "Concise paragraph synthesising all four data sources"
}`;

  const response = await client.messages.create({
    model: 'claude-haiku-4-5-20251001',
    max_tokens: 2048,
    messages: [{ role: 'user', content: prompt }],
  });

  const raw = response.content
    .filter((b) => b.type === 'text')
    .map((b) => (b as { type: 'text'; text: string }).text)
    .join('');

  // Strip any accidental markdown fences
  const cleaned = raw.replace(/^```json\s*/i, '').replace(/```\s*$/i, '').trim();

  try {
    const parsed = JSON.parse(cleaned) as ResearchReport;
    return parsed;
  } catch {
    throw new Error(`AI returned invalid JSON. Raw response: ${cleaned.slice(0, 200)}`);
  }
}

/**
 * Parses risk tolerance from a natural-language query.
 * e.g. "medium risk" → 'medium', "low risk" → 'low', default → 'medium'
 */
export function parseRiskTolerance(query: string): 'low' | 'medium' | 'high' {
  const q = query.toLowerCase();
  if (q.includes('low risk') || q.includes('safe') || q.includes('conservative')) return 'low';
  if (q.includes('high risk') || q.includes('aggressive') || q.includes('degen')) return 'high';
  return 'medium';
}

/**
 * Parses a budget in USDC from a natural-language query.
 * e.g. "$500", "500 USDC", "500 budget" → 500
 */
export function parseBudget(query: string): number {
  const match = query.match(/\$?\s*(\d[\d,]*(?:\.\d+)?)\s*(usdc|usd|budget)?/i);
  if (match) {
    const parsed = Number(match[1].replace(/,/g, ''));
    if (Number.isFinite(parsed) && parsed > 0) {
      return Math.round(parsed);
    }
  }
  return 500; // default
}
