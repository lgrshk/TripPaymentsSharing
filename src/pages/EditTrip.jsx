import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, updateDoc, deleteDoc, addDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useTrip, usePersons } from '../services/firebase';

export default function EditTrip() {
    const { id: tripId } = useParams();
    const navigate = useNavigate();

    const { trip, loading: loadingTrip } = useTrip(tripId);
    const { persons: existingPersons, loading: loadingPersons } = usePersons(tripId);

    console.log('EditTrip:', { tripId, trip, existingPersons });

    const [name, setName] = useState('');
    // We generally avoid changing base currency mid-trip as it complicates things, but let's allow renaming.

    const [newPersons, setNewPersons] = useState([]);

    useEffect(() => {
        if (trip) {
            setName(trip.name);
        }
    }, [trip]);

    const handleAddPersonInput = () => {
        setNewPersons([...newPersons, '']);
    };

    const handleNewPersonChange = (index, val) => {
        const updated = [...newPersons];
        updated[index] = val;
        setNewPersons(updated);
    };

    const handleUpdate = async (e) => {
        e.preventDefault();
        if (!name.trim()) return;

        await updateDoc(doc(db, "trips", tripId), { name });

        // Add new persons
        const validPersons = newPersons.filter(p => p.trim() !== '');
        if (validPersons.length > 0) {
            const promises = validPersons.map(p =>
                addDoc(collection(db, "persons"), {
                    tripId,
                    name: p.trim()
                })
            );
            await Promise.all(promises);
        }

        navigate(`/trip/${tripId}`);
    };

    const handleDeleteTrip = async () => {
        const confirmation = prompt('Щоб видалити подорож і всі дані, введіть "DELETE"');
        if (confirmation === 'DELETE') {
            // Delete expenses
            const expensesQ = query(collection(db, "expenses"), where("tripId", "==", tripId));
            const expensesSnap = await getDocs(expensesQ);
            const batch = writeBatch(db);

            expensesSnap.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete persons
            const personsQ = query(collection(db, "persons"), where("tripId", "==", tripId));
            const personsSnap = await getDocs(personsQ);
            personsSnap.forEach(doc => {
                batch.delete(doc.ref);
            });

            // Delete trip
            batch.delete(doc(db, "trips", tripId));

            await batch.commit();

            navigate('/');
        }
    };

    if (!trip) return <div>...</div>;

    return (
        <div className="create-trip-page">
            <h2>Налаштування подорожі</h2>
            <form onSubmit={handleUpdate}>
                <div className="form-group">
                    <label>Назва подорожі</label>
                    <input
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        required
                    />
                </div>

                <div className="form-group">
                    <label>Існуючі учасники</label>
                    <ul style={{ paddingLeft: '1.5rem', margin: '0.5rem 0' }}>
                        {existingPersons?.map(p => (
                            <li key={p.id}>{p.name}</li>
                        ))}
                    </ul>
                </div>

                <div className="form-group">
                    <label>Додати нових учасників</label>
                    {newPersons.map((p, index) => (
                        <input
                            key={index}
                            type="text"
                            value={p}
                            onChange={(e) => handleNewPersonChange(index, e.target.value)}
                            placeholder={`Новий учасник ${index + 1}`}
                            className="person-input"
                            style={{ marginBottom: '0.5rem' }}
                        />
                    ))}
                    <button type="button" onClick={handleAddPersonInput} className="secondary-button">
                        + Додати учасника
                    </button>
                </div>

                <button type="submit" className="primary-button">Зберегти зміни</button>

                <hr style={{ margin: '2rem 0', border: 'none', borderTop: '1px solid #e2e8f0' }} />

                <button type="button" onClick={handleDeleteTrip} style={{ background: '#ef4444', color: 'white', border: 'none', padding: '0.75rem', borderRadius: '8px', width: '100%', cursor: 'pointer' }}>
                    Видалити подорож
                </button>
            </form>
        </div>
    );
}
