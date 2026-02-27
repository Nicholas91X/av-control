import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ChevronLeft } from 'lucide-react';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useSettings } from '../../context/SettingsContext';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isTablet = useIsTablet();
    const { backgroundColor } = useSettings();

    const isDashboard = location.pathname === '/';
    const isPlayer = location.pathname === '/players';

    return (
        <div
            className={`min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-500 ${isTablet ? 'flex flex-col' : ''}`}
            style={{ backgroundColor: backgroundColor }}
        >
            <div className="flex h-screen overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 overflow-y-auto bg-gray-50 dark:bg-dark-bg focus:outline-none scroll-smooth">
                    <main className={`flex-1 relative ${(isTablet || isPlayer) ? 'py-0 px-0' : 'py-0 px-0'}`}>
                        {/* Back Button */}
                        {((isTablet && !isDashboard) || (!isTablet && !isDashboard)) && (
                            <div className="absolute top-4 left-4 z-50">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center space-x-2 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-4 py-3 rounded-2xl border border-white/10 border-b-4 border-black/40 transition-all active:translate-y-1 active:border-b-0 group shadow-lg backdrop-blur-md"
                                >
                                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-bold tracking-wider uppercase text-[10px]">Dashboard</span>
                                </button>
                            </div>
                        )}

                        <div className={`${isTablet ? 'h-full flex flex-col' : ''}`}>
                            {children}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
};