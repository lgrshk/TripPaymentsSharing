/** Entry types and how they affect balance (positive = they owe me). */
export const ENTRY_TYPES = {
    lend: { label: "Позичив їм", sign: 1 },
    borrow: { label: "Позичив у них", sign: -1 },
    repay_to_me: { label: "Мені повернули", sign: -1 },
    repay_by_me: { label: "Я повернув", sign: 1 },
};

export const CURRENCIES = ["UAH", "USD", "EUR"];
export const DEFAULT_CURRENCY = "UAH";

export function entrySignedAmount(entry) {
    const amount = Number(entry.amount) || 0;
    const meta = ENTRY_TYPES[entry.type] || ENTRY_TYPES.lend;
    return amount * meta.sign;
}

/** @returns {Record<string, number>} balances by currency */
export function balancesByCurrency(entries) {
    const result = {};
    for (const entry of entries) {
        const currency = entry.currency || DEFAULT_CURRENCY;
        result[currency] = (result[currency] || 0) + entrySignedAmount(entry);
    }
    return result;
}

export function formatMoney(amount, currency = DEFAULT_CURRENCY) {
    const abs = Math.abs(Number(amount) || 0);
    const formatted = abs.toLocaleString("uk-UA", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
    });
    return `${formatted} ${currency}`;
}

export function balanceLabel(amount) {
    if (amount > 0) return "винен мені";
    if (amount < 0) return "я винен";
    return "розраховано";
}
