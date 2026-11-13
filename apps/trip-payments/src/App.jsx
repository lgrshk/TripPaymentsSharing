import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails'
import AddExpense from './pages/AddExpense'
import EditTrip from './pages/EditTrip'
import EditExpense from './pages/EditExpense'
import Login from './pages/Login'
import './index.css'

import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppRoutes() {
    const { user, loading, migrating } = useAuth();

    if (loading || migrating) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                {migrating ? 'Підготовка даних...' : 'Завантаження...'}
            </div>
        );
    }

    if (!user) {
        return <Login />;
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
    );
}

function App() {
    return (
        <AuthProvider>
            <AppRoutes />
        </AuthProvider>
    );
}

export default App
