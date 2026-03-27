const BASE_URL = 'https://api.frankfurter.app';

// Rates cached with timestamp — refreshed at most once per hour
let ratesCache: { rates: Record<string, number>; fetchedAt: number } | null = null;
let currenciesCache: Record<string, string> | null = null;

/**
 * Returns ECB rates with EUR as base.
 * Rates are relative to 1 EUR — e.g. { PLN: 4.27, CHF: 0.93, USD: 1.08 }
 * To convert X currency to PLN: amount * rates.PLN / rates[X]
 */
export async function getRates(): Promise<Record<string, number>> {
  const now = Date.now();
  if (ratesCache && now - ratesCache.fetchedAt < 60 * 60 * 1000) {
    return ratesCache.rates;
  }
  const res = await fetch(`${BASE_URL}/latest`);
  if (!res.ok) throw new Error('Failed to fetch exchange rates');
  const data = await res.json();
  // Add EUR itself with rate 1
  const rates = { EUR: 1, ...data.rates } as Record<string, number>;
  ratesCache = { rates, fetchedAt: now };
  return rates;
}

/**
 * Converts an amount from any currency to PLN.
 * Falls back to 1:1 if rates not available.
 */
export function toPLN(
  amount: number,
  currency: string,
  rates: Record<string, number>
): number {
  if (currency === 'PLN') return amount;
  const plnRate = rates['PLN'];
  const currRate = rates[currency];
  if (!plnRate || !currRate) return amount;
  return amount * (plnRate / currRate);
}

/**
 * Returns all currencies supported by Frankfurter (ECB).
 */
export async function getCurrencies(): Promise<Record<string, string>> {
  if (currenciesCache) return currenciesCache;
  const res = await fetch(`${BASE_URL}/currencies`);
  if (!res.ok) throw new Error('Failed to fetch currencies');
  currenciesCache = await res.json();
  return currenciesCache!;
}

export function formatPLN(amount: number): string {
  return new Intl.NumberFormat('pl-PL', {
    style: 'currency',
    currency: 'PLN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}
