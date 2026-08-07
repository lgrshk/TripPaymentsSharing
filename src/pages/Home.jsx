import { useTrips } from '../services/firebase';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Home() {
    const { user, signOut } = useAuth();
    const { trips, loading } = useTrips(user?.email);

    if (loading) return <div>Завантаження...</div>;

    return (
        <div className="home-page">
            <header className="home-header">
                <div>
                    <h1>Мої Подорожі</h1>
                    {user?.email ? (
                        <p className="user-email">{user.email}</p>
                    ) : null}
                </div>
                <button type="button" className="secondary-button sign-out-button" onClick={signOut}>
                    Вийти
                </button>
            </header>

            {!trips || trips.length === 0 ? (
                <div className="empty-state">
                    <p>Ще немає жодної подорожі.</p>
                    <p>Створіть нову, щоб почати облік витрат.</p>
                </div>
            ) : (
                <ul className="trip-list">
                    {trips.map(trip => (
                        <li key={trip.id} className="trip-item">
                            <Link to={`/trip/${trip.id}`}>
                                <div className="trip-info">
                                    <h2>{trip.name}</h2>
                                    <span className="trip-date">{new Date(trip.startDate).toLocaleDateString('uk-UA')}</span>
                                </div>
                                <div className="trip-currency">
                                    {trip.baseCurrency}
                                </div>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}

            <Link to="/create-trip" className="fab-button" aria-label="Створити подорож">
                +
            </Link>
        </div>
    );
}
