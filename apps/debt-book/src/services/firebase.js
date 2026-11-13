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
    query,
    where,
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
    appId: "1:33844692758:web:86e44b623a344e244a7237",
};

const app = initializeApp(firebaseConfig, "debt-book");
const db = getFirestore(app);
const auth = getAuth(app);
const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

try {
    enableIndexedDbPersistence(db).catch((err) => {
        if (err.code === "failed-precondition") {
            console.warn("Firebase persistence failed: Multiple tabs open");
        } else if (err.code === "unimplemented") {
            console.warn("Firebase persistence not supported");
        }
    });
} catch (e) {
    console.warn("Firebase persistence error:", e);
}

export { auth, db, googleProvider, signInWithPopup, signOut, onAuthStateChanged };

export function normalizeEmail(email) {
    return String(email || "").trim().toLowerCase();
}

export function useContacts(ownerId) {
    const [contacts, setContacts] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ownerId) {
            setContacts([]);
            setLoading(false);
            return undefined;
        }

        const q = query(
            collection(db, "debtContacts"),
            where("ownerId", "==", ownerId)
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                list.sort((a, b) =>
                    String(a.name || "").localeCompare(String(b.name || ""), "uk")
                );
                setContacts(list);
                setLoading(false);
            },
            (err) => {
                console.error("Contacts listener error", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [ownerId]);

    return { contacts, loading };
}

export function useContact(contactId) {
    const [contact, setContact] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!contactId) {
            setContact(null);
            setLoading(false);
            return undefined;
        }

        const unsub = onSnapshot(
            doc(db, "debtContacts", contactId),
            (snap) => {
                setContact(snap.exists() ? { id: snap.id, ...snap.data() } : null);
                setLoading(false);
            },
            (err) => {
                console.error("Contact listener error", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [contactId]);

    return { contact, loading };
}

export function useEntries(ownerId, contactId) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ownerId || !contactId) {
            setEntries([]);
            setLoading(false);
            return undefined;
        }

        const q = query(
            collection(db, "debtEntries"),
            where("ownerId", "==", ownerId),
            where("contactId", "==", contactId)
        );

        const unsub = onSnapshot(
            q,
            (snap) => {
                const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
                list.sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
                setEntries(list);
                setLoading(false);
            },
            (err) => {
                console.error("Entries listener error", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [ownerId, contactId]);

    return { entries, loading };
}

export function useAllEntries(ownerId) {
    const [entries, setEntries] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!ownerId) {
            setEntries([]);
            setLoading(false);
            return undefined;
        }

        const q = query(collection(db, "debtEntries"), where("ownerId", "==", ownerId));

        const unsub = onSnapshot(
            q,
            (snap) => {
                setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
                setLoading(false);
            },
            (err) => {
                console.error("All entries listener error", err);
                setLoading(false);
            }
        );
        return () => unsub();
    }, [ownerId]);

    return { entries, loading };
}

export async function createContact(data) {
    return addDoc(collection(db, "debtContacts"), data);
}

export async function updateContact(contactId, data) {
    return updateDoc(doc(db, "debtContacts", contactId), data);
}

export async function deleteContact(contactId) {
    return deleteDoc(doc(db, "debtContacts", contactId));
}

export async function createEntry(data) {
    return addDoc(collection(db, "debtEntries"), data);
}

export async function updateEntry(entryId, data) {
    return updateDoc(doc(db, "debtEntries", entryId), data);
}

export async function deleteEntry(entryId) {
    return deleteDoc(doc(db, "debtEntries", entryId));
}
