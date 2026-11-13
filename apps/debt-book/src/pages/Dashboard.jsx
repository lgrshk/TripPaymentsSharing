import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useContacts, useAllEntries } from '../services/firebase';
import {
    balancesByCurrency,
    balanceLabel,
    formatMoney,
} from '../utils/balance';

function ContactAvatar({ contact }) {
    if (contact.photoDataUrl) {
        return <img src={contact.photoDataUrl} alt="" className="avatar-img" />;
    }
    const initial = (contact.name || '?').trim().charAt(0).toUpperCase();
    return <div className="avatar-fallback">{initial}</div>;
}

function BalanceChips({ balances }) {
    const currencies = Object.keys(balances).filter((c) => balances[c] !== 0);
    if (currencies.length === 0) {
        return <span className="balance-chip settled">розраховано</span>;
    }
    return (
        <div className="balance-chips">
            {currencies.map((currency) => {
                const amount = balances[currency];
                const tone = amount > 0 ? 'owe-me' : 'i-owe';
                return (
                    <span key={currency} className={`balance-chip ${tone}`}>
                        {formatMoney(amount, currency)} · {balanceLabel(amount)}
                    </span>
                );
            })}
        </div>
    );
}

export default function Dashboard() {
    const { user, signOut } = useAuth();
    const { contacts, loading: contactsLoading } = useContacts(user?.uid);
    const { entries, loading: entriesLoading } = useAllEntries(user?.uid);

    const balancesByContact = useMemo(() => {
        const map = {};
        for (const entry of entries) {
            if (!map[entry.contactId]) map[entry.contactId] = [];
            map[entry.contactId].push(entry);
        }
        const result = {};
        for (const contactId of Object.keys(map)) {
            result[contactId] = balancesByCurrency(map[contactId]);
        }
        return result;
    }, [entries]);

    const loading = contactsLoading || entriesLoading;

    return (
        <>
            <header className="page-header">
                <div>
                    <h1>DebtBook</h1>
                    <p className="header-sub">{user?.email}</p>
                </div>
                <button type="button" className="secondary-button" onClick={signOut}>
                    Вийти
                </button>
            </header>

            {loading ? (
                <p className="muted">Завантаження...</p>
            ) : contacts.length === 0 ? (
                <div className="empty-state">
                    <p>Ще немає боржників чи кредиторів.</p>
                    <p className="muted">Натисніть +, щоб додати першу людину.</p>
                </div>
            ) : (
                <ul className="contact-list">
                    {contacts.map((contact) => (
                        <li key={contact.id}>
                            <Link to={`/contacts/${contact.id}`} className="contact-card">
                                <ContactAvatar contact={contact} />
                                <div className="contact-card-body">
                                    <div className="contact-name">{contact.name}</div>
                                    {contact.note ? (
                                        <div className="contact-note">{contact.note}</div>
                                    ) : null}
                                    <BalanceChips balances={balancesByContact[contact.id] || {}} />
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <Link to="/contacts/new" className="fab-button" aria-label="Додати людину">
                +
            </Link>
        </>
    );
}
