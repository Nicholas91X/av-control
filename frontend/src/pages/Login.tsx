import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import { useNavigate } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Lock, User } from 'lucide-react';

export const Login: React.FC = () => {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const response = await api.post('/auth/login', { username, password });
            const { access_token, refresh_token, user } = response.data;

            login(access_token, refresh_token, user);
            navigate('/');
        } catch (err: any) {
            if (err.response?.status === 401) {
                setError('Invalid username or password');
            } else {
                setError('Login failed. Please try again.');
            }
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-dark-bg p-4 relative overflow-hidden">
            {/* Background Decorative Elements */}
            <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary-500/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl" />

            <div className="w-full max-w-md relative z-10">
                <div className="text-center mb-10">
                    <img
                        src="/verbumdigital-logo.png"
                        alt="VerbumDigital"
                        className="h-24 w-auto mx-auto object-contain filter drop-shadow-[0_0_20px_rgba(59,130,246,0.3)]"
                    />
                    <h1 className="text-4xl font-black uppercase tracking-tighter text-gray-900 dark:text-white mt-4">Welcome Back</h1>
                    <p className="text-[10px] font-black uppercase tracking-[0.3em] text-gray-500 dark:text-white/20 mt-1">Sign in to control your AV system</p>
                </div>

                <div className="bg-white dark:bg-[#1a1a1c] rounded-[2.5rem] shadow-2xl border border-gray-100 dark:border-white/10 border-b-[12px] border-b-gray-200 dark:border-b-black/60 p-10">
                    {error && (
                        <div className="mb-6 p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-red-600 dark:text-red-400 text-sm font-medium">
                            {error}
                        </div>
                    )}

                    <form onSubmit={handleSubmit} className="space-y-6">
                        <Input
                            label="Username"
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            placeholder="Enter your username"
                            icon={User}
                            required
                        />

                        <Input
                            label="Password"
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            placeholder="••••••••"
                            icon={Lock}
                            required
                        />

                        <Button
                            type="submit"
                            variant="primary"
                            fullWidth
                            size="lg"
                            isLoading={loading}
                        >
                            Sign In
                        </Button>
                    </form>
                </div>
                <p className="text-center text-sm text-gray-500 dark:text-gray-400 mt-8">
                    Protected by Role-Based Access Control
                </p>
            </div>
        </div>
    );
};
