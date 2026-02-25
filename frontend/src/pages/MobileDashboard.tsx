import React, { useState } from 'react';
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
import { CircleTile } from '../components/dashboard/CircleTile';
import { useSettings } from '../context/SettingsContext';

export const MobileDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { status } = useWebSocket();
    const { backgroundColor } = useSettings();
    const [isStandby, setIsStandby] = useState(false);

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

    // Calculations for the circular layout
    const numItems = 7;
    // Responsive radius: 38vw maxes out nicely on smaller screens without hitting the edges.
    const circleRadius = "35vw"; 

    // The items to place around the circle
    const surroundingItems = [
        { icon: Mic2, label: "SCENARIO", glowColor: "#f59e0b", action: () => navigate('/presets') },
        { icon: Disc, label: "PLAYER", glowColor: "#3b82f6", action: () => navigate('/players') },
        { icon: Globe, label: "STREAM", glowColor: "#6366f1", action: () => {}, className: 'opacity-40 grayscale' },
        { icon: Power, label: "STANDBY", glowColor: "#f97316", action: () => setIsStandby(true) },
        { icon: Wrench, label: "IMPOSTA", glowColor: "#64748b", action: () => navigate('/settings') },
        { icon: Sliders, label: "CONTROL", glowColor: "#10b981", action: () => navigate('/controls') },
        { icon: Circle, label: "RECORD", glowColor: "#ef4444", iconClassName: "text-red-500 fill-red-500/20", action: () => navigate('/recorders') },
    ];

    if (isStandby) {
        return (
            <div
                className="fixed inset-0 bg-black z-[100] flex items-center justify-center cursor-pointer"
                onClick={() => setIsStandby(false)}
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
            {/* Background Light Effect */}
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[300px] h-[300px] bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />

            <div className="h-full w-full mx-auto px-4 py-8 flex flex-col items-center justify-between">

                {/* Header: Actions and Title */}
                <div className="w-full relative flex items-center justify-between min-h-[48px]">
                    {/* Left Actions */}
                    <div className="flex items-center space-x-2 z-10">
                        <div
                            className={`p-2 rounded-xl border border-b-2 shadow-lg ${status === 'connected' ? 'bg-green-500/10 border-green-500/20 text-green-500' :
                                status === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-500 animate-pulse' :
                                    'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}
                        >
                            {status === 'connected' ? <Wifi size={18} /> : <WifiOff size={18} />}
                        </div>
                        <div
                            className={`p-2 rounded-xl border border-b-2 shadow-lg ${isHardwareConnected
                                ? 'bg-green-500/10 border-green-500/20 text-green-500'
                                : 'bg-red-500/10 border-red-500/20 text-red-500'
                                }`}
                        >
                            <Cpu size={18} />
                        </div>
                    </div>

                    {/* Centered Title */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h1 className="text-xl md:text-2xl font-bold tracking-tight text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] pointer-events-auto">
                            Parrocchia
                        </h1>
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center space-x-2 z-10">
                         {user?.role === 'admin' && (
                            <button
                                onClick={() => navigate('/users')}
                                className="p-2 text-white/40 bg-[#2a2a2e] rounded-xl border-t border-t-white/10 border-x border-x-white/5 border-b-2 border-b-white/10 shadow-lg"
                            >
                                <Users size={18} />
                            </button>
                        )}
                        <button
                            onClick={infoModal.open}
                            className="p-2 text-white/40 bg-[#2a2a2e] rounded-xl border-t border-t-white/10 border-x border-x-white/5 border-b-2 border-b-white/10 shadow-lg"
                        >
                            <Info size={18} />
                        </button>
                        <button
                            onClick={logoutModal.open}
                            className="p-2 text-red-500/40 bg-[#2a2a2e] rounded-xl border-t border-t-red-400/20 border-x border-x-red-400/10 border-b-2 border-b-red-950 shadow-lg"
                            style={{marginLeft:"0.5rem"}}
                        >
                            <LogOut size={18} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area - Circular Layout */}
                <div className="flex-1 w-full relative flex items-center justify-center overflow-hidden">
                    {/* The Central Button */}
                    <div className="z-10 absolute pointer-events-auto flex items-center justify-center">
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
                        // Calculate angle: 
                        // Start from top (-90 deg or -PI/2) 
                        const angle = (-Math.PI / 2) + (index * ((2 * Math.PI) / numItems));

                        return (
                            <div 
                                key={index} 
                                className="absolute flex items-center justify-center pointer-events-auto"
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

                {/* Footer Decor */}
                <div className="w-full flex justify-center items-center opacity-20 text-[9px] tracking-widest uppercase py-2">
                    <div className="flex space-x-2">
                        <span>AV Control System</span>
                        {versionData && <span>v{versionData.version}</span>}
                    </div>
                </div>
            </div>

            {/* Modals - Simplified for Mobile */}
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
                        <h2 className="text-2xl font-bold mb-6 text-blue-400 tracking-tight">Informazioni</h2>
                        <div className="space-y-4 text-white/80 text-sm">
                            <div className="flex flex-col border-b border-white/5 pb-2">
                                <span className="text-white/40 mb-1">Produttore</span>
                                <span className="font-semibold text-lg">VerbumDigital</span>
                            </div>
                            <div className="flex flex-col border-b border-white/5 pb-2">
                                <span className="text-white/40 mb-1">Assistenza</span>
                                <span className="font-semibold text-blue-400 text-lg">+39 000 000 000</span>
                            </div>
                            <div className="flex flex-col border-b border-white/5 pb-2">
                                <span className="text-white/40 mb-1">Distributore</span>
                                <span className="font-semibold text-lg">AV Control Network</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {infoModal.isRendered && (
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-4 transition-opacity duration-500 ease-in-out ${infoModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-md transition-opacity duration-500" onClick={infoModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border border-white/10 p-6 rounded-[2rem] w-full max-h-[80vh] overflow-y-auto shadow-2xl transition-all duration-500 ease-out
                        ${infoModal.isOpen ? 'scale-100 opacity-100' : 'scale-95 opacity-0'}
                    `}>
                        <button
                            onClick={infoModal.close}
                            className="absolute top-5 right-5 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>
                        <h2 className="text-xl font-bold mb-4 tracking-tight">Sistema</h2>
                        <div className="space-y-2">
                            <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 text-xs">SW</span>
                                <span className="font-mono text-blue-400 text-xs">{versionData?.version || '-'}</span>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 text-xs">Build</span>
                                <span className="font-mono text-white/80 text-[10px] truncate max-w-[120px]">{versionData?.build_date || '-'}</span>
                            </div>

                            <div className="mt-4 pt-2 border-t border-white/5">
                                <h3 className="text-[10px] font-bold text-white/30 uppercase tracking-widest mb-2">Daemon</h3>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 text-xs">Nome</span>
                                <span className="font-mono text-white/80 text-xs">{systemInfo?.name || '-'}</span>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 text-xs">IP</span>
                                <span className="font-mono text-white/80 text-xs">{systemInfo?.ip || '-'}</span>
                            </div>
                            <div className="p-3 bg-white/5 rounded-xl flex justify-between items-center border border-white/5">
                                <span className="text-white/40 text-xs">Seriale</span>
                                <span className="font-mono text-white/60 text-[10px] truncate max-w-[120px]">{systemInfo?.serial || '-'}</span>
                            </div>
                        </div>
                    </div>
                </div>
            )}

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
