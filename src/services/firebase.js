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
    getDocs,
    query,
    where,
    writeBatch,
    arrayUnion,
    arrayRemove,
} from "firebase/firestore";
import {
    getAuth,
    GoogleAuthProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
} from "firebase/auth";
import { useEffect, useState } from "react";

const firebaseConfig = {
    apiKey: "AIzaSyDmWCRo7J_NolDqtphNGBAjQkpEEk7Ipro",
    authDomain: "trippaymentssharimg.firebaseapp.com",
    projectId: "trippaymentssharimg",
    storageBucket: "trippaymentssharimg.firebasestorage.app",
    messagingSenderId: "33844692758",
    appId: "1:33844692758:web:86e44b623a344e244a7237"
};

/** Existing trips without owner are claimed by this account on first login. */
export const LEGACY_OWNER_EMAIL = "oleg.roshka@gmail.com";

const MIGRATION_FLAG = "tripsOwnerMigration_v1";

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

// Enable offline persistence
try {
    enableIndexedDbPersistence(db)
        .catch((err) => {
            if (err.code === "failed-precondition") {
                console.warn("Firebase persistence failed: Multiple tabs open");
            } else if (err.code === "unimplemented") {
                console.warn("Firebase persistence not supported");
            }
        });
} catch (e) {
    console.warn("Firebase persistence error:", e);
}

export function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

/**
 * Assigns legacy trips (no ownerEmail) to LEGACY_OWNER_EMAIL.
 * Runs only when that Google account signs in.
 */
export async function migrateOrphanTrips(user) {
    const email = normalizeEmail(user?.email);
    if (email !== LEGACY_OWNER_EMAIL) return;
    if (typeof localStorage !== "undefined" && localStorage.getItem(MIGRATION_FLAG) === "done") {
        return;
    }

    const snap = await getDocs(collection(db, "trips"));
    const orphans = snap.docs.filter((d) => !d.data().ownerEmail);
    if (orphans.length === 0) {
        if (typeof localStorage !== "undefined") {
            localStorage.setItem(MIGRATION_FLAG, "done");
        }
        return;
    }

    // Firestore batches are limited to 500 ops
    for (let i = 0; i < orphans.length; i += 400) {
        const batch = writeBatch(db);
        orphans.slice(i, i + 400).forEach((d) => {
            batch.update(d.ref, {
                ownerId: user.uid,
                ownerEmail: LEGACY_OWNER_EMAIL,
                memberEmails: [LEGACY_OWNER_EMAIL],
            });
        });
        await batch.commit();
    }

    if (typeof localStorage !== "undefined") {
        localStorage.setItem(MIGRATION_FLAG, "done");
    }
    console.log(`Migrated ${orphans.length} trip(s) to ${LEGACY_OWNER_EMAIL}`);
}

export async function addTripMember(tripId, email) {
    const normalized = normalizeEmail(email);
    if (!normalized || !normalized.includes("@")) {
        throw new Error("Invalid email");
    }
    await updateDoc(doc(db, "trips", tripId), {
        memberEmails: arrayUnion(normalized),
    });
}

export async function removeTripMember(tripId, email) {
    const normalized = normalizeEmail(email);
    await updateDoc(doc(db, "trips", tripId), {
        memberEmails: arrayRemove(normalized),
    });
}

export {
    db,
    auth,
    googleProvider,
    signInWithPopup,
    signOut,
    onAuthStateChanged,
};

// --- Custom Hooks for Firestore ---

export function useTrips(userEmail) {
    const [trips, setTrips] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const email = normalizeEmail(userEmail);
        if (!email) {
            setTrips([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "trips"),
            where("memberEmails", "array-contains", email)
        );
        const unsubscribe = onSnapshot(
            q,
            (snapshot) => {
                const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
                list.sort((a, b) => new Date(b.startDate || 0) - new Date(a.startDate || 0));
                setTrips(list);
                setLoading(false);
            },
            (err) => {
                console.error("useTrips error", err);
                setTrips([]);
                setLoading(false);
            }
        );
        return () => unsubscribe();
    }, [userEmail]);

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
        const unsub = onSnapshot(
            doc(db, "trips", id),
            (docFn) => {
                if (docFn.exists()) {
                    setTrip({ id: docFn.id, ...docFn.data() });
                } else {
                    setTrip(null);
                }
                setLoading(false);
            },
            (err) => {
                console.error("useTrip error", err);
                setTrip(null);
                setLoading(false);
            }
        );
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
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
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

/** @typedef {{ id: string, tripId: string, memberPersonIds: string[], payerPersonId: string, name?: string }} FamilyDoc */

/**
 * @param {string} tripId
 * @returns {{ families: FamilyDoc[], loading: boolean }}
 */
export function useFamilies(tripId) {
    const [families, setFamilies] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!tripId) {
            setLoading(false);
            return;
        }
        const q = query(collection(db, "families"), where("tripId", "==", tripId));
        const unsub = onSnapshot(q, (snapshot) => {
            const list = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }));
            setFamilies(list);
            setLoading(false);
        });
        return () => unsub();
    }, [tripId]);

    return { families, loading };
}

// Re-export commonly used Firestore helpers for pages
export { getDoc, updateDoc, deleteDoc, addDoc, collection, doc, arrayUnion, arrayRemove };
