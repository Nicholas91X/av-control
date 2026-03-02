import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../context/SettingsContext';
import { useAuth } from '../context/AuthContext';
import api from '../lib/api';
import {
    UserPlus, Trash2, Shield, User, CheckCircle,
    Pencil, X, KeyRound, AlertTriangle, Plus, ChevronLeft
} from 'lucide-react';
import { useIsTablet } from '../hooks/useIsTablet';

interface UserRecord {
    id: string;
    username: string;
    role: string;
    full_name: string;
    email: string;
    is_active: boolean;
    is_system_user: boolean;
    must_change_password: boolean;
    created_at: string;
}

interface CreateUserForm {
    username: string;
    password: string;
    role: string;
    full_name: string;
    email: string;
}

interface EditUserForm {
    username: string;
    password: string;
    full_name: string;
}

const ROLE_META = {
    admin:        { label: 'Admin',        color: 'bg-red-100/10 text-red-400 border-red-500/20' },
    installatore: { label: 'Installatore', color: 'bg-blue-100/10 text-blue-400 border-blue-500/20' },
    prete:        { label: 'Prete',        color: 'bg-amber-100/10 text-amber-400 border-amber-500/20' },
};

function getRoleBadge(role: string) {
    return ROLE_META[role as keyof typeof ROLE_META]?.color ?? 'bg-white/5 text-white/40 border-white/5';
}
function getRoleLabel(role: string) {
    return ROLE_META[role as keyof typeof ROLE_META]?.label ?? role;
}

export const UserManagement: React.FC = () => {
    const { backgroundColor } = useSettings();
    const { user: currentUser } = useAuth();
    const navigate = useNavigate();
    const queryClient = useQueryClient();

    const isAdmin = currentUser?.role === 'admin';
    const isInstallatore = currentUser?.role === 'installatore';
    const isPrete = currentUser?.role === 'prete';

    // Create form
    const [formData, setFormData] = useState<CreateUserForm>({
        username: '',
        password: '',
        role: 'prete',
        full_name: '',
        email: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<CreateUserForm>>({});

    // Edit modal
    const [editTarget, setEditTarget] = useState<UserRecord | null>(null);
    const [editForm, setEditForm] = useState<EditUserForm>({ username: '', password: '', full_name: '' });
    const [editError, setEditError] = useState('');

    // Delete confirm
    const [userToDelete, setUserToDelete] = useState<UserRecord | null>(null);

    // Fetch users
    const { data: users = [], isLoading } = useQuery<UserRecord[]>({
        queryKey: ['users'],
        queryFn: async () => {
            const response = await api.get('/users');
            return response.data;
        },
    });

    // Create mutation
    const createMutation = useMutation({
        mutationFn: async (data: CreateUserForm) => {
            const response = await api.post('/users', data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setFormData({ username: '', password: '', role: 'prete', full_name: '', email: '' });
            setFormErrors({});
        },
        onError: (error: any) => {
            setFormErrors({ username: error.response?.data?.error ?? 'Errore nella creazione.' });
        },
    });

    // Edit mutation
    const editMutation = useMutation({
        mutationFn: async ({ id, data }: { id: string; data: Partial<EditUserForm> }) => {
            const response = await api.put(`/users/${id}`, data);
            return response.data;
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setEditTarget(null);
            setEditError('');
        },
        onError: (error: any) => {
            setEditError(error.response?.data?.error ?? 'Errore durante il salvataggio.');
        },
    });

    // Delete mutation
    const deleteMutation = useMutation({
        mutationFn: async (userId: string) => {
            await api.delete(`/users/${userId}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['users'] });
            setUserToDelete(null);
        },
    });

    // Determine which users the current user can edit
    function canEdit(target: UserRecord): boolean {
        if (isAdmin) return true;
        if (isInstallatore) return currentUser?.id === target.id || target.role === 'prete';
        if (isPrete) return currentUser?.id === target.id;
        return false;
    }

    function canDelete(target: UserRecord): boolean {
        return isAdmin && !target.is_system_user && target.id !== currentUser?.id;
    }

    const handleInputChange = (field: keyof CreateUserForm, value: string) => {
        setFormData((prev) => ({ ...prev, [field]: value }));
        if (formErrors[field]) setFormErrors((prev) => ({ ...prev, [field]: undefined }));
    };

    const validateCreateForm = (): boolean => {
        const errors: Partial<CreateUserForm> = {};
        if (!formData.username.trim() || formData.username.length < 3)
            errors.username = 'Minimo 3 caratteri';
        if (!formData.password.trim() || formData.password.length < 6)
            errors.password = 'Minimo 6 caratteri';
        if (!formData.full_name.trim())
            errors.full_name = 'Campo obbligatorio';
        setFormErrors(errors);
        return Object.keys(errors).length === 0;
    };

    const handleCreateSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (validateCreateForm()) createMutation.mutate(formData);
    };

    const openEditModal = (target: UserRecord) => {
        setEditTarget(target);
        setEditForm({ username: target.username, password: '', full_name: target.full_name });
        setEditError('');
    };

    const handleEditSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        setEditError('');
        if (!editTarget) return;

        if (editForm.username.length < 3) {
            setEditError('Il nome utente deve avere almeno 3 caratteri.');
            return;
        }
        if (editForm.password && editForm.password.length < 6) {
            setEditError('La password deve avere almeno 6 caratteri.');
            return;
        }

        const payload: Partial<EditUserForm> = {
            username: editForm.username,
            full_name: editForm.full_name,
        };
        if (editForm.password) payload.password = editForm.password;

        editMutation.mutate({ id: editTarget.id, data: payload });
    };

    // Available roles for create form
    const availableRoles = isAdmin
        ? [
            { value: 'prete',        label: 'Prete',        icon: User },
            { value: 'installatore', label: 'Installatore', icon: Shield },
            { value: 'admin',        label: 'Admin',        icon: CheckCircle },
          ]
        : [
            { value: 'prete', label: 'Prete', icon: User },
          ];

    const pageTitle = isPrete ? 'Il Mio Account' : 'Gestione Utenti';
    const isTablet = useIsTablet();
    const [showCreateSheet, setShowCreateSheet] = useState(false);

    // ============================================
    // RENDER MOBILE VIEW
    // ============================================
    if (!isTablet) {
        return (
            <div
                className="fixed top-0 left-0 right-0 bottom-7 flex flex-col overflow-hidden text-white font-sans"
                style={{ backgroundColor }}
            >
                {/* Header */}
                <div className="shrink-0 px-5 pt-5 pb-3 landscape:pt-2 landscape:pb-1 landscape:px-3">
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={() => navigate('/')} className="p-1.5 -ml-1 rounded-lg text-white/30 active:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        <h1 className="text-lg font-black uppercase tracking-[0.2em]">{pageTitle}</h1>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-blue-500/50 via-transparent to-transparent" />
                </div>

                {/* User List */}
                <div className="flex-1 overflow-y-auto px-4 pb-24 space-y-3 landscape:grid landscape:grid-cols-2 landscape:gap-2 landscape:space-y-0 landscape:px-3 landscape:pb-20">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-12">
                            <div className="w-10 h-10 border-t-2 border-blue-500 rounded-full animate-spin" />
                        </div>
                    ) : users.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-12 opacity-20">
                            <User size={48} />
                            <span className="mt-3 font-black uppercase tracking-[0.3em] text-[10px]">Nessun utente</span>
                        </div>
                    ) : (
                        users.map((u) => (
                            <div
                                key={u.id}
                                className="bg-[#111113] border border-white/5 rounded-xl p-4 flex items-center gap-4"
                            >
                                {/* Avatar */}
                                <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-[#222] to-[#050505] flex items-center justify-center text-base font-black text-white border border-white/10 shrink-0">
                                    {u.full_name.charAt(0).toUpperCase()}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap">
                                        <span className="font-black text-sm text-white truncate">{u.full_name}</span>
                                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase tracking-widest border ${getRoleBadge(u.role)}`}>
                                            {getRoleLabel(u.role)}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-3 mt-0.5">
                                        <span className="font-mono text-[10px] text-white/30">@{u.username}</span>
                                        <div className="flex items-center gap-1 text-[10px] text-white/30">
                                            <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500' : 'bg-red-500'}`} />
                                            {u.is_active ? 'Attivo' : 'Off'}
                                        </div>
                                        {u.is_system_user && <span className="text-[8px] text-white/20 font-bold uppercase">Sistema</span>}
                                        {u.must_change_password && <AlertTriangle size={10} className="text-amber-400" />}
                                    </div>
                                </div>

                                {/* Actions */}
                                <div className="flex gap-1.5 shrink-0">
                                    {canEdit(u) && (
                                        <button
                                            onClick={() => openEditModal(u)}
                                            className="w-9 h-9 rounded-lg border bg-blue-500/10 border-blue-500/20 text-blue-400 flex items-center justify-center active:scale-90"
                                        >
                                            <Pencil size={14} />
                                        </button>
                                    )}
                                    {canDelete(u) && (
                                        <button
                                            onClick={() => setUserToDelete(u)}
                                            className="w-9 h-9 rounded-lg border bg-red-500/10 border-red-500/20 text-red-400 flex items-center justify-center active:scale-90"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))
                    )}
                </div>

                {/* FAB — Create User (admin/installatore only) */}
                {!isPrete && (
                    <button
                        onClick={() => setShowCreateSheet(true)}
                        className="fixed bottom-6 right-6 z-50 w-14 h-14 rounded-2xl bg-blue-500 border border-blue-400/30 border-b-4 border-b-blue-900 text-white flex items-center justify-center shadow-[0_8px_30px_rgba(59,130,246,0.4)] active:translate-y-1 active:border-b-0"
                    >
                        <Plus size={24} />
                    </button>
                )}

                {/* Create User Bottom Sheet */}
                {showCreateSheet && (
                    <div className="fixed inset-0 z-[100] flex items-end">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setShowCreateSheet(false)} />
                        <div className="relative bg-[#1a1a1a] border-t border-white/10 p-6 rounded-t-[2rem] w-full shadow-2xl pb-10 max-h-[85vh] overflow-y-auto">
                            <button onClick={() => setShowCreateSheet(false)} className="absolute top-5 right-5 text-white/30">
                                <X size={24} />
                            </button>
                            <h3 className="text-lg font-black text-white uppercase tracking-widest mb-5">Nuovo Utente</h3>

                            <form onSubmit={handleCreateSubmit} className="space-y-4">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Username</label>
                                        <input
                                            type="text"
                                            value={formData.username}
                                            onChange={(e) => handleInputChange('username', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50 placeholder:text-white/20"
                                            placeholder="nome.cognome"
                                        />
                                        {formErrors.username && <span className="text-[8px] text-red-500 font-bold mt-0.5">{formErrors.username}</span>}
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Password</label>
                                        <input
                                            type="password"
                                            value={formData.password}
                                            onChange={(e) => handleInputChange('password', e.target.value)}
                                            className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50 placeholder:text-white/20"
                                            placeholder="••••••••"
                                        />
                                        {formErrors.password && <span className="text-[8px] text-red-500 font-bold mt-0.5">{formErrors.password}</span>}
                                    </div>
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={formData.full_name}
                                        onChange={(e) => handleInputChange('full_name', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50 placeholder:text-white/20"
                                        placeholder="Mario Rossi"
                                    />
                                    {formErrors.full_name && <span className="text-[8px] text-red-500 font-bold mt-0.5">{formErrors.full_name}</span>}
                                </div>

                                <div>
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Email (opzionale)</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => handleInputChange('email', e.target.value)}
                                        className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50 placeholder:text-white/20"
                                        placeholder="mario@azienda.it"
                                    />
                                </div>

                                {availableRoles.length > 1 && (
                                    <div>
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-2 block">Ruolo</label>
                                        <div className={`grid gap-2 ${availableRoles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                            {availableRoles.map((role) => (
                                                <button
                                                    key={role.value}
                                                    type="button"
                                                    onClick={() => handleInputChange('role', role.value)}
                                                    className={`border rounded-xl px-2 py-3 flex flex-col items-center gap-1.5 transition-all active:scale-95 ${
                                                        formData.role === role.value
                                                            ? 'bg-blue-500/10 border-blue-500/40 text-blue-400'
                                                            : 'bg-[#0a0a0c] border-white/5 text-white/20'
                                                    }`}
                                                >
                                                    <role.icon size={16} />
                                                    <span className="text-[9px] font-black uppercase tracking-widest">{role.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}

                                <button
                                    type="submit"
                                    disabled={createMutation.isPending}
                                    className="w-full mt-3 py-3.5 bg-blue-500 border border-blue-400/30 border-b-4 border-b-blue-900 text-white rounded-xl font-black uppercase tracking-widest text-sm shadow-lg shadow-blue-500/20 active:translate-y-1 active:border-b-0 flex items-center justify-center gap-2"
                                >
                                    {createMutation.isPending ? (
                                        <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                                    ) : (
                                        <>
                                            <UserPlus size={16} />
                                            Crea Utente
                                        </>
                                    )}
                                </button>
                            </form>
                        </div>
                    </div>
                )}

                {/* Edit/Delete modals are shared — rendered below */}
                {editTarget && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-[#161618] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                            <div className="relative z-10">
                                <div className="flex items-center justify-between mb-6">
                                    <div>
                                        <h3 className="text-lg font-black text-white uppercase tracking-widest">Modifica</h3>
                                        <p className="text-[9px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">@{editTarget.username}</p>
                                    </div>
                                    <button onClick={() => setEditTarget(null)} className="w-9 h-9 rounded-xl bg-white/5 border border-white/10 text-white/40 flex items-center justify-center">
                                        <X size={16} />
                                    </button>
                                </div>
                                <form onSubmit={handleEditSubmit} className="space-y-4">
                                    <div>
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Nome Utente</label>
                                        <input type="text" value={editForm.username} onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                                            className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Nome Completo</label>
                                        <input type="text" value={editForm.full_name} onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                                            className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50" />
                                    </div>
                                    <div>
                                        <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] mb-1 block">Nuova Password <span className="normal-case">(lascia vuoto per non cambiare)</span></label>
                                        <input type="password" value={editForm.password} onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))} autoComplete="new-password"
                                            className="w-full bg-[#0a0a0c] border border-white/10 border-b-2 border-b-black rounded-xl px-3 py-2.5 text-white font-bold text-sm outline-none focus:border-blue-500/50 placeholder:text-white/20" placeholder="••••••••" />
                                    </div>
                                    {editError && <p className="text-red-400 text-xs font-bold uppercase text-center">{editError}</p>}
                                    <div className="grid grid-cols-2 gap-3 mt-3">
                                        <button type="button" onClick={() => setEditTarget(null)} className="py-3 bg-white/5 border border-white/10 border-b-2 border-b-black rounded-xl font-bold uppercase tracking-widest text-xs text-white/40 active:translate-y-0.5 active:border-b-0">Annulla</button>
                                        <button type="submit" disabled={editMutation.isPending} className="py-3 bg-blue-500 border border-blue-400/30 border-b-2 border-b-blue-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg active:translate-y-0.5 active:border-b-0 flex items-center justify-center gap-1.5">
                                            {editMutation.isPending ? <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" /> : <><KeyRound size={14} /> Salva</>}
                                        </button>
                                    </div>
                                </form>
                            </div>
                        </div>
                    </div>
                )}

                {userToDelete && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <div className="w-full max-w-md bg-[#161618] border border-white/10 rounded-[2rem] p-6 shadow-2xl relative overflow-hidden">
                            <div className="relative z-10 flex flex-col items-center text-center">
                                <div className="w-16 h-16 rounded-2xl bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-500 mb-5">
                                    <Trash2 size={32} />
                                </div>
                                <h3 className="text-xl font-black text-white uppercase tracking-widest mb-2">Elimina</h3>
                                <p className="text-white/40 text-sm leading-relaxed mb-6">
                                    Stai per eliminare <span className="text-white font-black">@{userToDelete.username}</span>.
                                </p>
                                <div className="grid grid-cols-2 gap-3 w-full">
                                    <button onClick={() => setUserToDelete(null)} className="py-3 bg-white/5 border border-white/10 border-b-2 border-b-black rounded-xl font-bold uppercase tracking-widest text-xs text-white/40 active:translate-y-0.5 active:border-b-0">Annulla</button>
                                    <button onClick={() => deleteMutation.mutate(userToDelete.id)} disabled={deleteMutation.isPending} className="py-3 bg-red-500 border border-red-400/30 border-b-2 border-b-red-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs shadow-lg active:translate-y-0.5 active:border-b-0 flex items-center justify-center">
                                        {deleteMutation.isPending ? <div className="w-4 h-4 border-t-2 border-white rounded-full animate-spin" /> : 'Elimina'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // RENDER TABLET VIEW
    // ============================================

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor }}>
            {/* TOP TITLE */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <UserPlus className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            {pageTitle}
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            <div className="mt-28 flex-1 flex flex-col max-w-[1240px] mx-auto w-full px-8 pb-8 overflow-hidden">
                <div className="flex-1 flex flex-col lg:flex-row gap-8 overflow-hidden">

                    {/* Left Panel: Users List */}
                    <div className="flex-1 flex flex-col bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[10px] border-black/40 rounded-[2.5rem] shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                        <div className="p-8 pb-4 flex items-center justify-between z-10">
                            <div>
                                <h3 className="text-xl font-black text-white uppercase tracking-widest">Utenti</h3>
                                <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">
                                    {users.length} {users.length === 1 ? 'Account' : 'Account'}
                                </p>
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
                                users.map((u) => (
                                    <div
                                        key={u.id}
                                        className="group relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-2xl p-5 flex items-center gap-5 hover:bg-[#111113] transition-all"
                                    >
                                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#222] to-[#050505] flex items-center justify-center text-xl font-black text-white border-t border-white/10 border-b border-black shadow-lg relative overflow-hidden">
                                            <div className="absolute inset-0 bg-blue-500/5 group-hover:bg-blue-500/20 transition-colors" />
                                            {u.full_name.charAt(0).toUpperCase()}
                                        </div>

                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-3 flex-wrap">
                                                <h4 className="font-black text-white text-lg tracking-tight">{u.full_name}</h4>
                                                <span className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border ${getRoleBadge(u.role)}`}>
                                                    {getRoleLabel(u.role)}
                                                </span>
                                                {u.is_system_user && (
                                                    <span className="px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border bg-white/5 text-white/30 border-white/10">
                                                        Sistema
                                                    </span>
                                                )}
                                                {u.must_change_password && (
                                                    <span className="flex items-center gap-1 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-widest border bg-amber-500/10 text-amber-400 border-amber-500/20">
                                                        <AlertTriangle size={9} /> Cambio richiesto
                                                    </span>
                                                )}
                                            </div>
                                            <div className="flex items-center gap-4 mt-1 opacity-40">
                                                <span className="font-mono text-[11px]">@{u.username}</span>
                                                <div className="flex items-center gap-1.5 font-mono text-[11px]">
                                                    <span className={`w-1.5 h-1.5 rounded-full ${u.is_active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                                                    {u.is_active ? 'ATTIVO' : 'DISATTIVO'}
                                                </div>
                                            </div>
                                        </div>

                                        <div className="flex gap-2">
                                            {canEdit(u) && (
                                                <button
                                                    onClick={() => openEditModal(u)}
                                                    className="w-12 h-12 rounded-xl border bg-blue-500/10 border-blue-500/20 text-blue-400 hover:bg-blue-500 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                                >
                                                    <Pencil size={18} />
                                                </button>
                                            )}
                                            {canDelete(u) ? (
                                                <button
                                                    onClick={() => setUserToDelete(u)}
                                                    className="w-12 h-12 rounded-xl border bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-all active:scale-90"
                                                >
                                                    <Trash2 size={18} />
                                                </button>
                                            ) : (
                                                <div className="w-12 h-12 rounded-xl border bg-white/5 border-white/5 text-white/5 flex items-center justify-center cursor-not-allowed">
                                                    <Trash2 size={18} />
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Right Panel: Create User (only for admin / installatore) */}
                    {!isPrete && (
                        <div className="w-full lg:w-[420px] flex flex-col gap-6">
                            <div className="bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[10px] border-black/40 rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden flex-1">
                                <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                                <div className="relative z-10 flex flex-col h-full">
                                    <div className="mb-8">
                                        <h3 className="text-xl font-black text-white uppercase tracking-widest">Nuovo Utente</h3>
                                        <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">
                                            {isInstallatore ? 'Crea account prete' : 'Configura credenziali e ruolo'}
                                        </p>
                                    </div>

                                    <form onSubmit={handleCreateSubmit} className="flex-1 flex flex-col gap-5 overflow-y-auto custom-scrollbar pr-2">
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="flex flex-col gap-1.5">
                                                <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Username</label>
                                                <input
                                                    type="text"
                                                    value={formData.username}
                                                    onChange={(e) => handleInputChange('username', e.target.value)}
                                                    className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                                    placeholder="nome.cognome"
                                                />
                                                {formErrors.username && <span className="text-[8px] text-red-500 font-bold uppercase mt-1 ml-1">{formErrors.username}</span>}
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
                                            {formErrors.full_name && <span className="text-[8px] text-red-500 font-bold uppercase mt-1 ml-1">{formErrors.full_name}</span>}
                                        </div>

                                        <div className="flex flex-col gap-1.5">
                                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Email (opzionale)</label>
                                            <input
                                                type="email"
                                                value={formData.email}
                                                onChange={(e) => handleInputChange('email', e.target.value)}
                                                className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                                placeholder="mario@azienda.it"
                                            />
                                        </div>

                                        {availableRoles.length > 1 && (
                                            <div className="flex flex-col gap-3 mt-2">
                                                <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Ruolo Accesso</label>
                                                <div className={`grid gap-3 ${availableRoles.length === 3 ? 'grid-cols-3' : 'grid-cols-2'}`}>
                                                    {availableRoles.map((role) => (
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
                                        )}

                                        <div className="mt-auto pt-6">
                                            <button
                                                type="submit"
                                                disabled={createMutation.isPending}
                                                className="w-full relative group"
                                            >
                                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-60 transition duration-500" />
                                                <div className="relative bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[10px] border-black text-white px-8 py-5 rounded-2xl font-black uppercase tracking-[0.4em] text-sm group-hover:from-[#2a2a2e] active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center gap-3">
                                                    {createMutation.isPending ? (
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
                    )}
                </div>
            </div>

            {/* Edit User Modal */}
            {editTarget && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[12px] border-black rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
                        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-transparent pointer-events-none" />

                        <div className="relative z-10">
                            <div className="flex items-center justify-between mb-8">
                                <div>
                                    <h3 className="text-xl font-black text-white uppercase tracking-widest">Modifica Utente</h3>
                                    <p className="text-[10px] font-bold text-white/20 uppercase tracking-[0.3em] mt-1">
                                        @{editTarget.username}
                                    </p>
                                </div>
                                <button
                                    onClick={() => setEditTarget(null)}
                                    className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 text-white/40 hover:bg-white/10 hover:text-white flex items-center justify-center transition-all"
                                >
                                    <X size={18} />
                                </button>
                            </div>

                            <form onSubmit={handleEditSubmit} className="flex flex-col gap-5">
                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Nome Utente</label>
                                    <input
                                        type="text"
                                        value={editForm.username}
                                        onChange={(e) => setEditForm((p) => ({ ...p, username: e.target.value }))}
                                        className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Nome Completo</label>
                                    <input
                                        type="text"
                                        value={editForm.full_name}
                                        onChange={(e) => setEditForm((p) => ({ ...p, full_name: e.target.value }))}
                                        className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all"
                                    />
                                </div>

                                <div className="flex flex-col gap-1.5">
                                    <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">
                                        Nuova Password <span className="normal-case">(lascia vuoto per non cambiare)</span>
                                    </label>
                                    <input
                                        type="password"
                                        value={editForm.password}
                                        onChange={(e) => setEditForm((p) => ({ ...p, password: e.target.value }))}
                                        autoComplete="new-password"
                                        className="w-full bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[4px] border-black rounded-xl px-4 py-3 text-white font-black outline-none focus:border-blue-500/50 transition-all placeholder:text-white/20"
                                        placeholder="••••••••"
                                    />
                                </div>

                                {editError && (
                                    <p className="text-red-400 text-xs font-bold uppercase tracking-widest text-center">{editError}</p>
                                )}

                                <div className="grid grid-cols-2 gap-4 mt-4">
                                    <button
                                        type="button"
                                        onClick={() => setEditTarget(null)}
                                        className="bg-white/5 border-t border-white/10 border-x border-white/5 border-b-[6px] border-black rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-white/40 hover:bg-white/10 active:translate-y-2 active:border-b-0 transition-all"
                                    >
                                        Annulla
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={editMutation.isPending}
                                        className="bg-gradient-to-b from-blue-600 to-blue-900 border-t border-blue-400/50 border-x border-blue-500/20 border-b-[6px] border-blue-950 rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(59,130,246,0.2)] hover:from-blue-500 active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center gap-2"
                                    >
                                        {editMutation.isPending ? (
                                            <div className="w-5 h-5 border-t-2 border-white rounded-full animate-spin" />
                                        ) : (
                                            <>
                                                <KeyRound size={16} />
                                                Salva
                                            </>
                                        )}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {userToDelete && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-md bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[12px] border-black rounded-[2.5rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative overflow-hidden">
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
                                    onClick={() => deleteMutation.mutate(userToDelete.id)}
                                    disabled={deleteMutation.isPending}
                                    className="bg-gradient-to-b from-red-500 to-red-900 border-t border-red-400/50 border-x border-red-500/20 border-b-[6px] border-red-950 rounded-2xl px-6 py-4 font-black uppercase tracking-widest text-white shadow-[0_10px_30px_rgba(239,68,68,0.2)] hover:from-red-400 active:translate-y-2 active:border-b-0 transition-all flex items-center justify-center"
                                >
                                    {deleteMutation.isPending ? (
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
                .custom-scrollbar::-webkit-scrollbar { width: 14px; }
                .custom-scrollbar::-webkit-scrollbar-track { background: rgba(0,0,0,0.4); border-radius: 12px; margin: 8px; }
                .custom-scrollbar::-webkit-scrollbar-thumb { background: rgba(59,130,246,0.5); border: 4px solid transparent; background-clip: padding-box; border-radius: 12px; }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: rgba(59,130,246,0.7); border: 4px solid transparent; background-clip: padding-box; }
            ` }} />
        </div>
    );
};
