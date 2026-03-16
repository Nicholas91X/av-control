import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Globe,
    ChevronLeft
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';
import { useIsTablet } from '../hooks/useIsTablet';

interface StreamingStatus {
    state: 'streaming' | 'stopped' | 'noid';
    current_time: number;
}

export const Streaming: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const navigate = useNavigate();
    const { backgroundColor } = useSettings();

    const { data: streamingStatus, refetch: refetchStatus } = useQuery<StreamingStatus>({
        queryKey: ['streaming', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/streaming/status');
            return response.data;
        },
        refetchInterval: 1000,
    });

    useEffect(() => {
        if (lastMessage?.type === 'status_update') {
            refetchStatus();
        }
    }, [lastMessage, refetchStatus]);

    const startMutation = useMutation({
        mutationFn: async () => api.post('/device/streaming/start'),
        onSuccess: async () => {
            await refetchStatus();
            queryClient.invalidateQueries({ queryKey: ['streaming', 'status'] });
        },
    });

    const stopMutation = useMutation({
        mutationFn: async () => api.post('/device/streaming/stop'),
        onSuccess: async () => {
            await refetchStatus();
            queryClient.invalidateQueries({ queryKey: ['streaming', 'status'] });
        },
    });

    const isStreaming = streamingStatus?.state === 'streaming';

    const formatTime = (seconds?: number) => {
        if (!seconds) return '00:00:00';
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const isTablet = useIsTablet();

    // ============================================
    // RENDER MOBILE VIEW
    // ============================================
    if (!isTablet) {
        return (
            <div
                className="fixed top-0 left-0 right-0 bottom-7 flex flex-col overflow-hidden text-white font-sans"
                style={{ backgroundColor }}
            >
                {/* Header */}
                <div className="shrink-0 px-5 pt-5 pb-3 landscape:pt-2 landscape:pb-1 landscape:px-3">
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={() => navigate('/')} className="p-1.5 -ml-1 rounded-lg text-white/30 active:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                        <Globe className="w-5 h-5 text-indigo-400" />
                        <h1 className="text-lg font-black uppercase tracking-[0.2em]">Streaming</h1>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-indigo-500/50 via-transparent to-transparent" />
                </div>

                {/* Main Stream Area */}
                <div className="flex-1 flex flex-col items-center justify-center gap-6 px-5 landscape:gap-3 landscape:px-3 landscape:flex-row">
                    {/* Timer */}
                    <div className="bg-[#050505] border border-white/10 border-b-2 border-b-black rounded-2xl px-8 py-3 landscape:px-4 landscape:py-2">
                        <span className="text-4xl landscape:text-2xl font-mono font-black text-indigo-400 tabular-nums drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                            {formatTime(streamingStatus?.current_time)}
                        </span>
                    </div>

                    {/* Stream Button */}
                    <button
                        onClick={() => isStreaming ? stopMutation.mutate() : startMutation.mutate()}
                        disabled={startMutation.isPending || stopMutation.isPending}
                        className={`w-36 h-36 landscape:w-24 landscape:h-24 rounded-full flex flex-col items-center justify-center gap-2 landscape:gap-1 transition-all active:translate-y-1 active:shadow-none ${isStreaming
                            ? 'bg-gradient-to-b from-indigo-500/20 to-indigo-900/40 border-t-2 border-indigo-400/50 border-x border-indigo-500/20 border-b-[8px] border-indigo-950 text-indigo-400 shadow-[0_15px_30px_rgba(99,102,241,0.2)]'
                            : 'bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[8px] border-black text-white shadow-[0_20px_40px_rgba(0,0,0,1)]'
                            }`}
                    >
                        {isStreaming ? (
                            <>
                                <div className="w-10 h-10 landscape:w-7 landscape:h-7 bg-indigo-500 rounded-xl animate-pulse shadow-[0_0_20px_rgba(99,102,241,0.8)] flex items-center justify-center">
                                    <div className="w-4 h-4 landscape:w-3 landscape:h-3 bg-white rounded-sm" />
                                </div>
                                <span className="font-black uppercase tracking-[0.3em] text-[10px]">Ferma</span>
                            </>
                        ) : (
                            <>
                                <Globe className="w-10 h-10 landscape:w-7 landscape:h-7 text-indigo-400" />
                                <span className="font-black uppercase tracking-[0.3em] text-[10px]">Avvia</span>
                            </>
                        )}
                    </button>

                    {/* Status Pill */}
                    <div className={`px-5 py-2 rounded-full border bg-black/40 flex items-center gap-3 transition-all landscape:hidden ${isStreaming ? 'border-indigo-500/20 shadow-[0_0_20px_rgba(99,102,241,0.1)]' : 'border-white/5'}`}>
                        <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-indigo-500 animate-pulse shadow-[0_0_8px_rgba(99,102,241,1)]' : 'bg-white/10'}`} />
                        <span className={`font-black uppercase tracking-[0.3em] text-[10px] ${isStreaming ? 'text-indigo-400' : 'text-white/20'}`}>
                            {isStreaming ? 'Streaming in corso' : 'In attesa'}
                        </span>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER TABLET VIEW
    // ============================================
    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor }}>
            {/* 1. TOP TITLE ROW */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <Globe className="w-5 h-5 text-indigo-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Streaming
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-indigo-500/50 to-transparent shadow-[0_0_15px_rgba(99,102,241,0.3)]" />
                </div>
            </div>

            {/* Reduced Top Margin */}
            <div className="mt-28 h-2 shrink-0" />

            {/* Main Content Dashboard */}
            <div className="flex-1 flex flex-col max-w-[1240px] mx-auto w-full px-8 pb-4 overflow-hidden">
                <div className="flex-1 flex flex-col gap-6 bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[10px] border-black/40 rounded-[2rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative transition-all duration-700 overflow-hidden">

                    {/* Decorative depth layer */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {/* Timer Row */}
                    <div className="flex justify-center z-10">
                        <div className="flex flex-col gap-2 items-center">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Durata Streaming</label>
                            <div className="bg-[#050505] border-t border-white/10 border-x border-white/5 border-b-4 border-black rounded-xl px-8 py-3 flex items-center justify-center shadow-2xl">
                                <span className="text-3xl font-mono font-black text-indigo-400 tabular-nums drop-shadow-[0_0_15px_rgba(99,102,241,0.3)]">
                                    {formatTime(streamingStatus?.current_time)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Interaction Area */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-8">
                        {/* Streaming Panel */}
                        <div className="w-full max-w-md aspect-square bg-[#0d0d0f] border-t border-white/5 border-x border-white/2 border-b-[8px] border-black rounded-[3rem] flex flex-col items-center justify-center p-8 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                            {/* Subtle Inner Glow */}
                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />

                            {/* Decorative background grid */}
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />

                            {/* 3D Button Container with perspective */}
                            <div className="relative" style={{ perspective: '1000px' }}>
                                <button
                                    onClick={() => isStreaming ? stopMutation.mutate() : startMutation.mutate()}
                                    disabled={startMutation.isPending || stopMutation.isPending}
                                    className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-500 z-10
                                        active:translate-y-2 active:shadow-none
                                        ${isStreaming
                                            ? 'bg-gradient-to-b from-indigo-500/20 to-indigo-900/40 border-t-2 border-indigo-400/50 border-x border-indigo-500/20 border-b-[10px] border-indigo-950 text-indigo-400 shadow-[0_20px_40px_rgba(99,102,241,0.2)]'
                                            : 'bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[10px] border-black text-white hover:from-[#2a2a2e] hover:to-[#0f0f12] shadow-[0_30px_60px_rgba(0,0,0,1)]'}`}
                                >
                                    {isStreaming ? (
                                        <>
                                            <div className="w-14 h-14 bg-indigo-500 rounded-xl animate-pulse shadow-[0_0_30px_rgba(99,102,241,0.8)] flex items-center justify-center">
                                                <div className="w-6 h-6 bg-white rounded-md" />
                                            </div>
                                            <span className="font-black uppercase tracking-[0.4em] text-[12px] mt-2">Ferma</span>
                                        </>
                                    ) : (
                                        <>
                                            <Globe className="w-14 h-14 text-indigo-400" strokeWidth={1.5} />
                                            <span className="font-black uppercase tracking-[0.4em] text-[12px] mt-2">Avvia</span>
                                        </>
                                    )}
                                </button>
                            </div>

                            {/* Dynamic Status Label */}
                            <div className={`mt-8 px-6 py-2 rounded-full border border-white/5 bg-black/40 flex items-center gap-3 transition-all duration-500 ${isStreaming ? 'shadow-[0_0_30px_rgba(99,102,241,0.1)] border-indigo-500/20' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${isStreaming ? 'bg-indigo-500 animate-pulse shadow-[0_0_10px_rgba(99,102,241,1)]' : 'bg-white/10'}`} />
                                <span className={`font-black uppercase tracking-[0.4em] text-[10px] ${isStreaming ? 'text-indigo-400' : 'text-white/20'}`}>
                                    {isStreaming ? 'Streaming in corso' : 'In attesa'}
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};
