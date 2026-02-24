import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Mic,
    Volume2
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';

interface RecorderStatus {
    state: 'recording' | 'stopped' | 'nomedia';
    current_time?: number;
    filename?: string;
    volume?: number;
    left_source?: string;
    right_source?: string;
}

// Channels now fetched from API instead of hardcoded

export const Recorders: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const { backgroundColor } = useSettings();

    // State for selectors
    const [leftSource, setLeftSource] = useState<number>(0);
    const [rightSource, setRightSource] = useState<number>(1);

    // Fetch available recording sources from daemon
    const { data: sourcesData } = useQuery<Record<string, any>>({
        queryKey: ['recorder', 'sources'],
        queryFn: async () => {
            const response = await api.get('/device/recorder/sources');
            return response.data;
        },
    });

    // Parse sources into a list: [{index: 0, name: 'MIC IN1'}, ...]
    const availableSources = React.useMemo(() => {
        if (!sourcesData) return [];
        return Object.entries(sourcesData)
            .filter(([key]) => key !== 'left' && key !== 'right')
            .map(([key, value]) => ({ index: parseInt(key), name: value as string }))
            .sort((a, b) => a.index - b.index);
    }, [sourcesData]);

    // Init selections from API response
    useEffect(() => {
        if (sourcesData) {
            if (typeof sourcesData.left === 'number') {
                setLeftSource(sourcesData.left);
            }
            if (typeof sourcesData.right === 'number') {
                setRightSource(sourcesData.right);
            }
        }
    }, [sourcesData]);

    // Mutation to save source selection
    const setSourceMutation = useMutation({
        mutationFn: async ({ left, right }: { left: number; right: number }) => {
            await api.post('/device/recorder/source', { left, right });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recorder', 'sources'] });
        }
    });

    const handleSourceChange = (side: 'left' | 'right', value: number) => {
        if (side === 'left') {
            setLeftSource(value);
            setSourceMutation.mutate({ left: value, right: rightSource });
        } else {
            setRightSource(value);
            setSourceMutation.mutate({ left: leftSource, right: value });
        }
    };


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



    // Mutations
    const startRecordingMutation = useMutation({
        mutationFn: async () => api.post('/device/recorder/start'),
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

            {/* Reduced Top Margin */}
            <div className="mt-28 h-2 shrink-0" />

            {/* Main Content Dashboard */}
            <div className="flex-1 flex flex-col max-w-[1240px] mx-auto w-full px-8 pb-4 overflow-hidden">
                <div className="flex-1 flex flex-col gap-6 bg-[#161618] border-t border-white/10 border-x border-white/5 border-b-[10px] border-black/40 rounded-[2rem] p-8 shadow-[0_50px_100px_-20px_rgba(0,0,0,1)] relative transition-all duration-700 overflow-hidden">

                    {/* Decorative depth layer */}
                    <div className="absolute inset-0 bg-gradient-to-br from-white/[0.02] to-transparent pointer-events-none" />

                    {/* Top Selectors Row */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 z-10 items-end">
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Sorgente Sinistra</label>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                <div className="relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-xl px-4 py-3 flex items-center gap-3 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] hover:bg-[#111113] transition-all">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Volume2 size={14} className="text-blue-400" />
                                    </div>
                                    <select
                                        value={leftSource}
                                        onChange={(e) => handleSourceChange('left', parseInt(e.target.value))}
                                        className="bg-transparent border-none text-white font-black text-base outline-none cursor-pointer w-full appearance-none uppercase tracking-widest"
                                    >
                                        {availableSources.map(src => <option key={src.index} value={src.index} className="bg-[#1a1a1c]">{src.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
 
                        <div className="flex flex-col gap-2">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Sorgente Destra</label>
                            <div className="relative group">
                                <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 rounded-xl blur opacity-0 group-hover:opacity-100 transition duration-500" />
                                <div className="relative bg-[#0a0a0c] border-t border-white/10 border-x border-white/5 border-b-4 border-black/80 rounded-xl px-4 py-3 flex items-center gap-3 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] hover:bg-[#111113] transition-all">
                                    <div className="w-7 h-7 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
                                        <Volume2 size={14} className="text-blue-400" />
                                    </div>
                                    <select
                                        value={rightSource}
                                        onChange={(e) => handleSourceChange('right', parseInt(e.target.value))}
                                        className="bg-transparent border-none text-white font-black text-base outline-none cursor-pointer w-full appearance-none uppercase tracking-widest"
                                    >
                                        <option value={0} className="bg-[#1a1a1c]">Come a sinistra</option>
                                        {availableSources.map(src => <option key={src.index + 1} value={src.index + 1} className="bg-[#1a1a1c]">{src.name}</option>)}
                                    </select>
                                </div>
                            </div>
                        </div>
 
                        {/* Status/Time Display - More Compact */}
                        <div className="flex flex-col gap-2 max-w-[200px] ml-auto w-full">
                            <label className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em] pl-1">Durata</label>
                            <div className="bg-[#050505] border-t border-white/10 border-x border-white/5 border-b-4 border-black rounded-xl px-5 py-2 flex items-center justify-center shadow-2xl">
                                <span className="text-2xl font-mono font-black text-blue-400 tabular-nums drop-shadow-[0_0_15px_rgba(59,130,246,0.3)]">
                                    {formatTime(recorderStatus?.current_time)}
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Main Interaction Area */}
                    <div className="flex-1 flex flex-col items-center justify-center gap-8">
                        {/* Recording Panel */}
                        <div className="w-full max-w-md aspect-square bg-[#0d0d0f] border-t border-white/5 border-x border-white/2 border-b-[8px] border-black rounded-[3rem] flex flex-col items-center justify-center p-8 relative overflow-hidden group shadow-2xl transition-all duration-500 hover:scale-[1.02]">
                            {/* Subtle Inner Glow */}
                            <div className="absolute inset-x-0 top-0 h-32 bg-gradient-to-b from-white/[0.02] to-transparent pointer-events-none" />
 
                            {/* Decorative background grid */}
                            <div className="absolute inset-0 opacity-[0.02] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle, #fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
 
                            {/* 3D Button Container with perspective */}
                            <div className="relative" style={{ perspective: '1000px' }}>
                                <button
                                    onClick={() => isRecording ? stopRecordingMutation.mutate() : startRecordingMutation.mutate()}
                                    disabled={startRecordingMutation.isPending || stopRecordingMutation.isPending}
                                    className={`relative w-48 h-48 rounded-full flex flex-col items-center justify-center gap-3 transition-all duration-500 z-10 
                                        active:translate-y-2 active:shadow-none
                                        ${isRecording
                                            ? 'bg-gradient-to-b from-red-500/20 to-red-900/40 border-t-2 border-red-400/50 border-x border-red-500/20 border-b-[10px] border-red-950 text-red-500 shadow-[0_20px_40px_rgba(239,68,68,0.2)]'
                                            : 'bg-gradient-to-b from-[#222] to-[#0a0a0c] border-t-2 border-white/10 border-x border-white/5 border-b-[10px] border-black text-white hover:from-[#2a2a2e] hover:to-[#0f0f12] shadow-[0_30px_60px_rgba(0,0,0,1)]'}`}
                                >
                                    {isRecording ? (
                                        <>
                                            <div className="w-14 h-14 bg-red-500 rounded-xl animate-pulse shadow-[0_0_30px_rgba(239,68,68,0.8)]" />
                                            <span className="font-black uppercase tracking-[0.4em] text-[12px] mt-2">Ferma</span>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-14 h-14 rounded-full bg-red-600 shadow-[0_0_30px_rgba(220,38,38,0.6)] border-t-4 border-red-400/40" />
                                            <span className="font-black uppercase tracking-[0.4em] text-[12px] mt-2">Registra</span>
                                        </>
                                    )}
                                </button>
                            </div>
 
                            {/* Dynamic Status Label */}
                            <div className={`mt-8 px-6 py-2 rounded-full border border-white/5 bg-black/40 flex items-center gap-3 transition-all duration-500 ${isRecording ? 'shadow-[0_0_30px_rgba(239,68,68,0.1)] border-red-500/20' : ''}`}>
                                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse shadow-[0_0_10px_rgba(239,68,68,1)]' : 'bg-white/10'}`} />
                                <span className={`font-black uppercase tracking-[0.4em] text-[10px] ${isRecording ? 'text-red-400' : 'text-white/20'}`}>
                                    {isRecording ? 'Registrazione in corso' : 'In attesa'}
                                </span>
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
        </div >
    );
};