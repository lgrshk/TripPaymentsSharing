import { createContext, useContext, useEffect, useState } from 'react';
import {
    auth,
    googleProvider,
    signInWithPopup,
    signOut as firebaseSignOut,
    onAuthStateChanged,
} from '../services/firebase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const unsubscribe = onAuthStateChanged(auth, async (nextUser) => {
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
        <AuthContext.Provider value={{ user, loading, signInWithGoogle, signOut }}>
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
