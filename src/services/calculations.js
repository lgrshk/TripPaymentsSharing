
/**
 * Calculates the balance for a trip.
 * @param {Array} expenses - List of expenses with amountInBase (or amountInUSD when amountKey is 'amountInUSD').
 * @param {Array} persons - List of persons involved in the trip.
 * @param {string} [amountKey='amountInBase'] - Field to use for amount ('amountInBase' or 'amountInUSD').
 * @returns {Object} balances - Map of personId -> amount (positive = owed, negative = owe).
 */
export function calculateBalances(expenses, persons, amountKey = 'amountInBase') {
    const balances = {};

    // Initialize balances
    persons.forEach(p => balances[p.id] = 0);

    expenses.forEach(expense => {
        const payerId = expense.payerId;
        const amount = expense[amountKey] ?? expense.amountInUSD ?? 0;
        const beneficiaries = expense.beneficiaryIds || [];

        if (beneficiaries.length === 0) return;

        const splitAmount = amount / beneficiaries.length;

        // Payer paid the full amount, so they are "owed" that amount relative to the group
        // But to simplify, we subtract from beneficiaries and add to payer.

        beneficiaries.forEach(benId => {
            // If payer is also a beneficiary, it cancels out for that portion.
            if (benId !== payerId) {
                balances[benId] -= splitAmount;
                balances[payerId] += splitAmount;
            }
        });
    });

    return balances;
}

/**
 * Optimizes debt settlements to minimize transactions.
 * @param {Object} balances - Map of personId -> net amount.
 * @returns {Array} settlements - List of { from: personId, to: personId, amount: number }.
 */
export function optimizeSettlements(balances) {
    let debtors = [];
    let creditors = [];

    Object.entries(balances).forEach(([id, amount]) => {
        // Round to 2 decimals to avoid floating point issues
        const rounded = Math.round(amount * 100) / 100;
        if (rounded < -0.01) debtors.push({ id, amount: rounded });
        if (rounded > 0.01) creditors.push({ id, amount: rounded });
    });

    debtors.sort((a, b) => a.amount - b.amount); // Ascending (most negative first)
    creditors.sort((a, b) => b.amount - a.amount); // Descending (most positive first)

    const settlements = [];

    let i = 0; // debtors index
    let j = 0; // creditors index

    while (i < debtors.length && j < creditors.length) {
        const debtor = debtors[i];
        const creditor = creditors[j];

        const amount = Math.min(Math.abs(debtor.amount), creditor.amount);

        settlements.push({
            from: debtor.id,
            to: creditor.id,
            amount: Number(amount.toFixed(2))
        });

        debtor.amount += amount;
        creditor.amount -= amount;

        if (Math.abs(debtor.amount) < 0.01) i++;
        if (Math.abs(creditor.amount) < 0.01) j++;
    }

    return settlements;
}
