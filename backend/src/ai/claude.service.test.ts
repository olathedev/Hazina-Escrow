import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockCreate = vi.fn();

vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: mockCreate,
    },
  })),
}));

import {
  generateDataSummary,
  parseClaudeSummaryResponse,
  stripMarkdownFence,
} from './claude.service';

describe('stripMarkdownFence', () => {
  it('removes fenced markdown wrappers', () => {
    const raw = '```markdown\nExecutive summary text\n```';
    expect(stripMarkdownFence(raw)).toBe('Executive summary text');
  });
});

describe('parseClaudeSummaryResponse', () => {
  it('extracts summary and answer sections when buyer question exists', () => {
    const responseText =
      'Data shows steady growth across wallets.\n\nAnswer: Wallet A outperformed by 18%.';
    const parsed = parseClaudeSummaryResponse(responseText, true);

    expect(parsed.summary).toBe('Data shows steady growth across wallets.');
    expect(parsed.answer).toBe('Wallet A outperformed by 18%.');
  });

  it('returns cleaned summary only when no buyer question exists', () => {
    const responseText = '```text\nThree sentence executive summary.\n```';
    const parsed = parseClaudeSummaryResponse(responseText, false);

    expect(parsed).toEqual({ summary: 'Three sentence executive summary.' });
  });
});

describe('generateDataSummary', () => {
  beforeEach(() => {
    mockCreate.mockReset();
  });

  it('parses fenced output returned by Claude', async () => {
    mockCreate.mockResolvedValue({
      content: [
        {
          type: 'text',
          text: '```markdown\nSummary line one.\n\nAnswer: A concise answer.\n```',
        },
      ],
    });

    const result = await generateDataSummary({ rows: [1, 2, 3] }, 'What changed?');
    expect(result.summary).toBe('Summary line one.');
    expect(result.answer).toBe('A concise answer.');
  });
});
