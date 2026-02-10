import { useParams, Link } from 'react-router-dom';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { calculateBalances, optimizeSettlements } from '../services/calculations';
import { useState, useMemo } from 'react';

export default function TripDetails() {
    const { id } = useParams();
    const tripId = Number(id);

    const trip = useLiveQuery(() => db.trips.get(tripId), [tripId]);
    const persons = useLiveQuery(() => db.persons.where({ tripId }).toArray(), [tripId]);
    const expenses = useLiveQuery(() =>
        db.expenses.where({ tripId }).reverse().sortBy('date'),
        [tripId]
    );

    const [showSettlements, setShowSettlements] = useState(false);

    // Calculate balances
    const { balances, settlements } = useMemo(() => {
        if (!expenses || !persons) return { balances: {}, settlements: [] };
        const bal = calculateBalances(expenses, persons);
        const set = optimizeSettlements(bal);
        return { balances: bal, settlements: set };
    }, [expenses, persons]);

    if (!trip) return <div>Завантаження...</div>;

    const getPersonName = (id) => persons?.find(p => p.id === id)?.name || 'Невідомий';

    return (
        <div className="trip-details-page">
            <header>
                <Link to="/" className="back-link">← Назад</Link>
                <h1>{trip.name}</h1>
            </header>

            <div className="balance-summary">
                <h3>Баланс (USD)</h3>
                <button className="secondary-button" onClick={() => setShowSettlements(!showSettlements)}>
                    {showSettlements ? 'Приховати розрахунки' : 'Хто кому винен'}
                </button>

                {showSettlements && (
                    <div className="settlements-list">
                        {settlements.length === 0 ? <p>Всі розрахувались!</p> : (
                            <ul>
                                {settlements.map((s, i) => (
                                    <li key={i}>
                                        <strong>{getPersonName(s.from)}</strong> винен <strong>{getPersonName(s.to)}</strong>: ${s.amount.toFixed(2)}
                                    </li>
                                ))}
                            </ul>
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
                        {expenses.map(expense => (
                            <li key={expense.id} className="expense-item">
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
                                    <div className="expense-usd">~${expense.amountInUSD?.toFixed(2)}</div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}
