import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails'
import AddExpense from './pages/AddExpense'
import EditTrip from './pages/EditTrip'
import EditExpense from './pages/EditExpense'
import './index.css'

import { useState, useEffect } from 'react';
import { auth, signInAnonymously } from './services/firebase';

function App() {
    const [authorized, setAuthorized] = useState(false);

    useEffect(() => {
        // Sign in anonymously on app start
        signInAnonymously(auth)
            .then(() => {
                console.log("Signed in anonymously");
                setAuthorized(true);
            })
            .catch((error) => {
                console.error("Auth error", error);
                // Even if auth fails (e.g. offline), if we have a cached user, it might work?
                // But generally signInAnonymously needs network once.
                // However, Firebase Auth persists user. So if already signed in, onAuthStateChanged works.
            });

        // Check if already signed in (persisted)
        const unsubscribe = auth.onAuthStateChanged((user) => {
            if (user) {
                setAuthorized(true);
            }
        });
        return () => unsubscribe();
    }, []);

    if (!authorized) {
        return <div style={{ padding: '2rem', textAlign: 'center' }}>Авторизація...</div>;
    }

    return (
        <Router>
            <div className="app-container">
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/create-trip" element={<CreateTrip />} />
                    <Route path="/trip/:id" element={<TripDetails />} />
                    <Route path="/trip/:id/edit" element={<EditTrip />} />
                    <Route path="/trip/:id/add-expense" element={<AddExpense />} />
                    <Route path="/trip/:id/expense/:expenseId" element={<EditExpense />} />
                </Routes>
            </div>
        </Router>
    )
}

export default App
