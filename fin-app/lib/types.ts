export interface Asset {
  id: string;
  name: string;
  amount: number;
  currency: string;
  createdAt: number;
}

export interface Expense {
  id: string;
  name: string;
  amount: number;
  done: boolean;
  createdAt: number;
}

export interface BalanceSnapshot {
  id: string;
  timestamp: number;
  netBalance: number;
  currency: string;
}

export interface SnapshotSchedule {
  enabled: boolean;
  frequency: 'daily' | 'weekly' | 'monthly';
  hour: number;
  minute: number;
  weekday?: number; // 1–7, Sunday=1; used when frequency='weekly'
  dayOfMonth?: number; // 1–28; used when frequency='monthly'
}

export interface UserSettings {
  defaultCurrency: string;
  language: 'en' | 'pl';
  snapshotSchedule?: SnapshotSchedule;
}
