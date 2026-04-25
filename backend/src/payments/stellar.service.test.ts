import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  mockTransactionCall,
  mockOperationCall,
  mockTransaction,
  mockTransactions,
  mockForTransaction,
  mockOperations,
} = vi.hoisted(() => {
  const transactionCall = vi.fn();
  const operationCall = vi.fn();
  const transaction = vi.fn(() => ({ call: transactionCall }));
  const transactions = vi.fn(() => ({ transaction }));
  const forTransaction = vi.fn(() => ({ call: operationCall }));
  const operations = vi.fn(() => ({ forTransaction }));

  return {
    mockTransactionCall: transactionCall,
    mockOperationCall: operationCall,
    mockTransaction: transaction,
    mockTransactions: transactions,
    mockForTransaction: forTransaction,
    mockOperations: operations,
  };
});

vi.mock('@stellar/stellar-sdk', () => {
  class MockServer {
    transactions = mockTransactions;
    operations = mockOperations;
  }

  return {
    Horizon: {
      Server: MockServer,
    },
  };
});

import { verifyStellarPayment } from './stellar.service';

const destinationAddress = `G${'A'.repeat(55)}`;

describe('verifyStellarPayment', () => {
  beforeEach(() => {
    mockTransactionCall.mockReset();
    mockOperationCall.mockReset();
    mockTransaction.mockClear();
    mockTransactions.mockClear();
    mockForTransaction.mockClear();
    mockOperations.mockClear();
  });

  it('returns valid for matching recent USDC payment', async () => {
    mockTransactionCall.mockResolvedValue({
      created_at: new Date().toISOString(),
      memo: 'haz-test',
    });
    mockOperationCall.mockResolvedValue({
      records: [
        {
          type: 'payment',
          to: destinationAddress,
          asset_code: 'USDC',
          amount: '1.0000',
        },
      ],
    });

    const result = await verifyStellarPayment({
      txHash: 'tx-valid',
      expectedAmount: 1,
      destinationAddress,
    });

    expect(result.valid).toBe(true);
    expect(result.actualAmount).toBe(1);
    expect(result.memo).toBe('haz-test');
  });

  it('returns invalid for expired transactions', async () => {
    const oldDate = new Date(Date.now() - 301_000).toISOString();
    mockTransactionCall.mockResolvedValue({
      created_at: oldDate,
      memo: '',
    });
    mockOperationCall.mockResolvedValue({
      records: [
        {
          type: 'payment',
          to: destinationAddress,
          asset_code: 'USDC',
          amount: '1.0000',
        },
      ],
    });

    const result = await verifyStellarPayment({
      txHash: 'tx-expired',
      expectedAmount: 1,
      destinationAddress,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('expired');
  });

  it('returns invalid for amount mismatch', async () => {
    mockTransactionCall.mockResolvedValue({
      created_at: new Date().toISOString(),
      memo: '',
    });
    mockOperationCall.mockResolvedValue({
      records: [
        {
          type: 'payment',
          to: destinationAddress,
          asset_code: 'USDC',
          amount: '0.7000',
        },
      ],
    });

    const result = await verifyStellarPayment({
      txHash: 'tx-amount-mismatch',
      expectedAmount: 1,
      destinationAddress,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Amount mismatch');
    expect(result.actualAmount).toBe(0.7);
  });

  it('returns invalid for non-USDC (native XLM) payments', async () => {
    mockTransactionCall.mockResolvedValue({
      created_at: new Date().toISOString(),
      memo: '',
    });
    mockOperationCall.mockResolvedValue({
      records: [
        {
          type: 'payment',
          to: destinationAddress,
          asset_type: 'native',
          amount: '1.0000',
        },
      ],
    });

    const result = await verifyStellarPayment({
      txHash: 'tx-native-asset',
      expectedAmount: 1,
      destinationAddress,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('No USDC payment found');
  });

  it('returns transaction-not-found for 404 Horizon responses', async () => {
    mockTransactionCall.mockRejectedValue({
      response: { status: 404 },
    });

    const result = await verifyStellarPayment({
      txHash: 'tx-not-found',
      expectedAmount: 1,
      destinationAddress,
    });

    expect(result.valid).toBe(false);
    expect(result.reason).toContain('Transaction not found');
  });

  it('rethrows unexpected Horizon errors', async () => {
    mockTransactionCall.mockRejectedValue(new Error('network unavailable'));

    await expect(
      verifyStellarPayment({
        txHash: 'tx-network-error',
        expectedAmount: 1,
        destinationAddress,
      }),
    ).rejects.toThrow('network unavailable');
  });
});
