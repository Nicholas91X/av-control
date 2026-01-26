import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../context/SettingsContext';
import api from '../lib/api';
import { UserPlus, Trash2, Shield, User, Mail, CheckCircle } from 'lucide-react';

interface User {
    id: string;
    username: string;
    role: string;
    full_name: string;
    email: string;
    is_active: boolean;
    created_at: string;
}

interface CreateUserForm {
    username: string;
    password: string;
    role: string;
    full_name: string;
    email: string;
}

export const UserManagement: React.FC = () => {
    const { backgroundColor } = useSettings();
    const queryClient = useQueryClient();
    const [formData, setFormData] = useState<CreateUserForm>({
        username: '',
        password: '',
        role: 'viewer',
        full_name: '',
        email: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<CreateUserForm>>({});
    const [userToDelete, setUserToDelete] = useState<User | null>(null);

    // Fetch all users
    const { data: users = [], isLoading } = useQuery<User[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        },
    });

    // Create user mutation
    const createUserMutation = useMutation({
        mutationFn: async (userData: CreateUserForm) => {
            const response = await api.post('/users', userData);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setFormData({
                username: '',
                password: '',
                role: 'viewer',
                full_name: '',
                email: '',
            });
            setFormErrors({});
        },
        onError: (error: any) => {
            if (error.response?.data?.error) {
                setFormErrors({ username: error.response.data.error });
            }
        },
    });

    // Delete user mutation
    const deleteUserMutation = useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setUserToDelete(null);
        },
    });

    const handleInputChange = (field: keyof CreateUserForm, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        // Clear error for this field
        if (formErrors[field]) {
            setFormErrors((prev) => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const errors: Partial<CreateUserForm> = {};

        if (!formData.username.trim()) {
            errors.username = 'Username is required';
        } else if (formData.username.length < 3) {
            errors.username = 'Username must be at least 3 characters';
        }

        if (!formData.password.trim()) {
            errors.password = 'Password is required';
        } else if (formData.password.length < 6) {
            errors.password = 'Password must be at least 6 characters';
        }

        if (!formData.full_name.trim()) {
            errors.full_name = 'Full name is required';
        }

        if (!formData.email.trim()) {
            errors.email = 'Email is required';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
            errors.email = 'Invalid email format';
        }

        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateForm()) {
            createUserMutation.mutate(formData);
        }
    };

    const confirmDelete = () => {
        if (userToDelete) {
            deleteUserMutation.mutate(userToDelete.id);
        }
    };

    const getRoleBadge = (role: string) => {
        const styles = {
            admin: 'bg-red-100/10 text-red-400 border-red-500/20',
            operator: 'bg-blue-100/10 text-blue-400 border-blue-500/20',
            viewer: 'bg-white/5 text-white/40 border-white/5',
        };
        return styles[role as keyof typeof styles] || styles.viewer;
    };

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor }}>
            {/* TOP TITLE ROW */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Gestione Utenti
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            <div className="mt-28 flex-1 flex flex-col max-w-[1240px] mx-auto w-full px-8 pb-8 overflow-hidden">
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">

                    {/* Left Panel: Users List (Glassmorphism) */}
                    <div className="flex-1 flex flex-col bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[10px] border-black/40 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden group">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                        <div className="p-8 pb-4 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-widest">Utenti Registrati</h3>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">{users.length} Account Attivi</p>
                            </div>
                            <div className="p-3 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-lg text-blue-400">
                                <User size={24} />
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto custom-scrollbar px-8 pb-8 space-y-4">
                            {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-50">
                                    <div className="w-12 h-12 border-t-2 border-blue-500 rounded-full animate-spin" />
                                    <span className="font-black uppercase tracking-[0.3em] text-[10px]">Caricamento...</span>
                                </div>
                            ) : users.length === 0 ? (
                                <div className="h-full flex flex-col items-center justify-center gap-4 opacity-20">
                                    <User size={64} />
                                    <span className="font-black uppercase tracking-[0.3em] text-[12px]">Nessun utente trovato</span>
                                </div>
                            ) : (
                                users.map((user) => (
                                    <div
                                        key={user.id}
                                        className="group relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-2xl p-5 flex items-center gap-5 hover:bg-[#111113] transition-all"
                                    >
                                        <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br from-[#222] to-[#050505] flex items-center justify-center text-xl font-black text-white border-t border-white/10 border-b border-black shadow-lg relative overflow-hidden`}>
                                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/20 transition-colors" />
                                            {user.full_name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1">
                                            <div className="flex items-center gap-3">
                                                <h4 className="font-black text-white text-lg tracking-tight">{user.full_name}</h4>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getRoleBadge(user.role)}`}>
                                                    {user.role}
                                                </span>
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 opacity-40">
                                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                    <Mail size={12} />
                                                    {user.email}
                                                </div>
                                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${user.is_active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                                                    {user.is_active ? 'ATTIVO' : 'DISATTIVO'}
                                                </div>
                                            </div>
                                        </div>

                                        <button
                                            onClick={() => setUserToDelete(user)}
                                            disabled={user.role === 'admin'}
                                            className={`w-12 h-12 rounded-xl border flex items-center justify-center transition-all active:scale-90
                                                ${user.role === 'admin'
                                                    ? 'bg-white/5 border-white/5 text-white/5 cursor-not-allowed'
                                                    : 'bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white'}`}
                                        >
                                            <Trash2 size={20} />
                                        </button>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Add User Form */}
                    <div className="w-full lg:w-[450px] flex flex-col gap-6">
                        <div className="bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[10px] border-black/40 rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden flex-1">
                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                            <div className="relative z-10 flex flex-col h-full">
                                <div className="mb-8">
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Nuovo Utente</h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">Configura credenziali e ruolo</p>
                                </div>

                                <form onSubmit={handleSubmit} className="flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-2">
                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Username</label>
                                            <div className="relative">
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                                    className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                                    placeholder="nome.cognome"
                                                />
                                                {formErrors.username && <span className="text-[8px] text-red-500 font-bold uppercase mt-1 ml-1">{formErrors.username}</span>}
                                            </div>
                                        </div>
                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Password</label>
                                            <input
                                                type="password"
                                                value={formData.password}
                                                onChange={(e) => handleInputChange('password', e.target.value)}
                                                className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                                placeholder="••••••••"
                                            />
                                            {formErrors.password && <span className="text-[8px] text-red-500 font-bold uppercase mt-1 ml-1">{formErrors.password}</span>}
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Nome Completo</label>
                                        <input
                                            type="text"
                                            value={formData.full_name}
                                            onChange={(e) => handleInputChange('full_name', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                            placeholder="Mario Rossi"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-1.5">
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Indirizzo Email</label>
                                        <input
                                            type="email"
                                            value={formData.email}
                                            onChange={(e) => handleInputChange('email', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                            placeholder="mario@azienda.it"
                                        />
                                    </div>

                                    <div className="flex flex-col gap-3 mt-2">
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Ruolo Accesso</label>
                                        <div className="grid grid-cols-3 gap-3">
                                            {[
                                                { value: 'viewer', label: 'View', icon: User },
                                                { value: 'operator', label: 'Oper', icon: Shield },
                                                { value: 'admin', label: 'Admin', icon: CheckCircle },
                                            ].map((role) => (
                                                <button
                                                    key={role.value}
                                                    type="button"
                                                    onClick={() => handleInputChange('role', role.value)}
                                                    className={`relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-xl px-2 py-4 flex flex-col items-center gap-2 transition-all active:translate-y-1 active:border-b-0 ${formData.role === role.value ? 'bg-blue-500/10 border-blue-500/40 text-blue-400' : 'text-white/20'}`}
                                                >
                                                    <role.icon size={18} />
                                                    <span className={`text-[10px] font-black uppercase tracking-widest ${formData.role === role.value ? 'text-blue-400' : ''}`}>
                                                        {role.label}
                                                    </span>
                                                    {formData.role === role.value && (
                                                        <div className="absolute inset-0 bg-blue-400/5 animate-pulse rounded-xl" />
                                                    )}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="mt-auto pt-6">
                                        <button
                                            type="submit"
                                            disabled={createUserMutation.isPending}
                                            className="w-full relative group"
                                        >
                                            <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-500" />
                                            <div className="relative bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[10px] border-black text-white px-8 py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-sm group-hover:from-[#2a2a2e] group-hover:to-[#0f0f12] active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center gap-3">
                                                {createUserMutation.isPending ? (
                                                    <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                                                ) : (
                                                    <>
                                                        <UserPlus size={18} />
                                                        Crea Utente
                                                    </>
                                                )}
                                            </div>
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* Deletion Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
                    <div className="w-full max-w-md bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[12px] border-black rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden animate-in zoom-in-95 duration-300">
                        <div className="absolute inset-0 bg-gradient-to-br from-red-500/5 to-transparent pointer-events-none" />

                        <div className="relative z-10 flex flex-col items-center text-center">
                            <div className="w-20 h-20 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-6 shadow-lg">
                                <Trash2 size={40} />
                            </div>

                            <h3 className="text-2xl font-black text-white uppercase tracking-widest mb-2">Conferma Eliminazione</h3>
                            <p className="text-white/40 font-medium leading-relaxed">
                                Stai per eliminare definitivamente l'utente <span className="text-white font-black">@{userToDelete.username}</span>. Questa azione non può essere annullata.
                            </p>

                            <div className="grid grid-cols-2 gap-4 w-full mt-10">
                                <button
                                    onClick={() => setUserToDelete(null)}
                                    className="bg-white/5 border-t border-white/10 border-x border-white/5 border-b-[6px] border-black rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-white/40 hover:bg-white/10 active:translate-y-2 active:border-b-0 transition-all"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={confirmDelete}
                                    disabled={deleteUserMutation.isPending}
                                    className="bg-gradient-to-b from-red-500 to-red-900 border-t border-red-400/50 border-x border-red-500/20 border-b-[6px] border-red-950 rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(239,68,68,0.2)] hover:from-red-400 hover:to-red-800 active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center"
                                >
                                    {deleteUserMutation.isPending ? (
                                        <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                                    ) : (
                                        'Elimina'
                                    )}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 14px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 12px;
                    margin: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.5);
                    border: 4px solid transparent;
                    background-clip: padding-box;
                    border-radius: 12px;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.7);
                    border: 4px solid transparent;
                    background-clip: padding-box;
                }
            ` }} />
        </div>
    );
};
