import type { TransactionWithTags } from './transaction.service';

/**
 * Escapes a cell value according to RFC 4180 CSV standard.
 * If value contains quotes, commas, or newlines, wrap in quotes and escape internal quotes as "".
 */
export function escapeCSV(value: string | number | null | undefined): string {
  if (value === null || value === undefined) return '';
  const str = String(value);
  if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Formats unix timestamp (ms) to YYYY-MM-DD HH:mm.
 */
export function formatCSVDate(timestamp: number): string {
  const d = new Date(timestamp);
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const min = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd} ${hh}:${min}`;
}

export interface ExportOptions {
  filename?: string;
  walletMap?: Map<string, string>;
}

/**
 * Converts transaction list into RFC 4180 compliant CSV text.
 */
export function generateTransactionsCSV(
  transactions: TransactionWithTags[],
  walletMap?: Map<string, string>
): string {
  const headers = ['Date', 'Type', 'Amount', 'Currency', 'Wallet', 'Payee', 'Tags', 'Note', 'Status'];

  const rows = transactions.map((tx) => {
    const dateStr = formatCSVDate(tx.date);
    const typeStr = tx.type;
    const amountStr = tx.amount;
    const currencyStr = 'IDR';
    const walletName = (walletMap && tx.walletId && walletMap.get(tx.walletId)) || tx.walletId || '';
    const payeeStr = tx.payee || '';
    const tagsStr = (tx.tags || []).map((t) => t.name).join('; ');
    const noteStr = tx.note || '';
    const statusStr = tx.isVoided ? 'Voided' : 'Active';

    return [
      escapeCSV(dateStr),
      escapeCSV(typeStr),
      escapeCSV(amountStr),
      escapeCSV(currencyStr),
      escapeCSV(walletName),
      escapeCSV(payeeStr),
      escapeCSV(tagsStr),
      escapeCSV(noteStr),
      escapeCSV(statusStr),
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\r\n');
}

/**
 * Triggers client-side browser download of the CSV file with UTF-8 BOM.
 */
export function downloadCSV(csvContent: string, filename: string): void {
  // Prepend \uFEFF BOM for Excel compatibility
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * High-level export function that generates and triggers download for transactions.
 */
export function exportTransactionsToCSV(
  transactions: TransactionWithTags[],
  options?: ExportOptions
): void {
  const defaultDateStr = new Date().toISOString().slice(0, 10);
  const filename = options?.filename || `jedana-transactions-${defaultDateStr}.csv`;
  const csv = generateTransactionsCSV(transactions, options?.walletMap);
  downloadCSV(csv, filename);
}
