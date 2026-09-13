import { describe, it, expect, beforeEach } from 'vitest';
import {
  detectSpendingAnomalies,
  getDismissedAnomalyIds,
  dismissAnomaly,
} from './anomaly.service';

describe('anomaly.service', () => {
  beforeEach(() => {
    const store: Record<string, string> = {};
    (globalThis as unknown as { localStorage: Storage }).localStorage = {
      getItem: (key: string) => store[key] || null,
      setItem: (key: string, val: string) => {
        store[key] = val;
      },
      removeItem: (key: string) => {
        delete store[key];
      },
      clear: () => {
        for (const k in store) delete store[k];
      },
      length: 0,
      key: () => null,
    };
  });

  const refDate = new Date(2026, 8, 15, 15, 0); // 15 Sep 2026

  it('does not flag anomalies when spending is normal or insufficient baseline', () => {
    const txs = [
      {
        id: '1',
        type: 'EXPENSE',
        amount: 50000,
        date: new Date(2026, 8, 15, 10, 0).getTime(),
      },
    ];
    const anomalies = detectSpendingAnomalies(txs, refDate);
    expect(anomalies).toHaveLength(0);
  });

  it('detects a daily spending spike when today expense is >= 2.5x historical average', () => {
    const txs: Array<{ id: string; type: string; amount: number; date: number }> = [];

    // 10 historical days with ~50k spending each day
    for (let day = 1; day <= 10; day++) {
      txs.push({
        id: `prev-${day}`,
        type: 'EXPENSE',
        amount: 50000,
        date: new Date(2026, 8, day, 12, 0).getTime(),
      });
    }

    // Today (15 Sep): 500,000 IDR (10x historical average)
    txs.push({
      id: 'today-1',
      type: 'EXPENSE',
      amount: 500000,
      date: new Date(2026, 8, 15, 11, 0).getTime(),
    });

    const anomalies = detectSpendingAnomalies(txs, refDate);
    expect(anomalies.some((a) => a.type === 'DAILY_SPIKE')).toBe(true);
    const spike = anomalies.find((a) => a.type === 'DAILY_SPIKE')!;
    expect(spike.amount).toBe(500000);
    expect(spike.ratio).toBeGreaterThan(2.5);
  });

  it('detects an unusual single outlier expense transaction', () => {
    const txs: Array<{ id: string; type: string; amount: number; date: number; payee?: string }> = [];

    // 8 normal transactions averaging 40k each
    for (let i = 1; i <= 8; i++) {
      txs.push({
        id: `h-${i}`,
        type: 'EXPENSE',
        amount: 40000,
        date: new Date(2026, 8, i, 10, 0).getTime(),
        payee: 'Warung Kopi',
      });
    }

    // Extreme single transaction today
    txs.push({
      id: 'luxury-item',
      type: 'EXPENSE',
      amount: 1500000,
      date: new Date(2026, 8, 15, 14, 0).getTime(),
      payee: 'Gadget Store',
    });

    const anomalies = detectSpendingAnomalies(txs, refDate);
    expect(anomalies.some((a) => a.type === 'UNUSUAL_TRANSACTION')).toBe(true);
    const outlier = anomalies.find((a) => a.type === 'UNUSUAL_TRANSACTION')!;
    expect(outlier.id).toContain('luxury-item');
    expect(outlier.description).toContain('Gadget Store');
  });

  it('manages dismissed anomaly IDs in localStorage correctly', () => {
    expect(getDismissedAnomalyIds().size).toBe(0);

    dismissAnomaly('spike-2026-09-15');
    expect(getDismissedAnomalyIds().has('spike-2026-09-15')).toBe(true);

    dismissAnomaly('outlier-123');
    const set = getDismissedAnomalyIds();
    expect(set.has('spike-2026-09-15')).toBe(true);
    expect(set.has('outlier-123')).toBe(true);
  });
});
