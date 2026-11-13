import { useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { format } from 'date-fns';
import { uk } from 'date-fns/locale';
import { useAuth } from '../contexts/AuthContext';
import {
    useContact,
    useEntries,
    updateContact,
    deleteContact,
    createEntry,
    updateEntry,
    deleteEntry,
} from '../services/firebase';
import {
    balancesByCurrency,
    balanceLabel,
    formatMoney,
    ENTRY_TYPES,
} from '../utils/balance';
import { compressImageFile } from '../utils/photo';
import EntryForm from './EntryForm';

export default function ContactDetail() {
    const { id } = useParams();
    const navigate = useNavigate();
    const { user } = useAuth();
    const { contact, loading: contactLoading } = useContact(id);
    const { entries, loading: entriesLoading } = useEntries(user?.uid, id);

    const [editingContact, setEditingContact] = useState(false);
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [photoDataUrl, setPhotoDataUrl] = useState('');
    const [addingEntry, setAddingEntry] = useState(false);
    const [editingEntry, setEditingEntry] = useState(null);
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const balances = useMemo(() => balancesByCurrency(entries), [entries]);

    const startEditContact = () => {
        setName(contact.name || '');
        setNote(contact.note || '');
        setPhotoDataUrl(contact.photoDataUrl || '');
        setEditingContact(true);
        setError('');
    };

    const handlePhoto = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        try {
            setPhotoDataUrl(await compressImageFile(file));
        } catch (err) {
            console.error(err);
            setError('Не вдалося обробити фото.');
        }
    };

    const saveContact = async (event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Вкажіть імʼя.');
            return;
        }
        setBusy(true);
        try {
            await updateContact(id, {
                name: trimmed,
                note: note.trim(),
                photoDataUrl: photoDataUrl || null,
                updatedAt: new Date().toISOString(),
            });
            setEditingContact(false);
        } catch (err) {
            console.error(err);
            setError('Не вдалося оновити.');
        } finally {
            setBusy(false);
        }
    };

    const handleDeleteContact = async () => {
        if (!window.confirm('Видалити цю людину та всі її записи?')) return;
        setBusy(true);
        try {
            await Promise.all(entries.map((e) => deleteEntry(e.id)));
            await deleteContact(id);
            navigate('/', { replace: true });
        } catch (err) {
            console.error(err);
            setError('Не вдалося видалити.');
            setBusy(false);
        }
    };

    const handleCreateEntry = async (data) => {
        const now = new Date().toISOString();
        await createEntry({
            ownerId: user.uid,
            contactId: id,
            ...data,
            createdAt: now,
            updatedAt: now,
        });
        setAddingEntry(false);
    };

    const handleUpdateEntry = async (data) => {
        await updateEntry(editingEntry.id, {
            ...data,
            updatedAt: new Date().toISOString(),
        });
        setEditingEntry(null);
    };

    const handleDeleteEntry = async (entryId) => {
        if (!window.confirm('Видалити цей запис?')) return;
        try {
            await deleteEntry(entryId);
        } catch (err) {
            console.error(err);
            setError('Не вдалося видалити запис.');
        }
    };

    if (contactLoading) {
        return <p className="muted">Завантаження...</p>;
    }

    if (!contact) {
        return (
            <>
                <header>
                    <Link to="/" className="back-link">← Назад</Link>
                    <h1>Не знайдено</h1>
                </header>
                <p>Контакт відсутній або немає доступу.</p>
            </>
        );
    }

    if (contact.ownerId && contact.ownerId !== user?.uid) {
        return (
            <>
                <header>
                    <Link to="/" className="back-link">← Назад</Link>
                    <h1>Немає доступу</h1>
                </header>
            </>
        );
    }

    return (
        <>
            <header>
                <Link to="/" className="back-link">← Назад</Link>
                <h1>{contact.name}</h1>
            </header>

            {!editingContact ? (
                <section className="contact-summary">
                    <div className="contact-summary-row">
                        {contact.photoDataUrl ? (
                            <img src={contact.photoDataUrl} alt="" className="avatar-img large" />
                        ) : (
                            <div className="avatar-fallback large">
                                {(contact.name || '?').charAt(0).toUpperCase()}
                            </div>
                        )}
                        <div>
                            {contact.note ? <p className="contact-note">{contact.note}</p> : null}
                            <div className="balance-chips">
                                {Object.keys(balances).filter((c) => balances[c] !== 0).length === 0 ? (
                                    <span className="balance-chip settled">розраховано</span>
                                ) : (
                                    Object.entries(balances)
                                        .filter(([, amount]) => amount !== 0)
                                        .map(([currency, amount]) => (
                                            <span
                                                key={currency}
                                                className={`balance-chip ${amount > 0 ? 'owe-me' : 'i-owe'}`}
                                            >
                                                {formatMoney(amount, currency)} · {balanceLabel(amount)}
                                            </span>
                                        ))
                                )}
                            </div>
                        </div>
                    </div>
                    <div className="form-actions">
                        <button type="button" className="secondary-button" onClick={startEditContact}>
                            Редагувати
                        </button>
                        <button
                            type="button"
                            className="danger-button"
                            onClick={handleDeleteContact}
                            disabled={busy}
                        >
                            Видалити
                        </button>
                    </div>
                </section>
            ) : (
                <form onSubmit={saveContact} className="edit-contact-form">
                    <div className="photo-picker">
                        {photoDataUrl ? (
                            <img src={photoDataUrl} alt="" className="photo-preview" />
                        ) : (
                            <div className="photo-preview placeholder">Фото</div>
                        )}
                        <label className="secondary-button photo-button">
                            Камера / галерея
                            <input
                                type="file"
                                accept="image/*"
                                capture="user"
                                onChange={handlePhoto}
                                hidden
                            />
                        </label>
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-name">Імʼя</label>
                        <input
                            id="edit-name"
                            type="text"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>
                    <div className="form-group">
                        <label htmlFor="edit-note">Нотатка</label>
                        <input
                            id="edit-note"
                            type="text"
                            value={note}
                            onChange={(e) => setNote(e.target.value)}
                        />
                    </div>
                    <div className="form-actions">
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setEditingContact(false)}
                        >
                            Скасувати
                        </button>
                        <button type="submit" className="primary-button" disabled={busy}>
                            Зберегти
                        </button>
                    </div>
                </form>
            )}

            {error ? <p className="form-error">{error}</p> : null}

            <section className="history-section">
                <div className="section-header">
                    <h2>Історія</h2>
                    {!addingEntry && !editingEntry ? (
                        <button
                            type="button"
                            className="secondary-button"
                            onClick={() => setAddingEntry(true)}
                        >
                            + Запис
                        </button>
                    ) : null}
                </div>

                {addingEntry ? (
                    <EntryForm
                        onSubmit={handleCreateEntry}
                        onCancel={() => setAddingEntry(false)}
                        submitLabel="Додати"
                    />
                ) : null}

                {editingEntry ? (
                    <EntryForm
                        initial={editingEntry}
                        onSubmit={handleUpdateEntry}
                        onCancel={() => setEditingEntry(null)}
                        submitLabel="Оновити"
                    />
                ) : null}

                {entriesLoading ? (
                    <p className="muted">Завантаження історії...</p>
                ) : entries.length === 0 ? (
                    <p className="muted">Записів ще немає.</p>
                ) : (
                    <ul className="entry-list">
                        {entries.map((entry) => (
                            <li key={entry.id} className="entry-item">
                                <div className="entry-main">
                                    <div className="entry-type">
                                        {ENTRY_TYPES[entry.type]?.label || entry.type}
                                    </div>
                                    <div className="entry-meta">
                                        {entry.date
                                            ? format(new Date(entry.date), 'd MMM yyyy', { locale: uk })
                                            : '—'}
                                        {entry.description ? ` · ${entry.description}` : ''}
                                    </div>
                                </div>
                                <div className="entry-side">
                                    <div
                                        className={`entry-amount ${
                                            (ENTRY_TYPES[entry.type]?.sign || 1) > 0 ? 'owe-me' : 'i-owe'
                                        }`}
                                    >
                                        {(ENTRY_TYPES[entry.type]?.sign || 1) > 0 ? '+' : '−'}
                                        {formatMoney(entry.amount, entry.currency)}
                                    </div>
                                    <div className="entry-actions">
                                        <button
                                            type="button"
                                            className="text-button"
                                            onClick={() => {
                                                setAddingEntry(false);
                                                setEditingEntry(entry);
                                            }}
                                        >
                                            Змінити
                                        </button>
                                        <button
                                            type="button"
                                            className="text-button danger"
                                            onClick={() => handleDeleteEntry(entry.id)}
                                        >
                                            Видалити
                                        </button>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </section>
        </>
    );
}
