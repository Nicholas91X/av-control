import React, { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useWebSocket } from '../context/WebSocketContext';
import {
    Mic2,
    Disc,
    Circle,
    Sliders,
    Globe,
    Home,
    Wrench,
    X,
    Wifi,
    WifiOff,
    LogOut,
    Users,
    Cpu
} from 'lucide-react';
import { CircleTile } from '../components/dashboard/CircleTile';
import { useSettings } from '../context/SettingsContext';

export const MobileDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { status } = useWebSocket();
    const { backgroundColor, parishName } = useSettings();

    // Hardware daemon connection status
    interface SystemStatus {
        connected: boolean;
        preset?: { id: string };
        player?: { state: string; song_title?: string; repeat_mode?: string };
        recorder?: { state: string };
    }

    const { data: systemStatus } = useQuery<SystemStatus>({
        queryKey: ['system', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/status');
            return response.data;
        },
        refetchInterval: 5000, 
    });

    const isHardwareConnected = systemStatus?.connected ?? false;

    // Tooltip state (long-press for touch, hover for desktop)
    const [visibleTooltip, setVisibleTooltip] = useState<'ws' | 'hw' | null>(null);
    const longPressTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    useEffect(() => {
        if (!visibleTooltip) return;
        const timer = setTimeout(() => setVisibleTooltip(null), 4000);
        return () => clearTimeout(timer);
    }, [visibleTooltip]);
    const startLongPress = (key: 'ws' | 'hw') => {
        longPressTimerRef.current = setTimeout(() => setVisibleTooltip(key), 600);
    };
    const cancelLongPress = () => {
        if (longPressTimerRef.current) { clearTimeout(longPressTimerRef.current); longPressTimerRef.current = null; }
    };

    // Modal state management with animations
    const useModalAnimation = (initialState: boolean) => {
        const [isOpen, setIsOpen] = useState(initialState);
        const [isRendered, setIsRendered] = useState(initialState);

        const open = () => {
            setIsRendered(true);
            setTimeout(() => setIsOpen(true), 10);
        };

        const close = () => {
            setIsOpen(false);
            setTimeout(() => {
                setIsRendered(false);
            }, 500); 
        };

        return { isOpen, isRendered, open, close };
    };

    const homeModal = useModalAnimation(false);
    const logoutModal = useModalAnimation(false);

    const { data: versionData } = useQuery({
        queryKey: ['version'],
        queryFn: async () => {
            const response = await api.get('/version', { baseURL: '/' });
            return response.data;
        },
    });

    // Daemon system info
    interface SystemInfo {
        connected: boolean;
        ip: string;
        name: string;
        serial: string;
        version: string;
    }

    const { data: systemInfo } = useQuery<SystemInfo>({
        queryKey: ['system', 'info'],
        queryFn: async () => {
            const response = await api.get('/device/info');
            return response.data;
        },
        refetchInterval: 10000,
    });

    const wsStatusItalian = status === 'connected' ? 'connesso' : status === 'connecting' ? 'connessione in corso…' : 'disconnesso';
    const hwStatusItalian = isHardwareConnected ? 'connesso' : 'disconnesso';

    // 6 items around the circle (Standby removed)
    const numItems = 6;
    const circleRadius = "32vmin"; 

    const surroundingItems = [
        { icon: Mic2, label: "SCENARIO", glowColor: "#f59e0b", action: () => navigate('/presets'), className: '', iconClassName: '' },
        { icon: Disc, label: "PLAYER", glowColor: "#3b82f6", action: () => navigate('/players'), className: '', iconClassName: '' },
        { icon: Globe, label: "STREAM", glowColor: "#6366f1", action: () => navigate('/streaming'), className: '', iconClassName: '' },
        { icon: Wrench, label: "IMPOSTA", glowColor: "#64748b", action: () => navigate('/settings'), className: '', iconClassName: '' },
        { icon: Sliders, label: "CONTROL", glowColor: "#10b981", action: () => navigate('/controls'), className: '', iconClassName: '' },
        { icon: Circle, label: "RECORD", glowColor: "#ef4444", action: () => navigate('/recorders'), className: '', iconClassName: "text-red-500 fill-red-500/20" },
    ];

    return (
        <div
            className="fixed top-0 left-0 right-0 bottom-7 bg-black text-gray-900 dark:text-white overflow-hidden font-sans selection:bg-primary-500/30 transition-colors duration-500"
            style={{ backgroundColor: backgroundColor }}
        >
            {/* Background Light Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="h-full w-full mx-auto px-4 py-8 landscape:py-2 flex flex-col items-center justify-between">

                {/* Layout Wrapper for Landscape Support */}
                <div className="flex-1 w-full flex flex-col landscape:flex-row items-center landscape:items-stretch justify-between landscape:justify-center">
                    
                    {/* Top Section: Header Actions + Title */}
                    <div className="w-full landscape:w-[35%] landscape:h-full landscape:flex landscape:flex-col landscape:justify-center">
                    {/* Header: Actions */}
                    <div className="w-full flex items-center justify-between min-h-[48px] z-10 mb-6">
                        {/* Left Actions — WS + Daemon with tooltips */}
                        <div className="flex items-center space-x-2">
                            {/* WebSocket */}
                            <div
                                className="relative"
                                onMouseEnter={() => setVisibleTooltip('ws')}
                                onMouseLeave={() => { setVisibleTooltip(null); cancelLongPress(); }}
                                onTouchStart={(e) => { e.preventDefault(); startLongPress('ws'); }}
                                onTouchEnd={cancelLongPress}
                                onTouchMove={cancelLongPress}
                            >
                                <div
                                    className={`p-2 rounded-xl border border-b-2 shadow-lg ${status === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                        status === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 animate-pulse' :
                                            'bg-red-500/10 border-red-500/20 text-red-500'
                                        }`}
                                >
                                    {status === 'connected' ? <Wifi size={18} /> : <WifiOff size={18} />}
                                </div>
                                {visibleTooltip === 'ws' && (
                                    <div className="absolute top-full left-0 mt-2 z-[200] bg-black/90 border border-white/10 rounded-xl px-3 py-2 shadow-xl backdrop-blur-md pointer-events-none">
                                        <p className="text-[11px] font-bold text-white/90 whitespace-nowrap">WebSocket</p>
                                        <p className="text-[10px] text-white/40 whitespace-nowrap">Aggiornamenti in tempo reale</p>
                                        <p className={`text-[10px] font-bold mt-0.5 whitespace-nowrap ${status === 'connected' ? 'text-green-400' : status === 'connecting' ? 'text-yellow-400' : 'text-red-400'}`}>
                                            {wsStatusItalian}
                                        </p>
                                    </div>
                                )}
                            </div>
                            {/* Daemon */}
                            <div
                                className="relative"
                                onMouseEnter={() => setVisibleTooltip('hw')}
                                onMouseLeave={() => { setVisibleTooltip(null); cancelLongPress(); }}
                                onTouchStart={(e) => { e.preventDefault(); startLongPress('hw'); }}
                                onTouchEnd={cancelLongPress}
                                onTouchMove={cancelLongPress}
                            >
                                <div
                                    className={`p-2 rounded-xl border border-b-2 shadow-lg ${isHardwareConnected
                                        ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                        : 'bg-red-500/10 border-red-500/20 text-red-500'
                                        }`}
                                >
                                    <Cpu size={18} />
                                </div>
                                {visibleTooltip === 'hw' && (
                                    <div className="absolute top-full left-0 mt-2 z-[200] bg-black/90 border border-white/10 rounded-xl px-3 py-2 shadow-xl backdrop-blur-md pointer-events-none">
                                        <p className="text-[11px] font-bold text-white/90 whitespace-nowrap">Hardware Daemon</p>
                                        <p className="text-[10px] text-white/40 whitespace-nowrap">Connessione al dispositivo</p>
                                        <p className={`text-[10px] font-bold mt-0.5 whitespace-nowrap ${isHardwareConnected ? 'text-green-400' : 'text-red-400'}`}>
                                            {hwStatusItalian}
                                        </p>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* Right Actions — Users + Logout (Info removed) */}
                        <div className="flex items-center space-x-2">
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/users')}
                                    className="p-2 text-white/40 bg-[#2a2a2e] rounded-xl border-t border-t-white/10 border-x border-x-white/5 border-b-2 border-b-white/10 shadow-lg"
                                >
                                    <Users size={18} />
                                </button>
                            )}
                            <button
                                onClick={logoutModal.open}
                                className="p-2 text-red-500/40 bg-[#2a2a2e] rounded-xl border-t border-t-red-400/20 border-x border-x-red-400/10 border-b-2 border-b-red-950 shadow-lg"
                                style={{marginLeft:"0.5rem"}}
                            >
                                <LogOut size={18} />
                            </button>
                        </div>
                    </div>

                    {/* Main Title Row */}
                    <div className="w-full text-center">
                        <h1 
                            className="text-3xl md:text-4xl font-black tracking-tight text-white/90"
                            style={{
                                textShadow: '0 1px 0 rgba(255,255,255,0.15), 0 -1px 0 rgba(0,0,0,0.8), 0 4px 8px rgba(0,0,0,0.6), 0 0 20px rgba(255,255,255,0.05)'
                            }}
                        >
                            {parishName}
                        </h1>
                    </div>
                </div>

                {/* Main Content Area - Circular Layout */}
                <div className="flex-1 w-full landscape:w-[65%] landscape:h-full relative flex items-center justify-center">
                    {/* The Central Button */}
                    <div className="z-10 absolute pointer-events-auto flex items-center justify-center pt-8 landscape:pt-0">
                        <CircleTile
                            icon={Home}
                            label="HOME"
                            size="large"
                            glowColor="#3b82f6"
                            className="border-white/10"
                            onClick={homeModal.open}
                        />
                    </div>

                    {/* The Surrounding Buttons */}
                    {surroundingItems.map((item, index) => {
                        const angle = (-Math.PI / 2) + (index * ((2 * Math.PI) / numItems));

                        return (
                            <div 
                                key={index} 
                                className="absolute flex items-center justify-center pointer-events-auto pt-8 landscape:pt-0"
                                style={{
                                    transform: `translate(calc(cos(${angle}rad) * ${circleRadius}), calc(sin(${angle}rad) * ${circleRadius}))`
                                }}
                            >
                                <CircleTile
                                    icon={item.icon}
                                    label={item.label}
                                    size="small"
                                    glowColor={item.glowColor}
                                    className={item.className || ""}
                                    iconClassName={item.iconClassName || ""}
                                    onClick={item.action}
                                />
                            </div>
                        );
                    })}
                </div>
                </div>

                {/* Footer Decor - Hidden in landscape, shown in portrait */}
                <div className="w-full landscape:hidden flex justify-center items-center opacity-20 text-[9px] tracking-widest uppercase py-2">
                    <span>AV Control System</span>
                </div>

                {/* Footer Decor - Absolute positioned for landscape */}
                <div className="hidden landscape:flex absolute bottom-4 left-4 opacity-20 text-[9px] tracking-widest uppercase">
                    <span>AV Control System</span>
                </div>
            </div>

            {/* Home Modal — merged with Info (contacts + tech data) */}
            {homeModal.isRendered && (
                <div className={`fixed inset-0 z-50 flex items-end justify-center transition-opacity duration-500 ease-in-out ${homeModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500" onClick={homeModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border-t border-white/10 p-8 rounded-t-[2.5rem] w-full shadow-2xl transition-all duration-500 ease-out pb-12
                        ${homeModal.isOpen ? 'translate-y-0 opacity-100' : 'translate-y-full opacity-0'}
                    `}>
                        <button
                            onClick={homeModal.close}
                            className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={28} />
                        </button>

                        {/* Logo + Company */}
                        <div className="flex items-center gap-4 mb-6">
                            <a href="https://verbumdigital.com/it/" target="_blank" rel="noopener noreferrer" className="shrink-0 hover:opacity-80 transition-opacity">
                                <img src="/verbumdigital-logo.png" alt="VerbumDigital" className="h-12 w-12 object-contain" />
                            </a>
                            <div>
                                <a href="https://verbumdigital.com/it/" target="_blank" rel="noopener noreferrer" className="hover:opacity-80 transition-opacity">
                                    <h2 className="text-2xl font-bold text-blue-400 tracking-tight">VerbumDigital</h2>
                                </a>
                                <p className="text-white/30 text-xs tracking-widest uppercase">AV Control System</p>
                            </div>
                        </div>

                        {/* Contacts */}
                        <div className="space-y-3 text-white/80 text-sm">
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-white/40">Assistenza Tecnica</span>
                                <span className="font-semibold text-blue-400">+39 000 000 000</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-2">
                                <span className="text-white/40">Distributore</span>
                                <span className="font-semibold">AV Control Network</span>
                            </div>
                        </div>

                        {/* Tech Info */}
                        <div className="mt-5 pt-4 border-t border-white/5 space-y-2">
                            <div className="flex justify-between items-center">
                                <span className="text-white/40 text-xs">Versione SW</span>
                                <span className="font-mono text-blue-400 font-bold text-xs">{versionData?.version || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/40 text-xs">Indirizzo IP</span>
                                <span className="font-mono text-white/80 text-xs">{systemInfo?.ip || '—'}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-white/40 text-xs">Seriale</span>
                                <span className="font-mono text-white/60 text-[10px]">{systemInfo?.serial || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Logout Modal */}
            {logoutModal.isRendered && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ease-in-out ${logoutModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500" onClick={logoutModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border border-white/10 p-6 rounded-[2rem] w-full shadow-2xl transition-all duration-500 ease-out
                        ${logoutModal.isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                    `}>
                        <div className="flex flex-col items-center text-center">
                            <div className="p-4 bg-red-500/10 rounded-full text-red-500 mb-4">
                                <LogOut size={32} />
                            </div>
                            <h2 className="text-2xl font-bold mb-2">Logout</h2>
                            <p className="text-sm text-white/60 mb-6">
                                Confermi di voler disconnetterti dal sistema?
                            </p>

                            <div className="flex w-full space-x-3">
                                <button
                                    onClick={logoutModal.close}
                                    className="flex-1 py-3 bg-white/5 border border-white/10 border-b-2 border-black/40 rounded-xl font-semibold active:translate-y-0.5 active:border-b-0"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => {
                                        logoutModal.close();
                                        logout();
                                    }}
                                    className="flex-1 py-3 bg-red-500 border border-t-white/20 border-b-2 border-red-900/60 text-white rounded-xl font-bold shadow-lg shadow-red-500/20 active:translate-y-0.5 active:border-b-0"
                                >
                                    Esci
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
