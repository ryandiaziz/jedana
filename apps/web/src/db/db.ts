import Dexie, { type EntityTable } from 'dexie';
import { type Wallet, type Transaction, type Tag, type TransactionTag } from '@jedana/shared';

export type { Wallet, Transaction, Tag, TransactionTag };

const db = new Dexie('JedanaDB_v2') as Dexie & {
  wallets: EntityTable<Wallet, 'id'>;
  transactions: EntityTable<Transaction, 'id'>;
  tags: EntityTable<Tag, 'id'>;
  transaction_tags: EntityTable<TransactionTag, 'id'>;
};

// Define database schema and indexes
// We start fresh at version 1 for JedanaDB_v2
db.version(1).stores({
  wallets: 'id, name, createdAt',
  transactions: 'id, walletId, type, date, payee',
  tags: 'id, name, isArchived',
  transaction_tags: 'id, transactionId, tagId'
});

export { db };
