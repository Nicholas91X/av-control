import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
    LayoutDashboard,
    Users,
    LogOut,
    Menu,
    X,
    Mic,
    Video,
    HardDrive,
    Settings,
    ChevronLeft
} from 'lucide-react';
import { Button } from '../ui/Button';
import { WebSocketStatus } from '../WebSocketStatus';
import { VersionDisplay } from './VersionDisplay';
import { useIsTablet } from '../../hooks/useIsTablet';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const isTablet = useIsTablet();
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const navigation = [
        { name: 'Dashboard', href: '/', icon: LayoutDashboard },
        { name: 'Presets', href: '/presets', icon: Settings },
        { name: 'Players', href: '/players', icon: Mic },
        { name: 'Recorders', href: '/recorders', icon: HardDrive },
        { name: 'Controls', href: '/controls', icon: Video },
    ];

    if (user?.role === 'admin') {
        navigation.push({ name: 'User Management', href: '/users', icon: Users });
    }

    const isActive = (path: string) => location.pathname === path;
    const isDashboard = location.pathname === '/';

    return (
        <div className={`min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-200 ${isTablet ? 'flex flex-col' : ''}`}>
            {/* Mobile Header - Hidden if tablet */}
            {!isTablet && (
                <div className="lg:hidden bg-white dark:bg-dark-surface border-b border-gray-200 dark:border-gray-800 p-4 flex items-center justify-between sticky top-0 z-40">
                    <Link to="/" className="flex items-center space-x-2">
                        <img
                            src="/verbumdigital-logo.png"
                            alt="VerbumDigital"
                            className="h-8 w-8 object-contain"
                        />
                        <span className="text-xl font-bold text-gray-900 dark:text-white">VerbumDigital</span>
                    </Link>
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="p-2 rounded-lg text-gray-600 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-dark-hover"
                    >
                        {sidebarOpen ? <X /> : <Menu />}
                    </button>
                </div>
            )}

            <div className="flex h-screen overflow-hidden">
                {/* Sidebar - Hidden if tablet */}
                {!isTablet && (
                    <div className={`
              fixed inset-y-0 left-0 z-30 w-64 bg-white dark:bg-dark-surface border-r border-gray-200 dark:border-gray-800 transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-auto lg:flex lg:flex-col
              ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}
            `}>
                        <div className="p-6 hidden lg:flex items-center space-x-3">
                            <img
                                src="/verbumdigital-logo.png"
                                alt="VerbumDigital"
                                className="h-10 w-10 object-contain"
                            />
                            <span className="text-xl font-bold text-gray-900 dark:text-white">VerbumDigital</span>
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
                            <div className="mb-3 px-2">
                                <WebSocketStatus />
                            </div>
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
                )}

                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg focus:outline-none scroll-smooth">
                    <main className={`flex-1 relative ${isTablet ? 'py-0 px-0' : 'py-8 px-6 lg:px-12'}`}>
                        {/* Tablet Back Button */}
                        {isTablet && !isDashboard && (
                            <div className="fixed top-8 left-8 z-50">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-5 py-3 rounded-2xl border border-white/10 transition-all active:scale-95 group shadow-2xl backdrop-blur-md"
                                >
                                    <ChevronLeft className="w-6 h-6 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-bold tracking-widest uppercase text-xs">Torna alla Dashboard</span>
                                </button>
                            </div>
                        )}

                        <div className={`${isTablet ? 'h-full flex flex-col' : 'max-w-7xl mx-auto'}`}>
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
            {/* Footer con versione - AGGIUNGI QUESTO */}
            {!isTablet && (
                <footer className="mt-auto py-3 px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                    <div className="flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
                        <div>
                            © 2026 AV Control System
                        </div>
                        <VersionDisplay />
                    </div>
                </footer>
            )}
        </div>
    );
};