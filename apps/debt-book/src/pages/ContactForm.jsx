import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { createContact, normalizeEmail } from '../services/firebase';
import { compressImageFile } from '../utils/photo';

export default function ContactForm() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState('');
    const [note, setNote] = useState('');
    const [photoDataUrl, setPhotoDataUrl] = useState('');
    const [busy, setBusy] = useState(false);
    const [error, setError] = useState('');

    const handlePhoto = async (event) => {
        const file = event.target.files?.[0];
        if (!file) return;
        setError('');
        try {
            const dataUrl = await compressImageFile(file);
            setPhotoDataUrl(dataUrl);
        } catch (err) {
            console.error(err);
            setError('Не вдалося обробити фото.');
        }
    };

    const handleSubmit = async (event) => {
        event.preventDefault();
        const trimmed = name.trim();
        if (!trimmed) {
            setError('Вкажіть імʼя.');
            return;
        }
        setBusy(true);
        setError('');
        try {
            const now = new Date().toISOString();
            const ref = await createContact({
                ownerId: user.uid,
                ownerEmail: normalizeEmail(user.email),
                name: trimmed,
                note: note.trim(),
                photoDataUrl: photoDataUrl || null,
                createdAt: now,
                updatedAt: now,
            });
            navigate(`/contacts/${ref.id}`, { replace: true });
        } catch (err) {
            console.error(err);
            setError('Не вдалося зберегти. Перевірте зʼєднання.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <>
            <header>
                <Link to="/" className="back-link">← Назад</Link>
                <h1>Нова людина</h1>
            </header>

            <form onSubmit={handleSubmit}>
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
                    {photoDataUrl ? (
                        <button
                            type="button"
                            className="text-button"
                            onClick={() => setPhotoDataUrl('')}
                        >
                            Прибрати фото
                        </button>
                    ) : null}
                </div>

                <div className="form-group">
                    <label htmlFor="name">Імʼя</label>
                    <input
                        id="name"
                        type="text"
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Наприклад, Іван"
                        autoFocus
                        required
                    />
                </div>

                <div className="form-group">
                    <label htmlFor="note">Нотатка</label>
                    <input
                        id="note"
                        type="text"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        placeholder="Необовʼязково"
                    />
                </div>

                {error ? <p className="form-error">{error}</p> : null}

                <button type="submit" className="primary-button" disabled={busy}>
                    {busy ? 'Збереження...' : 'Створити'}
                </button>
            </form>
        </>
    );
}
