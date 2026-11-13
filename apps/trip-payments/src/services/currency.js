import { db } from '../db/db';
import { format } from 'date-fns';

const LOOKBACK_DAYS = 7;

export const CURRENCIES = {
    USD: 'USD',
    EUR: 'EUR',
    PLN: 'PLN',
    UAH: 'UAH',
    LKR: 'LKR',
};

function shiftIsoDate(dateStr, days) {
    const [year, month, day] = dateStr.split('-').map(Number);
    const dt = new Date(year, month - 1, day + days);
    return format(dt, 'yyyy-MM-dd');
}

function rateUrlsFor(dateTag) {
    return [
        `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateTag}/v1/currencies/usd.json`,
        `https://${dateTag}.currency-api.pages.dev/v1/currencies/usd.json`,
    ];
}

async function fetchUsdTable(dateTag) {
    for (const url of rateUrlsFor(dateTag)) {
        try {
            const response = await fetch(url);
            if (!response.ok) continue;
            const data = await response.json();
            if (data?.usd && typeof data.usd === 'object') return data.usd;
        } catch (e) {
            console.warn('Failed to fetch rates from', url, e);
        }
    }
    return null;
}

async function cacheUsdRates(dateStr, usdMap) {
    const codes = Object.keys(CURRENCIES).filter((c) => c !== 'USD');
    await Promise.all(
        codes.map(async (code) => {
            const rate = usdMap[code.toLowerCase()];
            if (rate) {
                await db.rates.put({ date: dateStr, currency: code, rateToUSD: rate });
            }
        })
    );
}

async function getClosestCachedRate(currency, dateStr) {
    const all = await db.rates.toArray();
    const same = all.filter((r) => r.currency === currency && r.rateToUSD > 0);
    if (same.length === 0) return null;
    const target = new Date(`${dateStr}T00:00:00`).getTime();
    same.sort((a, b) => {
        const distA = Math.abs(new Date(`${a.date}T00:00:00`).getTime() - target);
        const distB = Math.abs(new Date(`${b.date}T00:00:00`).getTime() - target);
        return distA - distB;
    });
    return same[0].rateToUSD;
}

export const CurrencyService = {
    async getRate(fromCurrency, toCurrency, date) {
        if (fromCurrency === toCurrency) return 1;

        const dateStr = format(date, 'yyyy-MM-dd');
        const usdToFrom = await this.getUsdRate(fromCurrency, dateStr);
        const usdToTo = await this.getUsdRate(toCurrency, dateStr);

        if (!usdToFrom || !usdToTo) {
            console.warn(`Rates not found for ${dateStr}`);
            return null;
        }

        return usdToTo / usdToFrom;
    },

    async getUsdRate(currency, dateStr) {
        if (currency === 'USD') return 1;
        if (!dateStr) return null;

        const cached = await db.rates.get({ date: dateStr, currency });
        if (cached?.rateToUSD) return cached.rateToUSD;

        if (navigator.onLine) {
            const dateTags = [dateStr];
            for (let i = 1; i <= LOOKBACK_DAYS; i++) {
                dateTags.push(shiftIsoDate(dateStr, -i));
            }
            dateTags.push('latest');

            for (const tag of dateTags) {
                const usdMap = await fetchUsdTable(tag);
                if (!usdMap) continue;
                const rate = usdMap[currency.toLowerCase()];
                if (rate) {
                    await cacheUsdRates(dateStr, usdMap);
                    return rate;
                }
            }
        }

        const fallback = await getClosestCachedRate(currency, dateStr);
        if (fallback) {
            console.warn(`Using closest cached rate for ${currency} on ${dateStr}`);
            return fallback;
        }

        return null;
    },

    /**
     * Converts expenses (with amountInUSD) to trip base currency.
     * Returns new array of expenses with amountInBase added.
     * If baseCurrency is USD, amountInBase = amountInUSD.
     * @param {Array} expenses - Expenses with amountInUSD, date
     * @param {string} baseCurrency - Trip base currency code
     * @returns {Promise<Array>} Expenses with amountInBase
     */
    async getExpensesInBaseCurrency(expenses, baseCurrency) {
        if (!expenses || expenses.length === 0) return [];
        if (baseCurrency === 'USD') {
            return expenses.map((e) => ({ ...e, amountInBase: e.amountInUSD ?? 0 }));
        }
        const uniqueDates = [...new Set(expenses.map((e) => e.date))];
        const rateByDate = {};
        await Promise.all(
            uniqueDates.map(async (d) => {
                const r = await this.getUsdRate(baseCurrency, d);
                rateByDate[d] = r || 0;
            })
        );
        return expenses.map((e) => {
            const rate = rateByDate[e.date] || 0;
            const amountInBase = (e.amountInUSD ?? 0) * rate;
            return { ...e, amountInBase };
        });
    },
};
