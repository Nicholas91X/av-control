import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useSettings } from '../context/SettingsContext';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { UserPlus, Trash2, Shield, User, Mail, Calendar, CheckCircle, XCircle } from 'lucide-react';

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
    const { highlightColor } = useSettings();
    const queryClient = useQueryClient();
    const [showCreateForm, setShowCreateForm] = useState(false);
    const [formData, setFormData] = useState<CreateUserForm>({
        username: '',
        password: '',
        role: 'viewer',
        full_name: '',
        email: '',
    });
    const [formErrors, setFormErrors] = useState<Partial<CreateUserForm>>({});

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
            setShowCreateForm(false);
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

    const handleDelete = (userId: string, username: string) => {
        if (window.confirm(`Are you sure you want to delete user "${username}"?`)) {
            deleteUserMutation.mutate(userId);
        }
    };

    const getRoleBadge = (role: string) => {
        const styles = {
            admin: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400',
            operator: 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
            viewer: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400',
        };
        return styles[role as keyof typeof styles] || styles.viewer;
    };

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
                    <p className="text-gray-500 dark:text-gray-400">Manage system users and permissions</p>
                </div>
                <Button
                    variant="primary"
                    onClick={() => setShowCreateForm(!showCreateForm)}
                    disabled={createUserMutation.isPending}
                >
                    <UserPlus className="w-5 h-5 mr-2" />
                    {showCreateForm ? 'Cancel' : 'Add User'}
                </Button>
            </div>

            {/* Create User Form */}
            {showCreateForm && (
                <Card title="Create New User" subtitle="Add a new user to the system">
                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Input
                                label="Username"
                                type="text"
                                value={formData.username}
                                onChange={(e) => handleInputChange('username', e.target.value)}
                                placeholder="john.doe"
                                icon={User}
                                error={formErrors.username}
                                required
                            />

                            <Input
                                label="Password"
                                type="password"
                                value={formData.password}
                                onChange={(e) => handleInputChange('password', e.target.value)}
                                placeholder="••••••••"
                                error={formErrors.password}
                                required
                            />

                            <Input
                                label="Full Name"
                                type="text"
                                value={formData.full_name}
                                onChange={(e) => handleInputChange('full_name', e.target.value)}
                                placeholder="John Doe"
                                error={formErrors.full_name}
                                required
                            />

                            <Input
                                label="Email"
                                type="email"
                                value={formData.email}
                                onChange={(e) => handleInputChange('email', e.target.value)}
                                placeholder="john.doe@example.com"
                                icon={Mail}
                                error={formErrors.email}
                                required
                            />

                            <div className="md:col-span-2">
                                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                                    Role
                                </label>
                                <div className="grid grid-cols-3 gap-3">
                                    {[
                                        { value: 'viewer', label: 'Viewer', desc: 'Read-only access' },
                                        { value: 'operator', label: 'Operator', desc: 'Control devices' },
                                        { value: 'admin', label: 'Admin', desc: 'Full access' },
                                    ].map((role) => (
                                        <button
                                            key={role.value}
                                            type="button"
                                            onClick={() => handleInputChange('role', role.value)}
                                            className={`p-4 rounded-2xl border border-b-4 transition-all text-left active:translate-y-1 active:border-b-0 ${formData.role === role.value
                                                ? 'bg-clip-padding border-white/10'
                                                : 'border-gray-200 border-b-gray-400 dark:border-white/10 dark:border-b-black/60 dark:bg-[#1a1a1c] hover:border-gray-300 dark:hover:border-white/20'
                                                }`}
                                            style={formData.role === role.value ? { backgroundColor: `${highlightColor}33`, borderColor: highlightColor, borderBottomColor: highlightColor } : {}}
                                        >
                                            <p className={`font-black uppercase tracking-widest text-[10px] ${formData.role === role.value ? '' : 'text-gray-500 dark:text-white/40'}`} style={formData.role === role.value ? { color: highlightColor } : {}}>
                                                {role.label}
                                            </p>
                                            <p className={`text-xl font-black mt-1 ${formData.role === role.value ? 'text-gray-900 dark:text-white' : 'text-gray-400 dark:text-white/20'}`}>
                                                {role.desc}
                                            </p>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        <div className="flex space-x-3 pt-4">
                            <Button
                                type="submit"
                                variant="primary"
                                isLoading={createUserMutation.isPending}
                                disabled={createUserMutation.isPending}
                            >
                                Create User
                            </Button>
                            <Button
                                type="button"
                                variant="secondary"
                                onClick={() => {
                                    setShowCreateForm(false);
                                    setFormErrors({});
                                }}
                                disabled={createUserMutation.isPending}
                            >
                                Cancel
                            </Button>
                        </div>
                    </form>
                </Card>
            )}

            {/* Users List */}
            <Card title={`Users (${users.length})`} subtitle="All registered users">
                {isLoading ? (
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Loading users...</p>
                    </div>
                ) : users.length === 0 ? (
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <User className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No users found</p>
                        <p className="text-sm mt-1">Create your first user to get started</p>
                    </div>
                ) : (
                    <div className="overflow-x-auto">
                        <table className="w-full">
                            <thead className="bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700">
                                <tr>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        User
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Role
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Email
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Status
                                    </th>
                                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Created
                                    </th>
                                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Actions
                                    </th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                                {users.map((user) => (
                                    <tr
                                        key={user.id}
                                        className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
                                    >
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold">
                                                    {user.full_name.charAt(0).toUpperCase()}
                                                </div>
                                                <div className="ml-4">
                                                    <p className="text-sm font-medium text-gray-900 dark:text-white">
                                                        {user.full_name}
                                                    </p>
                                                    <p className="text-sm text-gray-500 dark:text-gray-400">
                                                        @{user.username}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <span
                                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getRoleBadge(
                                                    user.role
                                                )}`}
                                            >
                                                <Shield className="w-3 h-3 mr-1" />
                                                {user.role}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                <Mail className="w-4 h-4 mr-2" />
                                                {user.email}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            {user.is_active ? (
                                                <span className="inline-flex items-center text-green-700 dark:text-green-400 text-sm">
                                                    <CheckCircle className="w-4 h-4 mr-1" />
                                                    Active
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center text-gray-500 dark:text-gray-400 text-sm">
                                                    <XCircle className="w-4 h-4 mr-1" />
                                                    Inactive
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
                                                <Calendar className="w-4 h-4 mr-2" />
                                                {new Date(user.created_at).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right">
                                            <Button
                                                variant="danger"
                                                size="sm"
                                                onClick={() => handleDelete(user.id, user.username)}
                                                disabled={deleteUserMutation.isPending}
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </Button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </Card>
        </div>
    );
};
