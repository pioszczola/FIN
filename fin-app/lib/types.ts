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

export interface UserSettings {
  defaultCurrency: string;
}
