import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, updateDoc, deleteDoc } from 'firebase/firestore';
import { useTrip, useExpense, usePersons } from '../services/firebase';
import { CURRENCIES, CurrencyService } from '../services/currency';

export default function EditExpense() {
    // id is string
    const { id: tripId, expenseId } = useParams();
    const navigate = useNavigate();

    const { trip } = useTrip(tripId);
    const { expense, loading: loadingExpense } = useExpense(expenseId);
    const { persons, loading: loadingPersons } = usePersons(tripId);

    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState(trip?.baseCurrency || 'UAH');
    const [description, setDescription] = useState('');
    const [payerId, setPayerId] = useState('');
    const [date, setDate] = useState('');
    const [beneficiaries, setBeneficiaries] = useState([]);
    const [loading, setLoading] = useState(false);
    const [rate, setRate] = useState(null);

    // Default currency from trip until expense loads
    useEffect(() => {
        if (trip?.baseCurrency && !expense) setCurrency(trip.baseCurrency);
    }, [trip?.baseCurrency, expense]);

    // Fetch rate
    useEffect(() => {
        const fetchRate = async () => {
            if (currency === 'USD') { setRate(1); return; }
            try {
                const r = await CurrencyService.getUsdRate(currency, date);
                setRate(r);
            } catch (e) { setRate(null); }
        };
        if (date) fetchRate();
    }, [currency, date]);

    // Initialize form when expense loads
    useEffect(() => {
        if (expense) {
            setAmount(expense.amount);
            setCurrency(expense.currency);
            setDescription(expense.description);
            setPayerId(expense.payerId);
            setDate(expense.date);
            setBeneficiaries(expense.beneficiaryIds || []);
        }
    }, [expense]);

    const handleBeneficiaryToggle = (personId) => {
        if (beneficiaries.includes(personId)) {
            setBeneficiaries(beneficiaries.filter(id => id !== personId));
        } else {
            setBeneficiaries([...beneficiaries, personId]);
        }
    };

    const handleDelete = async () => {
        if (window.confirm('Видалити цю витрату?')) {
            await deleteDoc(doc(db, "expenses", expenseId));
            navigate(`/trip/${tripId}`);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        try {
            const rateToUSD = await CurrencyService.getUsdRate(currency, date);
            const distinctRate = rateToUSD || 0;
            const val = parseFloat(amount);
            const valInUSD = distinctRate ? val / distinctRate : 0;

            await updateDoc(doc(db, "expenses", expenseId), {
                date,
                amount: val,
                currency,
                payerId, // String ID
                description,
                beneficiaryIds: beneficiaries,
                amountInUSD: valInUSD,
                exchangeRate: distinctRate
            });

            navigate(`/trip/${tripId}`);
        } catch (error) {
            console.error(error);
            alert('Помилка збереження');
        } finally {
            setLoading(false);
        }
    };

    if (loadingExpense || loadingPersons) return <div>Завантаження...</div>;
    if (!expense) return <div>Витрату не знайдено (ID: {expenseId}).</div>;

    return (
        <div className="add-expense-page">
            <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h2>Редагувати витрату</h2>
                <button type="button" onClick={handleDelete} style={{ background: '#ef4444', fontSize: '0.8rem' }}>Видалити</button>
            </header>

            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Опис</label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        required
                    />
                </div>

                <div className="form-amount-row">
                    <div className="form-group">
                        <label>Сума</label>
                        <input
                            type="number"
                            step="0.01"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label>Валюта</label>
                        <select value={currency} onChange={e => setCurrency(e.target.value)}>
                            {Object.keys(CURRENCIES).map(c => (
                                <option key={c} value={c}>{c}</option>
                            ))}
                        </select>
                    </div>
                </div>

                <div className="form-group">
                    <label>Дата</label>
                    <input
                        type="date"
                        value={date}
                        onChange={e => setDate(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Обмінний курс (1 USD)</label>
                    <div style={{ fontSize: '0.9rem', color: '#64748b', background: '#f1f5f9', padding: '0.5rem', borderRadius: '4px' }}>
                        {currency === 'USD' ? '1.00 USD' : (
                            rate ? `~ ${rate} ${currency}` : 'Не знайдено/Завантаження...'
                        )}
                    </div>
                </div>

                <div className="form-group">
                    <label>Хто платив?</label>
                    <select value={payerId} onChange={e => setPayerId(e.target.value)}>
                        {persons.map(p => (
                            <option key={p.id} value={p.id}>{p.name}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>За кого? (Обрано: {beneficiaries.length})</label>
                    <div className="beneficiaries-list">
                        <button type="button" className="small-text-btn" onClick={() => setBeneficiaries(persons.map(p => p.id))}>Всі</button>
                        <button type="button" className="small-text-btn" onClick={() => setBeneficiaries([])}>Ніхто</button>

                        {persons.map(p => (
                            <label key={p.id} className="beneficiary-item">
                                <input
                                    type="checkbox"
                                    checked={beneficiaries.includes(p.id)}
                                    onChange={() => handleBeneficiaryToggle(p.id)}
                                />
                                {p.name}
                            </label>
                        ))}
                    </div>
                </div>

                <button type="submit" className="primary-button" disabled={loading}>
                    {loading ? 'Збереження...' : 'Оновити'}
                </button>
            </form>
        </div>
    );
}
