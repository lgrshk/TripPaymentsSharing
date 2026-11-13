
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

/**
 * For settlement optimization only: merges each family member's net balance into the
 * designated payer's balance and clears non-payers to zero. Does not change per-person
 * balances from expenses — use the original `balances` map for that.
 *
 * @param {Object} balances - personId -> net amount (same shape as calculateBalances output).
 * @param {Array<{ payerPersonId: string, memberPersonIds: string[] }>} families
 * @returns {Object} merged balances copy
 */
export function mergeFamilyBalancesForSettlements(balances, families) {
    const merged = { ...balances };
    if (!families || families.length === 0) return merged;

    for (const fam of families) {
        const payerId = fam.payerPersonId;
        const members = Array.isArray(fam.memberPersonIds) ? fam.memberPersonIds : [];
        if (!payerId || !members.includes(payerId)) continue;

        let shifted = 0;
        for (const memberId of members) {
            if (memberId === payerId) continue;
            shifted += merged[memberId] ?? 0;
            merged[memberId] = 0;
        }
        merged[payerId] = (merged[payerId] ?? 0) + shifted;
    }
    return merged;
}

/**
 * Minimizes transfers after consolidating each family's net position onto the payer.
 * @param {Object} balances - from calculateBalances
 * @param {Array<{ payerPersonId: string, memberPersonIds: string[] }>} families
 */
export function optimizeFamilyAwareSettlements(balances, families) {
    const merged = mergeFamilyBalancesForSettlements(balances, families);
    return optimizeSettlements(merged);
}

/**
 * Equal-split amounts each payer effectively covered for other beneficiaries (same rules as balances).
 * @param {Array} expenses
 * @param {string} [amountKey='amountInBase']
 * @returns {Object<string, Object<string, number>>} payerId -> beneficiaryId -> total
 */
export function calculatePaidForMatrix(expenses, amountKey = 'amountInBase') {
    const matrix = {};
    expenses.forEach(expense => {
        const payerId = expense.payerId;
        const amount = expense[amountKey] ?? expense.amountInUSD ?? 0;
        const beneficiaries = expense.beneficiaryIds || [];
        if (beneficiaries.length === 0) return;

        const splitAmount = amount / beneficiaries.length;
        beneficiaries.forEach(benId => {
            if (benId === payerId) return;
            if (!matrix[payerId]) matrix[payerId] = {};
            matrix[payerId][benId] = (matrix[payerId][benId] || 0) + splitAmount;
        });
    });

    for (const p of Object.keys(matrix)) {
        for (const b of Object.keys(matrix[p])) {
            matrix[p][b] = Math.round(matrix[p][b] * 100) / 100;
        }
    }
    return matrix;
}

function unitKeyForPerson(personId, families) {
    if (!families || families.length === 0) return `person:${personId}`;
    for (const f of families) {
        const members = f.memberPersonIds || [];
        if (members.includes(personId)) return `family:${f.id}`;
    }
    return `person:${personId}`;
}

/**
 * Paid-for totals grouped by family as one unit (internal same-unit flows omitted).
 * Keys are `person:<id>` or `family:<familyDocId>`.
 */
export function calculatePaidForMatrixFamilyUnits(expenses, families, amountKey = 'amountInBase') {
    const matrix = {};
    if (!families || families.length === 0) return matrix;

    expenses.forEach(expense => {
        const payerId = expense.payerId;
        const amount = expense[amountKey] ?? expense.amountInUSD ?? 0;
        const beneficiaries = expense.beneficiaryIds || [];
        if (beneficiaries.length === 0) return;

        const splitAmount = amount / beneficiaries.length;
        const fromU = unitKeyForPerson(payerId, families);

        beneficiaries.forEach(benId => {
            if (benId === payerId) return;
            const toU = unitKeyForPerson(benId, families);
            if (fromU === toU) return;
            if (!matrix[fromU]) matrix[fromU] = {};
            matrix[fromU][toU] = (matrix[fromU][toU] || 0) + splitAmount;
        });
    });

    for (const p of Object.keys(matrix)) {
        for (const b of Object.keys(matrix[p])) {
            matrix[p][b] = Math.round(matrix[p][b] * 100) / 100;
        }
    }
    return matrix;
}

/**
 * @param {Object<string, Object<string, number>>} matrix
 * @returns {{ from: string, to: string, amount: number }[]}
 */
export function paidForMatrixToSortedRows(matrix) {
    const rows = [];
    Object.entries(matrix).forEach(([from, toMap]) => {
        Object.entries(toMap).forEach(([to, amt]) => {
            if (Math.abs(amt) < 0.005) return;
            rows.push({ from, to, amount: amt });
        });
    });
    rows.sort((a, b) => {
        const c1 = a.from.localeCompare(b.from);
        if (c1 !== 0) return c1;
        return a.to.localeCompare(b.to);
    });
    return rows;
}
