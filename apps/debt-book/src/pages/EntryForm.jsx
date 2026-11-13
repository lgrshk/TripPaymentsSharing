import { useState } from 'react';
import {
    CURRENCIES,
    DEFAULT_CURRENCY,
    ENTRY_TYPES,
} from '../utils/balance';

const todayInputValue = () => new Date().toISOString().slice(0, 10);

export default function EntryForm({
    initial,
    onSubmit,
    onCancel,
    submitLabel = 'Зберегти',
}) {
    const [type, setType] = useState(initial?.type || 'lend');
    const [amount, setAmount] = useState(
        initial?.amount != null ? String(initial.amount) : ''
    );
    const [currency, setCurrency] = useState(initial?.currency || DEFAULT_CURRENCY);
    const [date, setDate] = useState(
        initial?.date ? String(initial.date).slice(0, 10) : todayInputValue()
    );
    const [description, setDescription] = useState(initial?.description || '');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const handleSubmit = async (event) => {
        event.preventDefault();
        const value = Number(String(amount).replace(',', '.'));
        if (!Number.isFinite(value) || value <= 0) {
            setError('Вкажіть додатну суму.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            await onSubmit({
                type,
                amount: value,
                currency,
                date: new Date(date).toISOString(),
                description: description.trim(),
            });
        } catch (err) {
            console.error(err);
            setError('Не вдалося зберегти запис.');
            setBusy(false);
            return;
        }
        setBusy(false);
    };

    return (
        <form className="entry-form" onSubmit={handleSubmit}>
            <div className="form-group">
                <label htmlFor="entry-type">Тип</label>
                <select
                    id="entry-type"
                    value={type}
                    onChange={(e) => setType(e.target.value)}
                >
                    {Object.entries(ENTRY_TYPES).map(([key, meta]) => (
                        <option key={key} value={key}>
                            {meta.label}
                        </option>
                    ))}
                </select>
            </div>

            <div className="form-row">
                <div className="form-group">
                    <label htmlFor="entry-amount">Сума</label>
                    <input
                        id="entry-amount"
                        type="number"
                        inputMode="decimal"
                        min="0"
                        step="0.01"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </div>
                <div className="form-group">
                    <label htmlFor="entry-currency">Валюта</label>
                    <select
                        id="entry-currency"
                        value={currency}
                        onChange={(e) => setCurrency(e.target.value)}
                    >
                        {CURRENCIES.map((c) => (
                            <option key={c} value={c}>
                                {c}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div className="form-group">
                <label htmlFor="entry-date">Дата</label>
                <input
                    id="entry-date"
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    required
                />
            </div>

            <div className="form-group">
                <label htmlFor="entry-desc">Опис</label>
                <input
                    id="entry-desc"
                    type="text"
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Необовʼязково"
                />
            </div>

            {error ? <p className="form-error">{error}</p> : null}

            <div className="form-actions">
                {onCancel ? (
                    <button type="button" className="secondary-button" onClick={onCancel}>
                        Скасувати
                    </button>
                ) : null}
                <button type="submit" className="primary-button" disabled={busy}>
                    {busy ? 'Збереження...' : submitLabel}
                </button>
            </div>
        </form>
    );
}
