import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function Login() {
    const { signInWithGoogle } = useAuth();
    const [error, setError] = useState('');
    const [busy, setBusy] = useState(false);

    const handleGoogle = async () => {
        setError('');
        setBusy(true);
        try {
            await signInWithGoogle();
        } catch (err) {
            console.error(err);
            setError('Не вдалося увійти через Google. Спробуйте ще раз.');
        } finally {
            setBusy(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">
                <h1>DebtBook</h1>
                <p className="login-subtitle">
                    Особистий облік боргів і боржників. Увійдіть через Google — дані лише ваші.
                </p>
                <button
                    type="button"
                    className="primary-button google-signin-button"
                    onClick={handleGoogle}
                    disabled={busy}
                >
                    {busy ? 'Вхід...' : 'Увійти через Google'}
                </button>
                {error ? <p className="login-error">{error}</p> : null}
            </div>
        </div>
    );
}
