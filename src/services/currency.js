import { db } from '../db/db';
import { format } from 'date-fns';

const BASE_URL = 'https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies';

// Currencies to support
export const CURRENCIES = {
    USD: 'USD',
    EUR: 'EUR',
    PLN: 'PLN',
    UAH: 'UAH',
    LKR: 'LKR', // Sri Lankan Rupee
};

export const CurrencyService = {
    async getRate(fromCurrency, toCurrency, date) {
        if (fromCurrency === toCurrency) return 1;

        // Normalize date to YYYY-MM-DD
        const dateStr = format(date, 'yyyy-MM-dd');

        // Check DB first
        // We store rates relative to USD in the DB
        // e.g. { date: '2023-05-01', currency: 'EUR', rateToUSD: 1.1 } (1 EUR = 1.1 USD)
        // Or maybe store USD based rates: { date: '...', currency: 'EUR', rate: 0.9 } (1 USD = 0.9 EUR)
        // Let's stick to: How much 1 unit of CURRENCY is worth in USD.

        // Wait, standard APIs usually give 1 USD = X Currency.
        // Let's store "rateToUSD" as: Value of 1 USD in that currency. 
        // So if 1 USD = 39 UAH, rateToUSD = 39.

        const usdToFrom = await this.getUsdRate(fromCurrency, dateStr);
        const usdToTo = await this.getUsdRate(toCurrency, dateStr);

        if (!usdToFrom || !usdToTo) {
            console.warn(`Rates not found for ${dateStr}`);
            return null;
        }

        // Convert 'from' to USD, then USD to 'to'
        // Amount in USD = AmountInFrom / usdToFrom
        // Amount in To = AmountInUSD * usdToTo
        // Rate = AmountInTo / AmountInFrom = usdToTo / usdToFrom

        return usdToTo / usdToFrom;
    },

    async getUsdRate(currency, dateStr) {
        if (currency === 'USD') return 1;

        // Check local DB
        const cached = await db.rates.get({ date: dateStr, currency });
        if (cached) return cached.rateToUSD;

        // Fetch from API if online
        if (navigator.onLine) {
            try {
                // This API structure is usually /date/currencies/usd.json
                // Or /latest/currencies/usd.json
                // fawazahmed0 API supports dates.
                // https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@{date}/v1/currencies/usd.json

                // Construct URL for historical date
                const url = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@${dateStr}/v1/currencies/usd.json`;

                const response = await fetch(url);
                if (!response.ok) throw new Error('Network response was not ok');

                const data = await response.json();
                // data.usd contains rates where 1 USD = X Currency

                const rate = data.usd[currency.toLowerCase()];
                if (rate) {
                    await db.rates.put({ date: dateStr, currency, rateToUSD: rate });
                    return rate;
                }
            } catch (e) {
                console.error('Failed to fetch rates', e);
            }
        }

        // Fallback? Maybe try to find closest date?
        // For now, return null
        return null;
    }
};
