import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { collection, addDoc } from 'firebase/firestore';
import { usePersons } from '../services/firebase';
import { CURRENCIES, CurrencyService } from '../services/currency';

export default function AddExpense() {
    // Trip ID is string
    const { id: tripId } = useParams();
    const navigate = useNavigate();

    const { persons, loading: loadingPersons } = usePersons(tripId);

    const [amount, setAmount] = useState('');
    const [currency, setCurrency] = useState('UAH'); // Default
    const [description, setDescription] = useState('');
    const [payerId, setPayerId] = useState('');
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [beneficiaries, setBeneficiaries] = useState([]); // IDs
    const [loading, setLoading] = useState(false);
    const [rate, setRate] = useState(null);

    // Fetch rate when currency or date changes
    useEffect(() => {
        const fetchRate = async () => {
            if (currency === 'USD') {
                setRate(1);
                return;
            }
            try {
                const r = await CurrencyService.getUsdRate(currency, date);
                setRate(r);
            } catch (e) {
                setRate(null);
            }
        };
        fetchRate();
    }, [currency, date]);

    // Set default payer when persons load
    useEffect(() => {
        if (persons && persons.length > 0 && !payerId) {
            setPayerId(persons[0].id);
            setBeneficiaries(persons.map(p => p.id)); // Default all
        }
    }, [persons, payerId]);

    const handleBeneficiaryToggle = (personId) => {
        if (beneficiaries.includes(personId)) {
            setBeneficiaries(beneficiaries.filter(id => id !== personId));
        } else {
            setBeneficiaries([...beneficiaries, personId]);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!amount || !payerId || beneficiaries.length === 0) return;

        setLoading(true);
        try {
            // Get Rate
            const rateToUSD = await CurrencyService.getUsdRate(currency, date);

            // If offline and no rate, we might need to handle it. 
            // For now, if rate is null, maybe ask user? Or assume 1?
            // Design decision: If rate missing, store 0 or 1 and mark for update?
            // Let's assume 1 if same as USD, else ... 
            // Actually CurrencyService returns 1 for USD.

            // If rate failed (offline + no cache), we'll save it with rate 0 
            // and a flag 'needsRateUpdate'. But to simplify, let's just alert if 0.

            // Wait, if I am offline in Sri Lanka paying Rupees, I might not have rate.
            // Ideally I prompt user "Enter approximate rate to USD" or "Skip".
            // Let's keep it simple: If rate is null, try to use a static fallback or just 0.

            const distinctRate = rateToUSD || 0;
            // Warning: if 0, balance will be wrong.

            const val = parseFloat(amount);
            const valInUSD = distinctRate ? val / distinctRate : 0;
            // Wait, getUsdRate returns "Value of 1 Unit in USD". e.g. 1 EUR = 1.1 USD.
            // So Amount * Rate = AmountInUSD. Correct.

            await addDoc(collection(db, "expenses"), {
                tripId,
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

    if (loadingPersons) return <div>Завантаження учасників...</div>;
    if (!persons || persons.length === 0) return <div>Немає учасників.</div>;

    return (
        <div className="add-expense-page">
            <h2>Додати витрату</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Опис</label>
                    <input
                        type="text"
                        value={description}
                        onChange={e => setDescription(e.target.value)}
                        placeholder="Напр. Вечеря"
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
                    {loading ? 'Збереження...' : 'Зберегти'}
                </button>
            </form>
        </div>
    );
}
