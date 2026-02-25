import React, { useState } from 'react';
import { useMutation } from '@tanstack/react-query';
import { KeyRound, AlertTriangle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';

/**
 * Shown when user.must_change_password is true.
 * Blocks the entire UI until the user sets new credentials.
 * On success, the session is invalidated and the user must log in again.
 */
export const ChangeCredentialsModal: React.FC = () => {
    const { user, logout } = useAuth();
    const [username, setUsername] = useState(user?.username ?? '');
    const [password, setPassword] = useState('');
    const [confirm, setConfirm] = useState('');
    const [error, setError] = useState('');

    const mutation = useMutation({
        mutationFn: async () => {
            await api.put(`/users/${user!.id}`, { username, password });
        },
        onSuccess: () => {
            logout();
        },
        onError: (err: any) => {
            setError(err.response?.data?.error ?? 'Errore durante il salvataggio.');
        },
    });

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        if (!username.trim() || username.length < 3) {
            setError('Il nome utente deve avere almeno 3 caratteri.');
            return;
        }
        if (!password || password.length < 6) {
            setError('La password deve avere almeno 6 caratteri.');
            return;
        }
        if (password !== confirm) {
            setError('Le password non coincidono.');
            return;
        }

        mutation.mutate();
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-6 bg-black/90 backdrop-blur-md">
            <div className="w-full max-w-md bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[12px] border-black rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-br from-amber-500/5 to-transparent pointer-events-none" />

                <div className="relative z-10 flex flex-col items-center text-center mb-8">
                    <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400 mb-4">
                        <AlertTriangle size={32} />
                    </div>
                    <h2 className="text-xl font-black text-white uppercase tracking-[0.3em] mb-2">Primo Accesso</h2>
                    <p className="text-white/40 text-sm leading-relaxed">
                        Per motivi di sicurezza devi impostare il tuo <span className="text-white font-bold">nome utente</span> e una <span className="text-white font-bold">password personale</span> prima di continuare.
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="relative z-10 flex flex-col gap-5">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">
                            Nuovo Nome Utente
                        </label>
                        <input
                            type="text"
                            value={username}
                            onChange={(e) => setUsername(e.target.value)}
                            autoComplete="username"
                            className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
                            placeholder="nome.cognome"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">
                            Nuova Password
                        </label>
                        <input
                            type="password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
                            placeholder="••••••••"
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">
                            Conferma Password
                        </label>
                        <input
                            type="password"
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            autoComplete="new-password"
                            className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-amber-500/50 transition-all placeholder:text-white/20"
                            placeholder="••••••••"
                        />
                    </div>

                    {error && (
                        <p className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">{error}</p>
                    )}

                    <button
                        type="submit"
                        disabled={mutation.isPending}
                        className="w-full relative group mt-2"
                    >
                        <div className="absolute -inset-1 bg-gradient-to-r from-amber-600 to-orange-600 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-500" />
                        <div className="relative bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[10px] border-black text-white px-8 py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-sm group-hover:from-[#2a2a2e] active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center gap-3">
                            {mutation.isPending ? (
                                <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                            ) : (
                                <>
                                    <KeyRound size={18} />
                                    Salva e Riaccedi
                                </>
                            )}
                        </div>
                    </button>
                </form>
            </div>
        </div>
    );
};
