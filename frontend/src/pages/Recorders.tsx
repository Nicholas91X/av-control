import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Mic,
    ArrowLeft,
    Database,
    HardDrive,
    Volume2
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';
import { useNavigate } from 'react-router-dom';

interface RecorderStatus {
    state: 'recording' | 'stopped' | 'nomedia';
    current_time?: number;
    filename?: string;
    volume?: number;
    left_source?: string;
    right_source?: string;
    target_memory?: 'internal' | 'usb';
}

const AVAILABLE_CHANNELS = [
    'OUT 1', 'OUT 2', 'OUT 3', 'OUT 4', 'CH 1', 'CH 2', 'CH 3', 'CH 4', 'BUS 1', 'BUS 2'
];

export const Recorders: React.FC = () => {
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const { highlightColor, backgroundColor } = useSettings();

    // State for selectors
    const [leftSource, setLeftSource] = useState('OUT 1');
    const [rightSource, setRightSource] = useState('Same as Left');
    const [targetMemory, setTargetMemory] = useState<'internal' | 'usb'>('internal');
    const [volValue, setVolValue] = useState(0.0);
    const [vuLeft, setVuLeft] = useState(0);
    const [vuRight, setVuRight] = useState(0);

    // Fetch recorder status
    const { data: recorderStatus, refetch: refetchStatus } = useQuery<RecorderStatus>({
        queryKey: ['recorder', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/recorder/status');
            return response.data;
        },
        refetchInterval: 1000,
    });

    // Handle WebSocket updates
    useEffect(() => {
        if (lastMessage?.type === 'status_update') {
            refetchStatus();
        }
    }, [lastMessage, refetchStatus]);

    // VU Meter simulation
    useEffect(() => {
        if (recorderStatus?.state === 'recording') {
            const interval = setInterval(() => {
                setVuLeft(Math.random() * 80 + 20);
                setVuRight(Math.random() * 80 + 20);
            }, 100);
            return () => clearInterval(interval);
        } else {
            setVuLeft(0);
            setVuRight(0);
        }
    }, [recorderStatus?.state]);

    // Mutations
    const startRecordingMutation = useMutation({
        mutationFn: async () => api.post('/device/recorder/start', { leftSource, rightSource, targetMemory, volume: volValue }),
        onSuccess: async () => {
            await refetchStatus();
            queryClient.invalidateQueries({ queryKey: ['recorder', 'status'] });
        },
    });

    const stopRecordingMutation = useMutation({
        mutationFn: async () => api.post('/device/recorder/stop'),
        onSuccess: async () => {
            await refetchStatus();
            queryClient.invalidateQueries({ queryKey: ['recorder', 'status'] });
        },
    });

    const isRecording = recorderStatus?.state === 'recording';

    const formatTime = (seconds?: number) => {
        if (!seconds) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const handleVolumeChange = (value: number) => {
        setVolValue(value);
    };

    const percent = ((volValue + 96) / (12 + 96)) * 100;

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor }}>
            {/* 1. TOP TITLE ROW */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <Mic className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Registratore
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            {/* Back Button */}
            <button
                onClick={() => navigate(-1)}
                className="absolute top-8 left-8 w-12 h-12 bg-white/5 border-t border-white/20 border-x border-white/10 border-b-4 border-black/60 rounded-xl flex items-center justify-center text-white/60 hover:text-white hover:bg-white/10 active:translate-y-1 active:border-b-0 transition-all z-[70] shadow-2xl"
            >
                <ArrowLeft size={24} />
            </button>

            <div className="mt-40 h-4 shrink-0" />

            {/* Main Content Dashboard */}
            <div className="flex-1 flex flex-col max-w-[1240px] mx-auto w-full px-8 pb-12 overflow-hidden">
                <div className="flex-1 flex flex-col gap-10 bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[12px] border-black/40 rounded-[2.5rem] p-12 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative transition-all duration-700 overflow-y-auto custom-scrollbar pr-6">

                    {/* Decorative depth layer */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {/* Top Selectors Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8 z-10 items-end">
                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Sorgente Sinistra</label>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                <div className="relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] hover:bg-[#111113] transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Volume2 size={16} className="text-blue-400" />
                                    </div>
                                    <select
                                        value={leftSource}
                                        onChange={(e) => setLeftSource(e.target.value)}
                                        className="bg-transparent border-none text-white font-black text-lg outline-none cursor-pointer w-full appearance-none uppercase tracking-widest"
                                    >
                                        {AVAILABLE_CHANNELS.map(ch => <option key={ch} value={ch} className="bg-[#1a1a1c]">{ch}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className="flex flex-col gap-3">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Sorgente Destra</label>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-2xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                <div className="relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-2xl px-5 py-4 flex items-center gap-3 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] hover:bg-[#111113] transition-all">
                                    <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Volume2 size={16} className="text-blue-400" />
                                    </div>
                                    <select
                                        value={rightSource}
                                        onChange={(e) => setRightSource(e.target.value)}
                                        className="bg-transparent border-none text-white font-black text-lg outline-none cursor-pointer w-full appearance-none uppercase tracking-widest"
                                    >
                                        <option value="Same as Left" className="bg-[#1a1a1c]">Stessa di sinistra</option>
                                        {AVAILABLE_CHANNELS.map(ch => <option key={ch} value={ch} className="bg-[#1a1a1c]">{ch}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>

                        {/* Status/Time Display - Refined */}
                        <div className="flex flex-col gap-3 max-w-[240px] ml-auto w-full">
                            <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Durata Registrazione</label>
                            <div className="bg-[#050505] border-t border-white/10 border-x border-white/5 border-b-4 border-black rounded-2xl px-6 py-3 flex items-center justify-center shadow-2xl">
                                <span className="text-3xl font-mono font-black text-blue-400 tabular-nums drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                    {formatTime(recorderStatus?.current_time)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Interaction Area */}
                    <div className="flex flex-col lg:flex-row gap-10 items-stretch">
                        {/* Recording Panel Left */}
                        <div className="flex-1 min-h-[450px] bg-[#0d0d0f] border-t border-white/5 border-x border-white/2 border-b-[10px] border-black rounded-[2.5rem] flex flex-col items-center justify-center p-12 relative overflow-hidden group shadow-2xl">
                            {/* Subtle Inner Glow */}
                            <div className="absolute inset-x-0 top-0 h-40 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                            {/* Decorative background grid */}
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                            {/* 3D Button Container with perspective */}
                            <div className="relative" style={{ perspective: '1000px' }}>
                                <button
                                    onClick={() => isRecording ? stopRecordingMutation.mutate() : startRecordingMutation.mutate()}
                                    disabled={startRecordingMutation.isPending || stopRecordingMutation.isPending}
                                    className={`relative w-64 h-64 rounded-full flex flex-col items-center justify-center gap-4 transition-all duration-500 z-10 
                                        active:translate-y-2 active:shadow-none
                                        ${isRecording
                                            ? 'bg-gradient-to-b from-red-500/20 to-red-900/40 border-t-2 border-red-400/50 border-x border-red-500/20 border-b-[12px] border-red-950 text-red-500 shadow-[0_40px_80px_rgba(239,68,68,0.3)]'
                                            : 'bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[12px] border-black text-white hover:from-[#2a2a2e] hover:to-[#0f0f12] shadow-[0_40px_80px_rgba(0,0,0,1)]'}`}
                                >
                                    {isRecording ? (
                                        <>
                                            <div className="w-20 h-20 bg-red-500 rounded-2xl animate-pulse shadow-[0_0_40px_rgba(239,68,68,0.8)]" />
                                            <span className="font-black uppercase tracking-[0.4em] text-sm mt-4">Ferma</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-20 h-20 rounded-full bg-red-600 shadow-[0_0_40px_rgba(220,38,38,0.6)] border-t-4 border-red-400/40" />
                                            <span className="font-black uppercase tracking-[0.4em] text-sm mt-4">Registra</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Dynamic Status Label */}
                            <div className={`mt-12 px-8 py-3 rounded-full border border-white/5 bg-black/40 flex items-center gap-4 transition-all duration-500 ${isRecording ? 'shadow-[0_0_30px_rgba(239,68,68,0.1)] border-red-500/20' : ''}`}>
                                <div className={`w-2.5 h-2.5 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-white/10'}`} />
                                <span className={`font-black uppercase tracking-[0.4em] text-[11px] ${isRecording ? 'text-red-400' : 'text-white/20'}`}>
                                    {isRecording ? 'Registrazione in corso' : 'Sistema in attesa'}
                                </span>
                            </div>
                        </div>

                        {/* VU Meters and Fader Right */}
                        <div className="w-full lg:w-[320px] flex gap-8 items-stretch">
                            {/* VuMeter Bars */}
                            <div className="flex-1 flex gap-3 bg-[#0d0d0f] border-t border-white/5 border-x border-white/2 border-b-[8px] border-black p-5 rounded-[2.5rem] justify-between shadow-2xl">
                                {/* Left VU */}
                                <div className="w-full h-full bg-black/80 rounded-xl overflow-hidden relative border border-white/5 shadow-inner">
                                    <div
                                        className="absolute bottom-0 w-full transition-all duration-100 ease-out"
                                        style={{
                                            height: `${vuLeft}%`,
                                            background: 'linear-gradient(to top, #fff 0%, #fff 80%, #3b82f6 100%)',
                                            boxShadow: '0 0 30px rgba(255,255,255,0.4)'
                                        }}
                                    />
                                    <div className="absolute inset-0 z-10 flex items-end justify-center pb-4">
                                        <span className="text-[12px] font-black text-black mix-blend-difference opacity-30">SX</span>
                                    </div>
                                </div>
                                {/* Right VU */}
                                <div className="w-full h-full bg-black/80 rounded-xl overflow-hidden relative border border-white/5 shadow-inner">
                                    <div
                                        className="absolute bottom-0 w-full transition-all duration-100 ease-out"
                                        style={{
                                            height: `${vuRight}%`,
                                            background: 'linear-gradient(to top, #fff 0%, #fff 80%, #3b82f6 100%)',
                                            boxShadow: '0 0 30px rgba(255,255,255,0.4)'
                                        }}
                                    />
                                    <div className="absolute inset-0 z-10 flex items-end justify-center pb-4">
                                        <span className="text-[12px] font-black text-black mix-blend-difference opacity-30">DX</span>
                                    </div>
                                </div>
                            </div>

                            {/* Recording Fader */}
                            <div className="w-36 flex flex-col items-center">
                                <div className="mb-6 bg-black/80 px-4 py-2 rounded-xl border-t border-white/10 border-x border-white/5 border-b border-black shadow-lg">
                                    <span className="font-mono text-base font-black text-blue-400 tabular-nums">
                                        {volValue.toFixed(1)} <span className="text-[10px] opacity-40 ml-0.5">dB</span>
                                    </span>
                                </div>
                                <div className="flex-1 w-full relative flex flex-col items-center">
                                    {/* Track */}
                                    <div className="absolute inset-y-0 w-3 bg-black rounded-full border-t border-white/5 border-x border-white/2 border-b border-black shadow-[inset_0_4px_20px_rgba(0,0,0,1)] overflow-hidden pointer-events-none">
                                        <div
                                            className="absolute bottom-0 w-full opacity-60 transition-all duration-300"
                                            style={{
                                                height: `${percent}%`,
                                                backgroundColor: highlightColor || '#3b82f6',
                                                boxShadow: `0 0 30px ${highlightColor || '#3b82f6'}66`
                                            }}
                                        />
                                    </div>

                                    {/* Knob */}
                                    <div
                                        className="absolute w-16 h-28 z-20 pointer-events-none transition-all duration-75 flex flex-col items-center justify-center translate-y-1/2"
                                        style={{ bottom: `${percent}%` }}
                                    >
                                        <div className="w-full h-full bg-gradient-to-b from-[#555] via-[#1a1a1c] to-[#000] border-t-2 border-white/20 border-x border-white/10 border-b-[10px] border-black shadow-[0_25px_50px_-12px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-2xl flex flex-col items-center justify-center overflow-hidden">
                                            <div
                                                className="w-full h-3 shrink-0"
                                                style={{
                                                    backgroundColor: highlightColor || '#3b82f6',
                                                    boxShadow: `0 0 20px ${highlightColor || '#3b82f6'}`
                                                }}
                                            />
                                            <div className="flex-1 flex flex-col items-center justify-center gap-2 opacity-30 my-3">
                                                <div className="w-10 h-[2px] bg-white/60" />
                                                <div className="w-10 h-[2px] bg-white/60" />
                                                <div className="w-10 h-[2px] bg-white/60" />
                                            </div>
                                            <div className="font-mono text-[11px] font-black text-blue-400/80 mb-3">
                                                {volValue.toFixed(1)}
                                            </div>
                                        </div>
                                    </div>

                                    <input
                                        type="range"
                                        min="-96"
                                        max="12"
                                        step="0.1"
                                        value={volValue}
                                        onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                                        className="absolute inset-y-0 inset-x-0 opacity-0 cursor-pointer w-full z-30"
                                        style={{ appearance: 'slider-vertical' as any, WebkitAppearance: 'slider-vertical' as any }}
                                    />
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Bottom Target Memory Selection */}
                    <div className="flex flex-col gap-4 max-w-2xl">
                        <label className="text-[10px] font-black text-white/20 uppercase tracking-[0.4em] pl-1">Destinazione Salvataggio</label>
                        <div className="relative group overflow-hidden rounded-[2rem]">
                            <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-blue-500/40 rounded-[2rem] blur opacity-20 group-hover:opacity-100 transition duration-700 animate-gradient-x" />
                            <div className="relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-[8px] border-black px-8 py-6 flex items-center gap-6 shadow-[inset_0_2px_15px_rgba(0,0,0,1)] group-hover:bg-[#111113] transition-all">
                                <div className="p-4 bg-blue-500/10 rounded-2xl border border-blue-500/20 shadow-xl text-blue-400">
                                    {targetMemory === 'internal' ? <Database size={32} /> : <HardDrive size={32} />}
                                </div>
                                <div className="flex-1">
                                    <h3 className="text-sm font-black text-white/60 uppercase tracking-widest mb-1">Seleziona Memoria</h3>
                                    <select
                                        value={targetMemory}
                                        onChange={(e) => setTargetMemory(e.target.value as 'internal' | 'usb')}
                                        className="bg-transparent border-none text-white font-black text-2xl outline-none cursor-pointer w-full appearance-none uppercase tracking-[0.2em] hover:text-blue-400 transition-colors"
                                    >
                                        <option value="internal" className="bg-[#1a1a1c]">Memoria Interna</option>
                                        <option value="usb" className="bg-[#1a1a1c]">Chiavetta USB</option>
                                    </select>
                                </div>
                                <div className="flex flex-col gap-1.5 opacity-20">
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                    <div className="w-1.5 h-1.5 rounded-full bg-white" />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <style dangerouslySetInnerHTML={{
                __html: `
                .custom-scrollbar::-webkit-scrollbar {
                    width: 14px;
                }
                .custom-scrollbar::-webkit-scrollbar-track {
                    background: rgba(0, 0, 0, 0.4);
                    border-radius: 12px;
                    margin: 8px;
                }
                .custom-scrollbar::-webkit-scrollbar-thumb {
                    background: rgba(59, 130, 246, 0.5);
                    border: 4px solid transparent;
                    background-clip: padding-box;
                    border-radius: 12px;
                    box-shadow: inset 0 0 0 1px rgba(255, 255, 255, 0.1);
                }
                .custom-scrollbar::-webkit-scrollbar-thumb:hover {
                    background: rgba(59, 130, 246, 0.7);
                    border: 4px solid transparent;
                    background-clip: padding-box;
                }
                @keyframes gradient-x {
                    0% { background-position: 0% 50%; }
                    50% { background-position: 100% 50%; }
                    100% { background-position: 0% 50%; }
                }
                .animate-gradient-x {
                    background-size: 200% 200%;
                    animation: gradient-x 15s ease infinite;
                }
            ` }} />
        </div>
    );
};