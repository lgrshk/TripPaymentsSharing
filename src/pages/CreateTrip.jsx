import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../db/db';
import { CURRENCIES } from '../services/currency';

export default function CreateTrip() {
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [currency, setCurrency] = useState('USD');
    const [persons, setPersons] = useState(['Я', '']); // Initial 2 persons

    const handleAddPerson = () => {
        setPersons([...persons, '']);
    };

    const handlePersonChange = (index, value) => {
        const newPersons = [...persons];
        newPersons[index] = value;
        setPersons(newPersons);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        try {
            const tripId = await db.trips.add({
                name,
                baseCurrency: currency,
                startDate: new Date().toISOString()
            });

            // Add persons
            const validPersons = persons.filter(p => p.trim() !== '');
            if (validPersons.length > 0) {
                await db.persons.bulkAdd(validPersons.map(p => ({
                    tripId,
                    name: p.trim()
                })));
            }

            navigate(`/trip/${tripId}`);
        } catch (error) {
            console.error('Failed to create trip', error);
            alert('Помилка при створенні подорожі');
        }
    };

    return (
        <div className="create-trip-page">
            <h2>Нова Подорож</h2>
            <form onSubmit={handleSubmit}>
                <div className="form-group">
                    <label>Назва подорожі</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Напр. Шрі Ланка 2024"
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Основна валюта</label>
                    <select value={currency} onChange={(e) => setCurrency(e.target.value)}>
                        {Object.keys(CURRENCIES).map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                </div>

                <div className="form-group">
                    <label>Учасники</label>
                    {persons.map((p, index) => (
                        <input
                            key={index}
                            type="text"
                            value={p}
                            onChange={(e) => handlePersonChange(index, e.target.value)}
                            placeholder={`Учасник ${index + 1}`}
                            className="person-input"
                        />
                    ))}
                    <button type="button" onClick={handleAddPerson} className="secondary-button">
                        + Додати учасника
                    </button>
                </div>

                <button type="submit" className="primary-button">Створити</button>
            </form>
        </div>
    );
}
