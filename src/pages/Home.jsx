import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db/db';
import { Link } from 'react-router-dom';

export default function Home() {
    const trips = useLiveQuery(() => db.trips.toArray());

    return (
        <div className="home-page">
            <header>
                <h1>Мої Подорожі</h1>
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
