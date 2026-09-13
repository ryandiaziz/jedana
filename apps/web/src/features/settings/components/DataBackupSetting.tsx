import { useState } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Download, FileSpreadsheet, Check, Loader2 } from 'lucide-react';
import { db, type Tag } from '../../../db/db';
import { exportTransactionsToCSV } from '../../transactions/services/export.service';
import type { TransactionWithTags } from '../../transactions/services/transaction.service';

export function DataBackupSetting() {
  const [isExporting, setIsExporting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const txCount = useLiveQuery(async () => {
    return db.transactions.count();
  }, []);

  const handleExportAll = async () => {
    try {
      setIsExporting(true);
      const [txs, wallets, tags, txTags] = await Promise.all([
        db.transactions.toArray(),
        db.wallets.toArray(),
        db.tags.toArray(),
        db.transaction_tags.toArray(),
      ]);

      const tagMap = new Map<string, Tag>();
      tags.forEach((t) => {
        if (t.id) tagMap.set(t.id, t);
      });

      const walletMap = new Map<string, string>();
      wallets.forEach((w) => {
        if (w.id) walletMap.set(w.id, w.name);
      });

      const fullTxs: TransactionWithTags[] = txs.map((tx) => {
        const associatedTagIds = txTags
          .filter((tt) => tt.transactionId === tx.id && !tt.isDeleted)
          .map((tt) => tt.tagId);
        const attachedTags = associatedTagIds
          .map((id) => tagMap.get(id))
          .filter((t): t is Tag => !!t && !t.isDeleted);
        return { ...tx, tags: attachedTags };
      });

      fullTxs.sort((a, b) => b.date - a.date);

      const todayStr = new Date().toISOString().slice(0, 10);
      exportTransactionsToCSV(fullTxs, {
        filename: `jedana-all-transactions-${todayStr}.csv`,
        walletMap,
      });

      setIsSuccess(true);
      setTimeout(() => setIsSuccess(false), 2500);
    } catch (err) {
      console.error('Failed to export transactions:', err);
      alert('Failed to export transactions. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
          <FileSpreadsheet size={16} />
        </div>
        <div>
          <h2 className="text-sm font-bold tracking-tight text-foreground">Data & Backup</h2>
          <p className="text-xs text-muted-foreground">
            Export all transaction history into RFC 4180 CSV spreadsheet format
          </p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3.5 bg-muted/40 border border-border/50 rounded-xl">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-foreground">Full Transaction Export</span>
          <span className="text-[11px] text-muted-foreground font-mono font-tabular">
            {txCount !== undefined ? `${txCount} total local records` : 'Calculating...'}
          </span>
        </div>

        <button
          onClick={handleExportAll}
          disabled={isExporting || txCount === 0}
          className="flex items-center justify-center gap-2 px-4 py-2.5 min-h-[44px] bg-primary text-primary-foreground text-xs font-semibold rounded-xl hover:bg-primary/90 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer shadow-xs"
        >
          {isExporting ? (
            <>
              <Loader2 size={14} className="animate-spin" />
              <span>Exporting...</span>
            </>
          ) : isSuccess ? (
            <>
              <Check size={14} className="text-success" />
              <span>Exported!</span>
            </>
          ) : (
            <>
              <Download size={14} />
              <span>Export All to CSV</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}
