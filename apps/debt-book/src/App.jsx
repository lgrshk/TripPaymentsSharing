import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Dashboard from './pages/Dashboard'
import ContactForm from './pages/ContactForm'
import ContactDetail from './pages/ContactDetail'
import Login from './pages/Login'
import './index.css'

import { AuthProvider, useAuth } from './contexts/AuthContext'

function AppRoutes() {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                Завантаження...
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
                    <Route path="/" element={<Dashboard />} />
                    <Route path="/contacts/new" element={<ContactForm />} />
                    <Route path="/contacts/:id" element={<ContactDetail />} />
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
