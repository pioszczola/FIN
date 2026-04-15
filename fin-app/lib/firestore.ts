import {
  collection,
  doc,
  addDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  setDoc,
  getDoc,
  query,
  orderBy,
  Unsubscribe,
} from 'firebase/firestore';
import { db } from './firebase';
import type { Asset, BalanceSnapshot, Expense, UserSettings } from './types';

// --- Assets ---

export function subscribeToAssets(
  userId: string,
  callback: (assets: Asset[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'assets'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Asset)));
  });
}

export async function addAsset(
  userId: string,
  asset: Omit<Asset, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'users', userId, 'assets'), {
    ...asset,
    createdAt: Date.now(),
  });
}

export async function updateAsset(
  userId: string,
  assetId: string,
  updates: Partial<Omit<Asset, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'assets', assetId), updates);
}

export async function deleteAsset(userId: string, assetId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'assets', assetId));
}

// --- Expenses ---

export function subscribeToExpenses(
  userId: string,
  callback: (expenses: Expense[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'expenses'),
    orderBy('createdAt', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as Expense)));
  });
}

export async function addExpense(
  userId: string,
  expense: Omit<Expense, 'id' | 'createdAt'>
): Promise<void> {
  await addDoc(collection(db, 'users', userId, 'expenses'), {
    ...expense,
    createdAt: Date.now(),
  });
}

export async function updateExpense(
  userId: string,
  expenseId: string,
  updates: Partial<Omit<Expense, 'id' | 'createdAt'>>
): Promise<void> {
  await updateDoc(doc(db, 'users', userId, 'expenses', expenseId), updates);
}

export async function deleteExpense(userId: string, expenseId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'expenses', expenseId));
}

// --- Snapshots ---

export async function addSnapshot(
  userId: string,
  snapshot: Omit<BalanceSnapshot, 'id'>
): Promise<void> {
  await addDoc(collection(db, 'users', userId, 'snapshots'), snapshot);
}

export function subscribeToSnapshots(
  userId: string,
  callback: (snapshots: BalanceSnapshot[]) => void
): Unsubscribe {
  const q = query(
    collection(db, 'users', userId, 'snapshots'),
    orderBy('timestamp', 'asc')
  );
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map((d) => ({ id: d.id, ...d.data() } as BalanceSnapshot)));
  });
}

export async function deleteSnapshot(userId: string, snapshotId: string): Promise<void> {
  await deleteDoc(doc(db, 'users', userId, 'snapshots', snapshotId));
}

// --- Settings ---

export async function getSettings(userId: string): Promise<UserSettings> {
  const snap = await getDoc(doc(db, 'users', userId, 'settings', 'prefs'));
  if (snap.exists()) return snap.data() as UserSettings;
  return { defaultCurrency: 'PLN', language: 'en' };
}

export async function saveSettings(
  userId: string,
  settings: UserSettings
): Promise<void> {
  await setDoc(doc(db, 'users', userId, 'settings', 'prefs'), settings);
}

export function subscribeToSettings(
  userId: string,
  callback: (settings: UserSettings) => void
): Unsubscribe {
  const defaults: UserSettings = { defaultCurrency: 'PLN', language: 'en' };
  return onSnapshot(doc(db, 'users', userId, 'settings', 'prefs'), (snap) => {
    if (snap.exists()) {
      callback({ ...defaults, ...snap.data() } as UserSettings);
    } else {
      callback(defaults);
    }
  });
}
