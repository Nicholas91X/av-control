import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    X,
    Mic,
    Video,
    HardDrive
} from 'lucide-react';
import { Button } from '../ui/Button';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Players', href: '/players', icon: Mic },
        { name: 'Recorders', href: '/recorders', icon: HardDrive },
        { name: 'Controls', href: '/controls', icon: Video },
    ];

    if (user?.role === 'admin') {
        navigation.push({ name: 'User Management', href: '/users', icon: Users });
    }

    const isActive = (path: string) => location.pathname === path;

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-200">
            {/* Mobile Header */}
            <div className="lg:hidden bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-40">
                <Link to="/" className="flex items-center space-x-2">
                    <div className="bg-primary-600 rounded-lg p-1.5">
                        <LayoutDashboard className="w-5 h-5 text-white" />
                    </div>
                    <span className="text-xl font-bold text-gray-900 dark:text-white">AV Control</span>
                </Link>
                <button
                    onClick={() => setSidebarOpen(!sidebarOpen)}
                    className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover"
                >
                    {sidebarOpen ? <X /> : <Menu />}
                </button>
            </div>

            <div className="flex h-screen overflow-hidden">
                {/* Sidebar */}
                <div className={`
          fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col
          ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
        `}>
                    <div className="p-6 hidden lg:flex items-center space-x-3">
                        <div className="bg-primary-600 rounded-lg p-2">
                            <LayoutDashboard className="w-6 h-6 text-white" />
                        </div>
                        <span className="text-xl font-bold text-gray-900 dark:text-white">AV Control</span>
                    </div>

                    <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
                        {navigation.map((item) => {
                            const Icon = item.icon;
                            const active = isActive(item.href);
                            return (
                                <Link
                                    key={item.name}
                                    to={item.href}
                                    onClick={() => setSidebarOpen(false)}
                                    className={`
                    flex items-center px-4 py-3 text-sm font-medium rounded-xl transition-all duration-200 group
                    ${active
                                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-600 dark:text-primary-400'
                                            : 'text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-dark-hover hover:text-gray-900 dark:hover:text-white'
                                        }
                  `}
                                >
                                    <Icon className={`mr-3 h-5 w-5 ${active ? 'text-primary-600 dark:text-primary-400' : 'text-gray-400 group-hover:text-gray-500 dark:group-hover:text-gray-300'}`} />
                                    {item.name}
                                </Link>
                            );
                        })}
                    </div>

                    <div className="p-4 border-t border-gray-200 dark:border-gray-800">
                        <div className="flex items-center space-x-3 mb-4 px-2">
                            <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center text-primary-700 dark:text-primary-300 font-semibold">
                                {user?.name?.charAt(0) || 'U'}
                            </div>
                            <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                                    {user?.name}
                                </p>
                                <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                                    {user?.role}
                                </p>
                            </div>
                        </div>
                        <Button
                            variant="ghost"
                            fullWidth
                            onClick={logout}
                            className="justify-start text-red-600 hover:bg-red-50 hover:text-red-700 dark:text-red-400 dark:hover:bg-red-900/20"
                        >
                            <LogOut className="mr-3 h-5 w-5" />
                            Sign Out
                        </Button>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg focus:outline-none scroll-smooth">
                    <main className="flex-1 relative py-8 px-6 lg:px-12">
                        <div className="max-w-7xl mx-auto">
                            {children}
                        </div>
                    </main>
                </div>

                {/* Sidebar Overlay (Mobile) */}
                {sidebarOpen && (
                    <div
                        className="fixed inset-0 bg-gray-900/50 z-20 lg:hidden backdrop-blur-sm"
                        onClick={() => setSidebarOpen(false)}
                    />
                )}
            </div>
        </div>
    );
};
