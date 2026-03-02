import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import {
    ChevronLeft,
    Maximize2,
    Minimize2
} from 'lucide-react';
import { VersionDisplay } from './VersionDisplay';
import { useIsTablet } from '../../hooks/useIsTablet';
import { useSettings } from '../../context/SettingsContext';
import { HardwareStatusBanner } from '../HardwareStatusBanner';

interface LayoutProps {
    children: React.ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
    const location = useLocation();
    const navigate = useNavigate();
    const isTablet = useIsTablet();
    const { backgroundColor } = useSettings();
    const [isFullscreen, setIsFullscreen] = useState(false);

    useEffect(() => {
        const handler = () => setIsFullscreen(!!document.fullscreenElement);
        document.addEventListener('fullscreenchange', handler);
        return () => document.removeEventListener('fullscreenchange', handler);
    }, []);

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(console.error);
        } else {
            document.exitFullscreen().catch(console.error);
        }
    };

    const isDashboard = location.pathname === '/';

    return (
        <div
            className={`min-h-screen bg-gray-50 dark:bg-dark-bg transition-colors duration-500 flex flex-col`}
            style={{ backgroundColor: backgroundColor }}
        >
            <HardwareStatusBanner />

            <div className="flex flex-1 h-screen overflow-hidden">
                {/* Main Content */}
                <div className="flex-1 overflow-y-auto focus:outline-none scroll-smooth bg-transparent">
                    <main className="flex-1 relative py-0 px-0">
                        {/* Back to Desktop Button — tablet only (mobile pages have inline back buttons) */}
                        {!isDashboard && isTablet && (
                            <div className="fixed top-6 left-6 z-50">
                                <button
                                    onClick={() => navigate('/')}
                                    className="flex items-center space-x-1.5 bg-white/5 hover:bg-white/10 text-white/70 hover:text-white px-3 py-2 rounded-xl border border-white/10 border-b-4 border-black/40 transition-all active:translate-y-1 active:border-b-0 group shadow-2xl backdrop-blur-md"
                                >
                                    <ChevronLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                                    <span className="font-bold tracking-widest uppercase text-[10px]">Desktop</span>
                                </button>
                            </div>
                        )}

                        <div className="h-full flex flex-col">
                            {children}
                        </div>
                    </main>
                </div>
            </div>

            {/* Footer - always visible everywhere */}
            <footer className={isTablet
                ? "mt-auto py-3 px-6 border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800"
                : "fixed bottom-0 left-0 right-0 z-[9980] py-1.5 landscape:py-1 px-3 border-t border-white/5 bg-black/60 backdrop-blur-md"
            }>
                <div className={isTablet
                    ? "flex items-center justify-between text-xs text-gray-500 dark:text-gray-400"
                    : "flex items-center justify-between text-[9px] text-white/25"
                }>
                    <a href="https://verbumdigital.com/it/" target="_blank" rel="noopener noreferrer" className="flex items-center gap-1.5 hover:opacity-70 transition-opacity">
                        <img src="/verbumdigital-logo.png" alt="VerbumDigital" className={isTablet ? "h-4 w-4 object-contain opacity-60" : "h-3 w-3 object-contain opacity-40"} />
                        <span>VerbumDigital</span>
                    </a>
                    <div className="flex items-center gap-2">
                        <button
                            onClick={toggleFullscreen}
                            title={isFullscreen ? 'Esci da schermo intero' : 'Schermo intero'}
                            className="hover:text-gray-800 dark:hover:text-white transition-colors"
                        >
                            {isFullscreen ? <Minimize2 size={isTablet ? 13 : 11} /> : <Maximize2 size={isTablet ? 13 : 11} />}
                        </button>
                        <VersionDisplay />
                    </div>
                </div>
            </footer>
        </div>
    );
};