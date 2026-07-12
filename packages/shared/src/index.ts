export interface Wallet {
  id?: string;
  name: string;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface Transaction {
  id?: string;
  walletId: string;
  type: 'INCOME' | 'EXPENSE';
  amount: number;
  date: number; // timestamp
  note: string;
  payee?: string;
  isVoided?: boolean;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface Tag {
  id?: string;
  name: string;
  isArchived: boolean;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}

export interface TransactionTag {
  id?: string;
  transactionId: string;
  tagId: string;
  createdAt: number;
  updatedAt?: number;
  isDeleted?: boolean;
}
