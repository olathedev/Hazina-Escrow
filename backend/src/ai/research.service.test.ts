import { describe, expect, it } from 'vitest';
import { parseBudget, parseRiskTolerance } from './research.service';

describe('parseRiskTolerance', () => {
  it('returns low for low-risk synonyms', () => {
    expect(parseRiskTolerance('Need a safe and conservative strategy')).toBe('low');
    expect(parseRiskTolerance('Show me LOW RISK vaults')).toBe('low');
  });

  it('returns high for aggressive/degen language', () => {
    expect(parseRiskTolerance('I want aggressive yield plays')).toBe('high');
    expect(parseRiskTolerance('Give me degen opportunities')).toBe('high');
  });

  it('defaults to medium when no clear risk signal exists', () => {
    expect(parseRiskTolerance('Find balanced opportunities for me')).toBe('medium');
  });
});

describe('parseBudget', () => {
  it('parses comma-separated budget values', () => {
    expect(parseBudget('Best low risk USDC yield with $1,250 budget')).toBe(1250);
  });

  it('parses decimal values and rounds to nearest whole USDC', () => {
    expect(parseBudget('Allocate 99.6 USDC to this strategy')).toBe(100);
  });

  it('falls back to default when no budget is found', () => {
    expect(parseBudget('Find safe stablecoin pools')).toBe(500);
  });
});
