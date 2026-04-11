import { useParams, Link } from 'react-router-dom';
import { useTrip, usePersons, useExpenses, useFamilies } from '../services/firebase';
import { calculateBalances, optimizeSettlements, optimizeFamilyAwareSettlements } from '../services/calculations';
import { CurrencyService } from '../services/currency';
import { useState, useMemo, useEffect } from 'react';

export default function TripDetails() {
    // id is string from URL, which matches Firestore string IDs
    const { id: tripId } = useParams();

    const { trip, loading: loadingTrip } = useTrip(tripId);
    const { persons, loading: loadingPersons } = usePersons(tripId);
    const { expenses, loading: loadingExpenses } = useExpenses(tripId);
    const { families, loading: loadingFamilies } = useFamilies(tripId);

    const [showSettlements, setShowSettlements] = useState(false);
    const [expensesInBase, setExpensesInBase] = useState(null);

    const loading = loadingTrip || loadingPersons || loadingExpenses || loadingFamilies;
    const baseCurrency = trip?.baseCurrency || 'USD';

    // Convert expenses to trip base currency for balance calculation
    useEffect(() => {
        if (!expenses || !trip) {
            setExpensesInBase(null);
            return;
        }
        let cancelled = false;
        CurrencyService.getExpensesInBaseCurrency(expenses, baseCurrency).then((converted) => {
            if (!cancelled) setExpensesInBase(converted);
        });
        return () => { cancelled = true; };
    }, [expenses, trip, baseCurrency]);

    // Detect missing rates and try to fix them in background
    useEffect(() => {
        if (loading || !expenses) return;

        const expensesMissingRate = expenses.filter(e =>
            e.currency !== 'USD' &&
            (!e.exchangeRate || e.exchangeRate === 0 || !e.amountInUSD)
        );

        if (expensesMissingRate.length === 0) return;

        const fixRates = async () => {
            const { CurrencyService } = await import('../services/currency');
            const { doc, updateDoc } = await import('firebase/firestore');
            const { db } = await import('../services/firebase');

            expensesMissingRate.forEach(async (exp) => {
                try {
                    console.log(`Attempting to fix rate for expense ${exp.id} (${exp.currency})`);
                    const rate = await CurrencyService.getUsdRate(exp.currency, exp.date);
                    if (rate && rate > 0) {
                        const valInUSD = exp.amount / rate;
                        await updateDoc(doc(db, "expenses", exp.id), {
                            exchangeRate: rate,
                            amountInUSD: valInUSD
                        });
                        console.log(`Fixed rate for expense ${exp.id}: ${rate}`);
                    }
                } catch (e) {
                    console.warn(`Failed to auto-fix rate for ${exp.id}`, e);
                }
            });
        };

        fixRates();
    }, [expenses, loading]);

    // Calculate balances in base currency (per-person unchanged); settlements optional family merge
    const { settlementsPersonal, settlementsFamily } = useMemo(() => {
        const list = expensesInBase ?? expenses;
        const amountKey = expensesInBase ? 'amountInBase' : 'amountInUSD';
        if (!list || !persons || loading) {
            return { settlementsPersonal: [], settlementsFamily: [] };
        }
        const bal = calculateBalances(list, persons, amountKey);
        const personal = optimizeSettlements(bal);
        const familyAware =
            families && families.length > 0
                ? optimizeFamilyAwareSettlements(bal, families)
                : personal;
        return { settlementsPersonal: personal, settlementsFamily: familyAware };
    }, [expensesInBase, expenses, persons, families, loading]);

    if (loading) return <div>Завантаження...</div>;
    if (!trip) return <div>Подорож не знайдено</div>;

    const getPersonName = (id) => persons?.find(p => p.id == id)?.name || 'Невідомий';

    return (
        <div className="trip-details-page">
            <header style={{ justifyContent: 'space-between' }}>
                <div>
                    <Link to="/" className="back-link">← Назад</Link>
                    <h1 style={{ margin: '0.5rem 0' }}>{trip.name}</h1>
                </div>
                <Link to={`/trip/${tripId}/edit`} style={{ fontSize: '1.5rem', textDecoration: 'none' }}>⚙️</Link>
            </header>

            <div className="balance-summary">
                <h3>Баланс ({baseCurrency})</h3>
                <button className="secondary-button" onClick={() => setShowSettlements(!showSettlements)}>
                    {showSettlements ? 'Приховати розрахунки' : 'Хто кому винен'}
                </button>

                {showSettlements && (
                    <div className="settlements-list">
                        <h4 style={{ margin: '1rem 0 0.5rem', fontSize: '1rem' }}>Персонально</h4>
                        <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                            Якщо кожен розраховується окремо (без об&apos;єднання в сім&apos;ю).
                        </p>
                        {settlementsPersonal.length === 0 ? (
                            <p>Всі розрахувались!</p>
                        ) : (
                            <ul>
                                {settlementsPersonal.map((s, i) => (
                                    <li key={`p-${i}`}>
                                        <strong>{getPersonName(s.from)}</strong> винен <strong>{getPersonName(s.to)}</strong>: {s.amount.toFixed(2)} {baseCurrency}
                                    </li>
                                ))}
                            </ul>
                        )}

                        {families && families.length > 0 && (
                            <>
                                <h4 style={{ margin: '1.25rem 0 0.5rem', fontSize: '1rem' }}>З урахуванням сімей</h4>
                                <p style={{ margin: '0 0 0.75rem', fontSize: '0.85rem', color: '#64748b' }}>
                                    Учасники однієї сім&apos;ї зводяться на вказаного платника; суми між усіма ті самі, що й персонально, змінюється лише схема переказів.
                                </p>
                                {settlementsFamily.length === 0 ? (
                                    <p>Всі розрахувались!</p>
                                ) : (
                                    <ul>
                                        {settlementsFamily.map((s, i) => (
                                            <li key={`f-${i}`}>
                                                <strong>{getPersonName(s.from)}</strong> винен <strong>{getPersonName(s.to)}</strong>: {s.amount.toFixed(2)} {baseCurrency}
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>

            <div className="expenses-list-container">
                <div className="list-header">
                    <h3>Витрати</h3>
                    <Link to={`/trip/${tripId}/add-expense`} className="primary-button small">
                        + Додати
                    </Link>
                </div>

                {!expenses || expenses.length === 0 ? (
                    <p className="empty-state">Немає витрат. Додайте першу!</p>
                ) : (
                    <ul className="expenses-list">
                        {expenses.map(expense => {
                            const inBase = expensesInBase?.find(e => e.id === expense.id);
                            const amountInBase = inBase?.amountInBase;
                            return (
                                <li key={expense.id} className="expense-item">
                                    <Link to={`/trip/${tripId}/expense/${expense.id}`} style={{ display: 'flex', width: '100%', justifyContent: 'space-between', alignItems: 'center' }}>
                                        <div className="expense-date">
                                            {new Date(expense.date).toLocaleDateString('uk-UA', { day: 'numeric', month: 'short' })}
                                        </div>
                                        <div className="expense-details">
                                            <div className="expense-desc">{expense.description}</div>
                                            <div className="expense-payer">
                                                Сплатив: {getPersonName(expense.payerId)}
                                            </div>
                                        </div>
                                        <div className="expense-amount">
                                            {expense.amount} {expense.currency}
                                            <div className="expense-usd">
                                                {amountInBase != null ? `≈ ${amountInBase.toFixed(2)} ${baseCurrency}` : `~ $${expense.amountInUSD?.toFixed(2)}`}
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div >
    );
}
