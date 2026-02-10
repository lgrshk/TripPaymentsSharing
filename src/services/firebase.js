import { initializeApp } from "firebase/app";
import {
    getFirestore,
    enableIndexedDbPersistence,
    collection,
    onSnapshot,
    addDoc,
    doc,
    updateDoc,
    deleteDoc,
    getDoc,
    query,
    where
} from "firebase/firestore";
import { useEffect, useState } from "react";

const firebaseConfig = {
    apiKey: "AIzaSyDmWCRo7J_NolDqtphNGBAjQkpEEk7Ipro",
    authDomain: "trippaymentssharimg.firebaseapp.com",
    projectId: "trippaymentssharimg",
    storageBucket: "trippaymentssharimg.firebasestorage.app",
    messagingSenderId: "33844692758",
    appId: "1:33844692758:web:86e44b623a344e244a7237"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Enable offline persistence
try {
    enableIndexedDbPersistence(db)
        .catch((err) => {
            if (err.code === 'failed-precondition') {
                // Multiple tabs open, persistence can only be enabled in one tab at a a time.
                console.warn('Firebase persistence failed: Multiple tabs open');
            } else if (err.code === 'unimplemented') {
                // The current browser does not support all of the features required to enable persistence
                console.warn('Firebase persistence not supported');
            }
        });
} catch (e) {
    console.warn('Firebase persistence error:', e);
}

export { db };

// --- Custom Hooks for Firestore ---

export function useTrips() {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "trips"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setTrips(list);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    return { trips, loading };
}

export function useTrip(id) {
    const [trip, setTrip] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!id) {
            setLoading(false);
            return;
        }
        const unsub = onSnapshot(doc(db, "trips", id), (docFn) => {
            if (docFn.exists()) {
                setTrip({ id: docFn.id, ...docFn.data() });
            } else {
                setTrip(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [id]);

    return { trip, loading };
}

export function usePersons(tripId) {
    const [persons, setPersons] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) {
            setLoading(false);
            return;
        }
        const q = query(collection(db, "persons"), where("tripId", "==", tripId));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setPersons(list);
            setLoading(false);
        });
        return () => unsub();
    }, [tripId]);

    return { persons, loading };
}

export function useExpenses(tripId) {
    const [expenses, setExpenses] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) {
            setLoading(false);
            return;
        }
        const q = query(collection(db, "expenses"), where("tripId", "==", tripId));
        // Sort manually since creating indices dynamically for compound queries might be annoying
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            // Sort by date desc
            list.sort((a, b) => new Date(b.date) - new Date(a.date));
            setExpenses(list);
            setLoading(false);
        });
        return () => unsub();
    }, [tripId]);

    return { expenses, loading };
}

export function useExpense(expenseId) {
    const [expense, setExpense] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!expenseId) {
            setLoading(false);
            return;
        }
        const unsub = onSnapshot(doc(db, "expenses", expenseId), (docFn) => {
            if (docFn.exists()) {
                setExpense({ id: docFn.id, ...docFn.data() });
            } else {
                setExpense(null);
            }
            setLoading(false);
        });
        return () => unsub();
    }, [expenseId]);

    return { expense, loading };
}
