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
    Power,
    Home,
    Wrench,
    Info,
    X,
    Wifi,
    WifiOff,
    LogOut,
    Users,
    Cpu
} from 'lucide-react';
import { TabletTile } from '../components/dashboard/TabletTile';
import { useSettings } from '../context/SettingsContext';

export const TabletDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { status } = useWebSocket();
    const { backgroundColor, standbyTimeout } = useSettings();
    const [isStandby, setIsStandby] = useState(false);
    const lastActivityRef = useRef(Date.now());

    // Auto-standby: monitor inactivity and trigger standby after configured timeout
    useEffect(() => {
        if (standbyTimeout === 0) return; // disabled

        const resetActivity = () => { lastActivityRef.current = Date.now(); };
        const events = ['mousemove', 'touchstart', 'click', 'keydown'];
        events.forEach(e => window.addEventListener(e, resetActivity));

        const check = setInterval(() => {
            if (!isStandby && Date.now() - lastActivityRef.current > standbyTimeout * 60 * 1000) {
                setIsStandby(true);
            }
        }, 15000); // check every 15 s

        return () => {
            events.forEach(e => window.removeEventListener(e, resetActivity));
            clearInterval(check);
        };
    }, [standbyTimeout, isStandby]);

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
        refetchInterval: 5000, // Check every 5 seconds
    });

    const isHardwareConnected = systemStatus?.connected ?? false;

    // Modal state management with animations
    const useModalAnimation = (initialState: boolean) => {
        const [isOpen, setIsOpen] = useState(initialState);
        const [isRendered, setIsRendered] = useState(initialState);
        const [isAnimating, setIsAnimating] = useState(false);

        const open = () => {
            setIsRendered(true);
            setIsAnimating(true);
            setTimeout(() => setIsOpen(true), 10);
            setTimeout(() => setIsAnimating(false), 500);
        };

        const close = () => {
            setIsOpen(false);
            setIsAnimating(true);
            setTimeout(() => {
                setIsRendered(false);
                setIsAnimating(false);
            }, 500); // Match transition duration
        };

        return { isOpen, isRendered, isAnimating, open, close };
    };

    const homeModal = useModalAnimation(false);
    const infoModal = useModalAnimation(false);
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

    if (isStandby) {
        return (
            <div
                className="fixed inset-0 bg-black z-[100] flex items-center justify-center cursor-pointer"
                onClick={() => { setIsStandby(false); lastActivityRef.current = Date.now(); }}
            >
                <div className="text-white/20 animate-pulse flex flex-col items-center space-y-4">
                    <Power size={120} />
                    <span className="text-2xl font-light tracking-[0.5em] uppercase">Standby</span>
                    <span className="text-sm">Tocca per riattivare</span>
                </div>
            </div>
        );
    }

    return (
        <div
            className="fixed inset-0 bg-black text-gray-900 dark:text-white overflow-hidden font-sans selection:bg-primary-500/30 transition-colors duration-500"
            style={{ backgroundColor: backgroundColor }}
        >
            {/* Top Bar Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_15px_rgba(255,255,255,0.1)]" />

            {/* Background Light Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="h-full w-full max-w-[1400px] mx-auto px-4 md:px-8 py-3 md:py-6 flex flex-col items-center justify-between">

                {/* Header: Row 1 (actions) + Row 2 (title) */}
                <div className="w-full flex flex-col items-center gap-2">
                    {/* Row 1: Left and Right action buttons */}
                    <div className="w-full flex items-center justify-between">
                        {/* Left Actions Group */}
                        <div className="flex items-center space-x-3">
                            {/* WebSocket Connection Status Icon */}
                            <div
                                className={`p-3 rounded-xl border border-b-4 transition-all shadow-lg active:translate-y-1 active:border-b-0 ${status === 'connected' ? 'bg-green-500/10 border-green-500/20 border-b-green-900/60 text-green-500' :
                                    status === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/20 border-b-yellow-900/60 text-yellow-500 animate-pulse' :
                                        'bg-red-500/10 border-red-500/20 border-b-red-900/60 text-red-500'
                                    }`}
                                title={`WebSocket: ${status}`}
                            >
                                {status === 'connected' ? <Wifi size={24} /> : <WifiOff size={24} />}
                            </div>

                            {/* Hardware Daemon Connection Status Icon */}
                            <div
                                className={`p-3 rounded-xl border border-b-4 transition-all shadow-lg active:translate-y-1 active:border-b-0 ${isHardwareConnected
                                    ? 'bg-green-500/10 border-green-500/20 border-b-green-900/60 text-green-500'
                                    : 'bg-red-500/10 border-red-500/20 border-b-red-900/60 text-red-500'
                                    }`}
                                title={`Hardware Daemon: ${isHardwareConnected ? 'Connected' : 'Disconnected'}`}
                            >
                                <Cpu size={24} />
                            </div>

                            {/* Admin-only User Management */}
                            {user?.role === 'admin' && (
                                <button
                                    onClick={() => navigate('/users')}
                                    className="p-3 text-white/40 hover:text-white transition-all bg-[#2a2a2e] rounded-xl border-t-2 border-t-white/10 border-x border-x-white/5 border-b-[6px] border-b-white/10 hover:bg-[#323236] active:translate-y-1 active:border-b-0 shadow-lg"
                                    title="Gestione Utenti"
                                >
                                    <Users size={24} />
                                </button>
                            )}

                            {/* Logout Button */}
                            <button
                                onClick={logoutModal.open}
                                className="p-3 text-red-500/40 hover:text-red-500 transition-all bg-[#2a2a2e] rounded-xl border-t-2 border-t-red-400/20 border-x border-x-red-400/10 border-b-[6px] border-b-red-950 active:translate-y-1 active:border-b-0 shadow-lg hover:bg-red-500/5"
                                title="Logout"
                            >
                                <LogOut size={24} />
                            </button>
                        </div>

                        {/* Right Actions Group */}
                        <div className="flex items-center space-x-3">
                            {/* Info Button */}
                            <button
                                onClick={infoModal.open}
                                className="p-3 text-white/40 hover:text-white transition-all bg-[#2a2a2e] rounded-xl border-t-2 border-t-white/10 border-x border-x-white/5 border-b-[6px] border-b-white/10 hover:bg-[#323236] active:translate-y-1 active:border-b-0 shadow-lg"
                                title="Informazioni"
                            >
                                <Info size={24} />
                            </button>
                        </div>
                    </div>

                    {/* Row 2: Title */}
                    <h1 className="text-3xl md:text-4xl lg:text-5xl font-bold tracking-tight text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)]">
                        Parrocchia
                    </h1>
                </div>

                {/* Main Content Area — Circular Layout */}
                <div className="flex-1 w-full relative">

                    {/* Decorative orbit ring — diameter = 2 × orbit-radius + one tile width */}
                    <div
                        className="absolute rounded-full border border-white/[0.04] pointer-events-none"
                        style={{
                            top: '50%', left: '50%',
                            width: 'calc(2 * min(35vw, 26vh) + clamp(7rem, 15vmin, 10.5rem))',
                            height: 'calc(2 * min(35vw, 26vh) + clamp(7rem, 15vmin, 10.5rem))',
                            transform: 'translate(-50%, -50%)',
                        }}
                    />

                    {/* Center: Home */}
                    <div className="absolute" style={{ top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                        <TabletTile
                            icon={Home}
                            label="HOME"
                            size="large"
                            glowColor="#3b82f6"
                            onClick={homeModal.open}
                        />
                    </div>

                    {/* Satellite tiles — orbit radius min(35vw, 26vh) */}
                    {([
                        { angle: -90,  icon: Mic2,    label: 'SCENARIO',     color: '#f59e0b', onClick: () => navigate('/presets'),   cls: '',                        iconCls: '' },
                        { angle: -30,  icon: Disc,    label: 'MEDIA PLAYER', color: '#3b82f6', onClick: () => navigate('/players'),   cls: '',                        iconCls: '' },
                        { angle:  30,  icon: Circle,  label: 'REGISTRATORE', color: '#ef4444', onClick: () => navigate('/recorders'), cls: '',                        iconCls: 'text-red-500 fill-red-500/20' },
                        { angle:  90,  icon: Sliders, label: 'CONTROLLI',    color: '#10b981', onClick: () => navigate('/controls'),  cls: '',                        iconCls: '' },
                        { angle:  150, icon: Globe,   label: 'STREAMING',    color: '#6366f1', onClick: () => {},                    cls: 'opacity-40 grayscale',    iconCls: '' },
                        { angle:  210, icon: Wrench,  label: 'IMPOSTAZIONI', color: '#64748b', onClick: () => navigate('/settings'),  cls: '',                        iconCls: '' },
                    ] as const).map(({ angle, icon, label, color, onClick, cls, iconCls }) => (
                        <div
                            key={label}
                            className="absolute"
                            style={{
                                top: '50%', left: '50%',
                                transform: `translate(-50%,-50%) rotate(${angle}deg) translateX(min(35vw, 26vh)) rotate(${-angle}deg)`,
                            }}
                        >
                            <TabletTile
                                icon={icon}
                                label={label}
                                glowColor={color}
                                onClick={onClick}
                                className={cls}
                                iconClassName={iconCls}
                            />
                        </div>
                    ))}
                </div>

                {/* Footer Decor */}
                <div className="w-full flex justify-between items-end opacity-20 text-[10px] tracking-widest uppercase py-2">
                    <span>AV Control Network</span>
                    <div className="flex space-x-4">
                        <span>AV Control System</span>
                        {versionData && <span>v{versionData.version}</span>}
                    </div>
                </div>
            </div>

            {/* Modals */}
            {homeModal.isRendered && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 transition-opacity duration-500 ease-in-out ${homeModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500" onClick={homeModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border border-white/10 p-12 rounded-[2.5rem] max-w-2xl w-full shadow-2xl transition-all duration-500 ease-out
                        ${homeModal.isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0'}
                    `}>
                        <button
                            onClick={homeModal.close}
                            className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <h2 className="text-4xl font-bold mb-8 text-blue-400 tracking-tight">Informazioni Sistema</h2>
                        <div className="space-y-6 text-xl text-white/80 leading-relaxed">
                            <div className="flex justify-between border-b border-white/5 pb-4">
                                <span className="text-white/40">Produttore</span>
                                <span className="font-semibold">VerbumDigital</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-4">
                                <span className="text-white/40">Assistenza Tecnica</span>
                                <span className="font-semibold text-blue-400">+39 000 000 000</span>
                            </div>
                            <div className="flex justify-between border-b border-white/5 pb-4">
                                <span className="text-white/40">Distributore</span>
                                <span className="font-semibold">AV Control Network</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {infoModal.isRendered && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ease-in-out ${infoModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500" onClick={infoModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border border-white/10 p-6 rounded-[2rem] max-w-lg w-full max-h-[90vh] overflow-y-auto shadow-2xl transition-all duration-500 ease-out
                        ${infoModal.isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0'}
                    `}>
                        <button
                            onClick={infoModal.close}
                            className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={28} />
                        </button>
                        <h2 className="text-2xl font-bold mb-5 tracking-tight">Hardware & Software</h2>
                        <div className="space-y-2.5">
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Versione SW</span>
                                <span className="font-mono text-blue-400 font-bold text-sm">{versionData?.version || 'Unknown'}</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Build Date</span>
                                <span className="font-mono text-white/80 text-sm">{versionData?.build_date || 'Unknown'}</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Architettura</span>
                                <span className="font-mono uppercase text-white/60 text-sm">{versionData?.arch || 'ARMv7'}</span>
                            </div>

                            {/* Daemon Info Section */}
                            <div className="mt-4 pt-3 border-t border-white/5">
                                <h3 className="text-xs font-bold text-white/30 uppercase tracking-widest mb-3">Daemon Hardware</h3>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Nome</span>
                                <span className="font-mono text-white/80 text-sm">{systemInfo?.name || '—'}</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Versione Daemon</span>
                                <span className="font-mono text-blue-400 font-bold text-sm">{systemInfo?.version || '—'}</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Indirizzo IP</span>
                                <span className="font-mono text-white/80 text-sm">{systemInfo?.ip || '—'}</span>
                            </div>
                            <div className="p-4 bg-white/5 rounded-2xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 font-medium text-sm">Seriale</span>
                                <span className="font-mono text-white/60 text-xs">{systemInfo?.serial || '—'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {logoutModal.isRendered && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 transition-opacity duration-500 ease-in-out ${logoutModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500" onClick={logoutModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border border-white/10 p-12 rounded-[2.5rem] max-w-md w-full shadow-2xl transition-all duration-500 ease-out
                        ${logoutModal.isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0'}
                    `}>
                        <div className="flex flex-col items-center text-center">
                            <div className="p-6 bg-red-500/10 rounded-full text-red-500 mb-6">
                                <LogOut size={48} />
                            </div>
                            <h2 className="text-3xl font-bold mb-4 tracking-tight">Conferma Logout</h2>
                            <p className="text-lg text-white/60 mb-8 leading-relaxed">
                                Sei sicuro di voler uscire? Una volta disconnesso, sarà necessario <span className="text-white font-semibold">reimmettere le tue credenziali</span> di accesso.
                            </p>

                            <div className="flex w-full space-x-4">
                                <button
                                    onClick={logoutModal.close}
                                    className="flex-1 py-4 bg-white/5 hover:bg-white/10 border border-white/10 border-b-4 border-black/40 rounded-2xl font-semibold transition-all active:translate-y-1 active:border-b-0"
                                >
                                    Annulla
                                </button>
                                <button
                                    onClick={() => {
                                        logoutModal.close();
                                        logout();
                                    }}
                                    className="flex-1 py-4 bg-red-500 hover:bg-red-600 border border-t-white/20 border-b-4 border-red-900/60 text-white rounded-2xl font-bold shadow-lg shadow-red-500/20 transition-all active:translate-y-1 active:border-b-0"
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
