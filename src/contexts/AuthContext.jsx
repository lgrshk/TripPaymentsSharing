import { createContext, useContext, useEffect, useState } from 'react';
import {
    auth,
    googleProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
    migrateOrphanTrips,
} from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [migrating, setMigrating] = useState(false);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
            // Reject anonymous / email-less sessions from the old auth flow
            if (nextUser && !nextUser.email) {
                try {
                    await firebaseSignOut(auth);
                } catch (err) {
                    console.error('Failed to clear anonymous session', err);
                }
                setUser(null);
                setLoading(false);
                return;
            }

            setUser(nextUser);
            if (nextUser?.email) {
                setMigrating(true);
                try {
                    await migrateOrphanTrips(nextUser);
                } catch (err) {
                    console.error('Trip migration failed', err);
                } finally {
                    setMigrating(false);
                }
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const signInWithGoogle = async () => {
        await signInWithPopup(auth, googleProvider);
    };

    const signOut = async () => {
        await firebaseSignOut(auth);
    };

    return (
        <AuthContext.Provider value={{ user, loading, migrating, signInWithGoogle, signOut }}>
            {children}
        </AuthContext.Provider>
    );
}

export function useAuth() {
    const ctx = useContext(AuthContext);
    if (!ctx) {
        throw new Error('useAuth must be used within AuthProvider');
    }
    return ctx;
}
