'use client';

import { useState } from 'react';
import { auth } from '@/lib/firebase';
import { 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword 
} from 'firebase/auth';
import { useTranslations } from 'next-intl'; // Used for translations
// import { Button } from '@/components/ui/button'; // Removed unused import 

export function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const t = useTranslations('Login');

    const handleDemoAccess = () => {
        console.log('Demo access button clicked!');
        console.log('Redirecting to /es...');
        // Simply redirect to dashboard in demo mode
        window.location.href = '/es';
    };

    const handleAuthAction = async (action: 'login' | 'register') => {
        setIsLoading(true);
        setError(null);
        try {
            if (!auth) {
                setError('Authentication service not available');
                return;
            }
            if (action === 'register') {
                await createUserWithEmailAndPassword(auth, email, password);
            } else {
                await signInWithEmailAndPassword(auth, email, password);
            }
        } catch (err: unknown) {
            let code = 'auth/unknown-error';
            if (typeof err === 'object' && err !== null && 'code' in err) {
                code = (err as {code: string}).code;
            }

            switch (code) {
                case 'auth/invalid-email':
                    setError(t('invalidEmailError'));
                    break;
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setError(t('invalidCredentialsError'));
                    break;
                case 'auth/email-already-in-use':
                    setError(t('emailAlreadyInUseError'));
                    break;
                case 'auth/weak-password':
                    setError(t('weakPasswordError'));
                    break;
                default:
                    setError(t('genericError'));
                    break;
            }
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
            <div className="w-full max-w-md">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-orange-500 mb-2">anna logica</h1>
                    <p className="text-gray-600">IA para el procesamiento inteligente de documentos</p>
                </div>

                <div className="bg-white rounded-lg shadow-md border border-gray-200 p-8">
                    <div className="space-y-6">
                        <div>
                            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">{t('emailLabel')}</label>
                            <input
                                id="email"
                                name="email"
                                type="email"
                                autoComplete="email"
                                required
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="tu@email.com"
                            />
                        </div>
                        <div>
                            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">{t('passwordLabel')}</label>
                            <input
                                id="password"
                                name="password"
                                type="password"
                                autoComplete="current-password"
                                required
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-md text-gray-900 placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                                placeholder="••••••••"
                            />
                        </div>
                    </div>

                    {error && (
                        <div className="mt-4 p-3 bg-red-50 border border-red-200 text-red-700 rounded-md text-sm">
                            {error}
                        </div>
                    )}

                    <div className="mt-6 space-y-3">
                        <button
                            onClick={() => handleAuthAction('login')}
                            disabled={isLoading}
                            className="w-full py-2 px-4 bg-orange-500 hover:bg-orange-600 text-white font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Cargando...' : 'Iniciar Sesión'}
                        </button>
                        <button
                            onClick={() => handleAuthAction('register')}
                            disabled={isLoading}
                            className="w-full py-2 px-4 border border-orange-500 text-orange-500 hover:bg-orange-50 font-medium rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                            {isLoading ? 'Cargando...' : 'Crear Cuenta'}
                        </button>
                    </div>

                    <div className="mt-6 text-center">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center">
                                <div className="w-full border-t border-gray-300"></div>
                            </div>
                            <div className="relative flex justify-center text-sm">
                                <span className="px-2 bg-white text-gray-500">o</span>
                            </div>
                        </div>
                        <button
                            onClick={handleDemoAccess}
                            className="mt-4 w-full py-2 px-4 bg-green-500 hover:bg-green-600 text-white font-medium rounded-md transition-colors"
                        >
                            🚀 Acceso Demo Directo
                        </button>
                        <p className="text-xs text-gray-400 mt-2">
                            Sin registro requerido
                        </p>
                    </div>
                </div>
            </div>
        </div>
    );
}