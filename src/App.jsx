import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import Home from './pages/Home'
import CreateTrip from './pages/CreateTrip'
import TripDetails from './pages/TripDetails'
import AddExpense from './pages/AddExpense'
import EditTrip from './pages/EditTrip'
import EditExpense from './pages/EditExpense'
import './index.css'

function App() {
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
