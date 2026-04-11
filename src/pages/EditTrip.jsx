import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../services/firebase';
import { doc, updateDoc, deleteDoc, addDoc, collection, writeBatch, query, where, getDocs } from 'firebase/firestore';
import { useTrip, usePersons, useFamilies } from '../services/firebase';

export default function EditTrip() {
    const { id: tripId } = useParams();
    const navigate = useNavigate();

    const { trip, loading: loadingTrip } = useTrip(tripId);
    const { persons: existingPersons, loading: loadingPersons } = usePersons(tripId);
    const { families, loading: loadingFamilies } = useFamilies(tripId);

    console.log('EditTrip:', { tripId, trip, existingPersons });

    const [name, setName] = useState('');
    // We generally avoid changing base currency mid-trip as it complicates things, but let's allow renaming.

    const [newPersons, setNewPersons] = useState([]);
    const [familyMemberIds, setFamilyMemberIds] = useState([]);
    const [familyPayerId, setFamilyPayerId] = useState('');
    const [familyName, setFamilyName] = useState('');
    const [familySaving, setFamilySaving] = useState(false);

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

    const getPersonName = (personId) =>
        existingPersons?.find(p => p.id === personId)?.name || 'Невідомий';

    const handleToggleFamilyMember = (personId) => {
        const alreadyAssigned = families.some(f => (f.memberPersonIds || []).includes(personId));
        if (familyMemberIds.includes(personId)) {
            const next = familyMemberIds.filter(id => id !== personId);
            setFamilyMemberIds(next);
            if (familyPayerId === personId) setFamilyPayerId(next[0] || '');
        } else {
            if (alreadyAssigned) {
                alert('Цей учасник уже входить до іншої сім\'ї');
                return;
            }
            const next = [...familyMemberIds, personId];
            setFamilyMemberIds(next);
            if (!familyPayerId) setFamilyPayerId(personId);
        }
    };

    const handleCreateFamily = async () => {
        if (familyMemberIds.length < 2) {
            alert('Оберіть щонайменше двох учасників для сім\'ї');
            return;
        }
        if (!familyPayerId || !familyMemberIds.includes(familyPayerId)) {
            alert('Оберіть платника зі складу сім\'ї');
            return;
        }
        setFamilySaving(true);
        try {
            await addDoc(collection(db, 'families'), {
                tripId,
                memberPersonIds: [...familyMemberIds],
                payerPersonId: familyPayerId,
                ...(familyName.trim() ? { name: familyName.trim() } : {})
            });
            setFamilyMemberIds([]);
            setFamilyPayerId('');
            setFamilyName('');
        } catch (err) {
            console.error(err);
            alert('Не вдалося створити сім\'ю');
        } finally {
            setFamilySaving(false);
        }
    };

    const handleDeleteFamily = async (familyId) => {
        if (!window.confirm('Видалити цю сім\'ю?')) return;
        try {
            await deleteDoc(doc(db, 'families', familyId));
        } catch (err) {
            console.error(err);
            alert('Не вдалося видалити сім\'ю');
        }
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

            const familiesQ = query(collection(db, "families"), where("tripId", "==", tripId));
            const familiesSnap = await getDocs(familiesQ);
            familiesSnap.forEach(d => {
                batch.delete(d.ref);
            });

            // Delete trip
            batch.delete(doc(db, "trips", tripId));

            await batch.commit();

            navigate('/');
        }
    };

    if (!trip || loadingPersons || loadingFamilies) return <div>...</div>;

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
                    <label>Сім&apos;ї</label>
                    <p style={{ fontSize: '0.9rem', color: '#64748b', margin: '0 0 0.75rem' }}>
                        Об&apos;єднайте учасників і вкажіть, хто від імені сім&apos;ї робить зовнішні перекази.
                        Розподіл витрат між людьми не змінюється — змінюється лише схема «хто кому» у блоці з сім&apos;ями на сторінці подорожі.
                    </p>
                    {families.length === 0 ? (
                        <p style={{ fontSize: '0.9rem', margin: '0 0 0.75rem' }}>Поки немає сімей.</p>
                    ) : (
                        <ul style={{ paddingLeft: '1.5rem', margin: '0 0 1rem' }}>
                            {families.map(f => (
                                <li key={f.id} style={{ marginBottom: '0.5rem' }}>
                                    {f.name ? <strong>{f.name}: </strong> : null}
                                    {f.memberPersonIds?.map(id => getPersonName(id)).join(', ')}
                                    {' — '}
                                    платник: <strong>{getPersonName(f.payerPersonId)}</strong>
                                    {' '}
                                    <button type="button" className="small-text-btn" onClick={() => handleDeleteFamily(f.id)} style={{ marginLeft: '0.5rem' }}>
                                        Видалити
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '8px', padding: '0.75rem' }}>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>Назва (необов&apos;язково)</label>
                            <input
                                type="text"
                                value={familyName}
                                onChange={e => setFamilyName(e.target.value)}
                                placeholder="Напр. Ми з дружиною"
                            />
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>Склад сім&apos;ї</label>
                            <div className="beneficiaries-list">
                                {existingPersons?.map(p => (
                                    <label key={p.id} className="beneficiary-item">
                                        <input
                                            type="checkbox"
                                            checked={familyMemberIds.includes(p.id)}
                                            onChange={() => handleToggleFamilyMember(p.id)}
                                        />
                                        {p.name}
                                    </label>
                                ))}
                            </div>
                        </div>
                        <div className="form-group" style={{ marginBottom: '0.75rem' }}>
                            <label>Платник (зовнішні перекази)</label>
                            <select
                                value={familyPayerId}
                                onChange={e => setFamilyPayerId(e.target.value)}
                                disabled={familyMemberIds.length === 0}
                            >
                                <option value="">—</option>
                                {familyMemberIds.map(id => (
                                    <option key={id} value={id}>{getPersonName(id)}</option>
                                ))}
                            </select>
                        </div>
                        <button type="button" className="secondary-button" onClick={handleCreateFamily} disabled={familySaving}>
                            {familySaving ? 'Збереження...' : 'Додати сім\'ю'}
                        </button>
                    </div>
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
