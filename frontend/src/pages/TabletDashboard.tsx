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
    Users
} from 'lucide-react';
import { TabletTile } from '../components/dashboard/TabletTile';
import { useSettings } from '../context/SettingsContext';

export const TabletDashboard: React.FC = () => {
    const navigate = useNavigate();
    const { user, logout } = useAuth();
    const { status } = useWebSocket();
    const { backgroundColor } = useSettings();
    const [isStandby, setIsStandby] = useState(false);

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
            {/* Top Bar Decoration */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-white/5 to-transparent shadow-[0_0_15px_rgba(255,255,255,0.1)]" />

            {/* Background Light Effect */}
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="h-full w-full max-w-[1400px] mx-auto px-4 md:px-8 py-6 md:py-10 flex flex-col items-center justify-between">

                {/* Header: Actions and Title */}
                <div className="w-full relative flex items-center justify-between min-h-[64px]">
                    {/* Left Actions Group */}
                    <div className="flex items-center space-x-3 z-10">
                        {/* Connection Status Icon */}
                        <div className={`p-3 rounded-xl border border-b-4 transition-all shadow-lg active:translate-y-1 active:border-b-0 ${status === 'connected' ? 'bg-green-500/10 border-green-500/20 border-b-green-900/60 text-green-500' :
                            status === 'connecting' ? 'bg-yellow-500/10 border-yellow-500/20 border-b-yellow-900/60 text-yellow-500 animate-pulse' :
                                'bg-red-500/10 border-red-500/20 border-b-red-900/60 text-red-500'
                            }`}>
                            {status === 'connected' ? <Wifi size={24} /> : <WifiOff size={24} />}
                        </div>

                        {/* Admin-only User Management */}
                        {user?.role === 'admin' && (
                            <button
                                onClick={() => navigate('/users')}
                                className="p-3 text-white/40 hover:text-white transition-all bg-[#2a2a2e] rounded-xl border-t-2 border-t-white/10 border-x border-x-white/5 border-b-[6px] border-b-black hover:bg-[#323236] active:translate-y-1 active:border-b-0 shadow-lg"
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

                    {/* Centered Title */}
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold tracking-tight text-white/90 drop-shadow-[0_0_15px_rgba(255,255,255,0.1)] pointer-events-auto">
                            Parrocchia
                        </h1>
                    </div>

                    {/* Right Actions Group */}
                    <div className="flex items-center space-x-3 z-10">
                        {/* Info Button */}
                        <button
                            onClick={infoModal.open}
                            className="p-3 text-white/40 hover:text-white transition-all bg-[#2a2a2e] rounded-xl border-t-2 border-t-white/10 border-x border-x-white/5 border-b-[6px] border-b-black hover:bg-[#323236] active:translate-y-1 active:border-b-0 shadow-lg"
                            title="Informazioni"
                        >
                            <Info size={24} />
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 w-full flex flex-col items-center justify-center gap-y-6 md:gap-y-12">

                    {/* Top Row: Main Large Tiles */}
                    <div className="flex items-center justify-center gap-4 md:gap-8 lg:gap-12">
                        <TabletTile
                            icon={Power}
                            label="STANDBY"
                            size="small"
                            glowColor="#f97316"
                            onClick={() => setIsStandby(true)}
                        />
                        <TabletTile
                            icon={Home}
                            label="HOME"
                            size="large"
                            glowColor="#3b82f6"
                            className="border-white/10"
                            onClick={homeModal.open}
                        />
                        <TabletTile
                            icon={Wrench}
                            label="IMPOSTAZIONI"
                            size="small"
                            glowColor="#64748b"
                            onClick={() => navigate('/settings')}
                        />
                    </div>

                    {/* Bottom Row: Secondary Action Tiles */}
                    <div className="flex items-center justify-center gap-2 md:gap-4 lg:gap-6">
                        <TabletTile
                            icon={Mic2}
                            label="SCENARIO"
                            glowColor="#f59e0b"
                            onClick={() => navigate('/presets')}
                        />
                        <TabletTile
                            icon={Disc}
                            label="MEDIA PLAYER"
                            glowColor="#3b82f6"
                            onClick={() => navigate('/players')}
                        />
                        <TabletTile
                            icon={Circle}
                            label="REGISTRATORE"
                            glowColor="#ef4444"
                            iconClassName="text-red-500 fill-red-500/20"
                            onClick={() => navigate('/recorders')}
                        />
                        <TabletTile
                            icon={Sliders}
                            label="CONTROLLI"
                            glowColor="#10b981"
                            onClick={() => navigate('/controls')}
                        />
                        <TabletTile
                            icon={Globe}
                            label="STREAMING"
                            glowColor="#6366f1"
                            className="opacity-40 grayscale"
                            onClick={() => { }}
                        />
                    </div>
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
                <div className={`fixed inset-0 z-50 flex items-center justify-center p-8 transition-opacity duration-500 ease-in-out ${infoModal.isOpen ? 'opacity-100' : 'opacity-0'}`}>
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl transition-opacity duration-500" onClick={infoModal.close} />
                    <div className={`
                        relative bg-[#1a1a1a] border border-white/10 p-12 rounded-[2.5rem] max-w-lg w-full shadow-2xl transition-all duration-500 ease-out
                        ${infoModal.isOpen ? 'scale-100 translate-y-0 opacity-100' : 'scale-90 translate-y-4 opacity-0'}
                    `}>
                        <button
                            onClick={infoModal.close}
                            className="absolute top-8 right-8 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={32} />
                        </button>
                        <h2 className="text-3xl font-bold mb-8 tracking-tight">Hardware & Software</h2>
                        <div className="space-y-4">
                            <div className="p-5 bg-white/5 rounded-3xl flex justify-between items-center border border-white/5 hover:bg-white/10 transition-colors">
                                <span className="text-white/40 font-medium">Versione SW</span>
                                <span className="font-mono text-blue-400 font-bold">{versionData?.version || 'Unknown'}</span>
                            </div>
                            <div className="p-5 bg-white/5 rounded-3xl flex justify-between items-center border border-white/5 hover:bg-white/10 transition-colors">
                                <span className="text-white/40 font-medium">Build Date</span>
                                <span className="font-mono text-white/80">{versionData?.build_date || 'Unknown'}</span>
                            </div>
                            <div className="p-5 bg-white/5 rounded-3xl flex justify-between items-center border border-white/5 hover:bg-white/10 transition-colors">
                                <span className="text-white/40 font-medium">Architettura</span>
                                <span className="font-mono uppercase text-white/60">{versionData?.arch || 'ARMv7'}</span>
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
