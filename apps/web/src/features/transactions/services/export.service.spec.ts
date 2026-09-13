import { describe, it, expect } from 'vitest';
import {
  escapeCSV,
  formatCSVDate,
  generateTransactionsCSV,
} from './export.service';
import type { TransactionWithTags } from './transaction.service';

describe('export.service', () => {
  it('correctly escapes CSV special characters (quotes, commas, newlines)', () => {
    expect(escapeCSV('simple')).toBe('simple');
    expect(escapeCSV('hello, world')).toBe('"hello, world"');
    expect(escapeCSV('say "hello"')).toBe('"say ""hello"""');
    expect(escapeCSV('line1\nline2')).toBe('"line1\nline2"');
    expect(escapeCSV(12345)).toBe('12345');
    expect(escapeCSV(null)).toBe('');
    expect(escapeCSV(undefined)).toBe('');
  });

  it('formats timestamp to YYYY-MM-DD HH:mm', () => {
    const ts = new Date(2026, 4, 15, 14, 30).getTime();
    expect(formatCSVDate(ts)).toBe('2026-05-15 14:30');
  });

  it('generates proper RFC 4180 CSV header and rows', () => {
    const mockTxs: TransactionWithTags[] = [
      {
        id: 'tx-1',
        walletId: 'w-1',
        type: 'EXPENSE',
        amount: 50000,
        date: new Date(2026, 8, 10, 12, 0).getTime(),
        note: 'Lunch, coffee & snacks',
        payee: 'Starbucks "Special"',
        createdAt: 1000,
        tags: [
          { id: 't1', name: 'Food', isArchived: false, createdAt: 100, updatedAt: 100 },
          { id: 't2', name: 'Coffee', isArchived: false, createdAt: 100, updatedAt: 100 },
        ],
      },
      {
        id: 'tx-2',
        walletId: 'w-2',
        type: 'INCOME',
        amount: 5000000,
        date: new Date(2026, 8, 1, 9, 0).getTime(),
        note: 'Salary',
        payee: 'Company Inc',
        createdAt: 1000,
        tags: [],
      },
    ];

    const walletMap = new Map([
      ['w-1', 'BCA'],
      ['w-2', 'Mandiri'],
    ]);

    const csv = generateTransactionsCSV(mockTxs, walletMap);
    const lines = csv.split('\r\n');

    expect(lines[0]).toBe('Date,Type,Amount,Currency,Wallet,Payee,Tags,Note,Status');
    expect(lines[1]).toContain('EXPENSE,50000,IDR,BCA,"Starbucks ""Special""",Food; Coffee,"Lunch, coffee & snacks",Active');
    expect(lines[2]).toContain('INCOME,5000000,IDR,Mandiri,Company Inc,,Salary,Active');
  });
});
