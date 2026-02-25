import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Play,
    Pause,
    Square,
    SkipBack,
    SkipForward,
    VolumeX,
    Music,
    ChevronDown,
    Folder
} from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface Source {
    id: number;
    name: string;
}

interface Group {
    id: number;
    name: string;
}

interface PlayerStatus {
    state: 'playing' | 'paused' | 'stopped' | 'nomedia';
    current_source?: string;
    song_title?: string;
    current_time?: number;
    total_time?: number;
    repeat_mode: 'song' | 'group' | 'none';
}

export const MobilePlayer: React.FC = () => {
    const { backgroundColor, highlightColor } = useSettings();
    const queryClient = useQueryClient();

    // ============================================
    // STATE
    // ============================================
    const [selectedSource, setSelectedSource] = useState<number | null>(null);
    const [selectedSourceType, setSelectedSourceType] = useState<'source' | 'group'>('source');
    const [isSourceDropdownOpen, setIsSourceDropdownOpen] = useState(false);
    const [isGroupDropdownOpen, setIsGroupDropdownOpen] = useState(false);
    const [fadeValue, setFadeValue] = useState(0);

    const [controlValues, setControlValues] = useState<Record<string, { volume: number; mute: boolean }>>({
        pl_l: { volume: 0, mute: false },
        pl_r: { volume: 0, mute: false },
    });
    // Fallbacks
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekingTime, setSeekingTime] = useState(0);

    // ============================================
    // QUERIES
    // ============================================
    const { data: statusData } = useQuery<{ status: PlayerStatus }>({
        queryKey: ['player', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/player/status');
            return response.data;
        },
        refetchInterval: 1000,
    });
    const playerStatus = statusData?.status;

    const { data: sourcesData } = useQuery<{ sources: Source[] }>({
        queryKey: ['player', 'sources'],
        queryFn: async () => {
            const response = await api.get('/device/player/sources');
            return response.data;
        },
    });
    const sources = sourcesData?.sources || [];

    const { data: groupsData } = useQuery<{ groups: Group[] }>({
        queryKey: ['player', 'groups'],
        queryFn: async () => {
            try {
                const response = await api.get('/device/player/groups');
                return response.data;
            } catch {
                return { groups: [] };
            }
        },
    });
    const groups = groupsData?.groups || [];

    // Volumes
    const { data: volumesData } = useQuery<{ controls: any[] }>({
        queryKey: ['player', 'volumes'],
        queryFn: async () => {
            try {
                const response = await api.get('/device/audio/controls');
                return response.data;
            } catch {
                return { controls: [] };
            }
        },
    });

    useEffect(() => {
        if (volumesData?.controls) {
            const newValues: any = { ...controlValues };
            volumesData.controls.forEach(ctrl => {
                if (ctrl.id === 'pl_l' || ctrl.id === 'pl_r') {
                    newValues[ctrl.id] = { volume: ctrl.volume, mute: ctrl.mute };
                }
            });
            setControlValues(newValues);
        }
    }, [volumesData]);

    const formatTime = (seconds?: number) => {
        if (!seconds) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    // ============================================
    // MUTATIONS
    // ============================================
    const selectSourceMutation = useMutation({
        mutationFn: async (sourceId: number) => api.post('/device/player/source', { id: sourceId }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player'] }),
    });

    const playMutation = useMutation({
        mutationFn: async () => api.post('/device/player/play'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const pauseMutation = useMutation({
        mutationFn: async () => api.post('/device/player/pause'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const stopMutation = useMutation({
        mutationFn: async () => api.post('/device/player/stop'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const previousMutation = useMutation({
        mutationFn: async () => api.post('/device/player/previous'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const nextMutation = useMutation({
        mutationFn: async () => api.post('/device/player/next'),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const seekMutation = useMutation({
        mutationFn: async (time: number) => api.post('/device/player/seek', { time }),
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const fadeMutation = useMutation({
        mutationFn: async (time: number) => api.post('/device/player/fade', { time }),
    });

    const volumeMutation = useMutation({
        mutationFn: async ({ id, volume }: { id: string; volume: number }) => api.post(`/device/audio/controls/${id}/volume`, { volume }),
    });

    const muteMutation = useMutation({
        mutationFn: async ({ id, mute }: { id: string; mute: boolean }) => api.post(`/device/audio/controls/${id}/mute`, { mute }),
    });

    // Handle Selection
    const handleSourceSelect = (id: number, type: 'source' | 'group') => {
        setSelectedSource(id);
        setSelectedSourceType(type);
        setIsSourceDropdownOpen(false);
        setIsGroupDropdownOpen(false);
        if (type === 'source') selectSourceMutation.mutate(id);
    };

    // Calculate Playcap
    const progress = playerStatus?.total_time 
        ? ((isSeeking ? seekingTime : (playerStatus.current_time || 0)) / playerStatus.total_time) * 100 
        : 0;

    return (
        <div 
            className="h-full flex flex-col p-4 gap-4 overflow-y-auto custom-scrollbar-hidden select-none"
            style={{ backgroundColor: backgroundColor }}
        >
            {/* 1. TOP CONTROL BAR */}
            <div className="flex bg-white/5 border border-white/10 rounded-2xl p-1 gap-2 relative">
                <button 
                    onClick={() => { setIsSourceDropdownOpen(!isSourceDropdownOpen); setIsGroupDropdownOpen(false); }}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedSourceType === 'source' ? 'bg-white/10 text-white shadow-md' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Music className="w-4 h-4" color={selectedSourceType === 'source' ? highlightColor : undefined}/>
                        <span className="font-bold text-sm tracking-widest uppercase">
                            {selectedSourceType === 'source' ? (sources.find(s => s.id === selectedSource)?.name || 'Sorgente') : 'Sorgente'}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isSourceDropdownOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className="w-px bg-white/10 my-2" />
                <button 
                    onClick={() => { setIsGroupDropdownOpen(!isGroupDropdownOpen); setIsSourceDropdownOpen(false); }}
                    className={`flex-1 flex items-center justify-between px-4 py-3 rounded-xl transition-all ${selectedSourceType === 'group' ? 'bg-white/10 text-white shadow-md' : 'text-white/60 hover:bg-white/5 hover:text-white'}`}
                >
                    <div className="flex items-center gap-2">
                        <Folder className="w-4 h-4" color={selectedSourceType === 'group' ? highlightColor : undefined}/>
                        <span className="font-bold text-sm tracking-widest uppercase">
                            {selectedSourceType === 'group' ? (groups.find(g => g.id === selectedSource)?.name || 'Gruppo') : 'Gruppo'}
                        </span>
                    </div>
                    <ChevronDown className={`w-4 h-4 transition-transform ${isGroupDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {/* Dropdowns */}
                {isSourceDropdownOpen && (
                    <div className="absolute top-full left-0 right-1/2 mt-2 mr-1 bg-[#0a0a0c]/95 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                        {sources.map(s => (
                            <button 
                                key={s.id}
                                onClick={() => handleSourceSelect(s.id, 'source')}
                                className="w-full text-left px-5 py-4 font-bold text-sm text-white/60 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors uppercase tracking-widest"
                            >
                                {s.name}
                            </button>
                        ))}
                    </div>
                )}
                {isGroupDropdownOpen && (
                    <div className="absolute top-full left-1/2 right-0 mt-2 ml-1 bg-[#0a0a0c]/95 border border-white/10 rounded-2xl shadow-xl backdrop-blur-xl z-50 overflow-hidden animate-in slide-in-from-top-2">
                        {groups.length === 0 ? (
                            <div className="px-5 py-6 text-center text-xs text-white/30 uppercase tracking-widest">Nessun Gruppo</div>
                        ) : (
                            groups.map(g => (
                                <button 
                                    key={g.id}
                                    onClick={() => handleSourceSelect(g.id, 'group')}
                                    className="w-full text-left px-5 py-4 font-bold text-sm text-white/60 hover:text-white hover:bg-white/5 border-b border-white/5 last:border-0 transition-colors uppercase tracking-widest"
                                >
                                    {g.name}
                                </button>
                            ))
                        )}
                    </div>
                )}
            </div>

            {/* 2. STATUS INDICATOR */}
            <div className="flex justify-center my-2">
                <div className={`px-4 py-1.5 rounded-full border text-xs font-black uppercase tracking-widest flex items-center gap-2 ${
                    playerStatus?.state === 'playing' ? 'bg-green-500/10 border-green-500/20 text-green-400' :
                    playerStatus?.state === 'paused' ? 'bg-yellow-500/10 border-yellow-500/20 text-yellow-400' :
                    'bg-red-500/10 border-red-500/20 text-red-400'
                }`}>
                    <div className={`w-2 h-2 rounded-full ${
                        playerStatus?.state === 'playing' ? 'bg-green-400 animate-pulse' :
                        playerStatus?.state === 'paused' ? 'bg-yellow-400' :
                        'bg-red-400'
                    }`} />
                    {playerStatus?.state === 'playing' ? 'In Riproduzione' :
                     playerStatus?.state === 'paused' ? 'In Pausa' : 'Fermo'}
                </div>
            </div>

            {/* 3. TRACK INFO */}
            <div className="flex flex-col items-center justify-center text-center gap-1 min-h-[50px]">
                {playerStatus?.song_title ? (
                    <>
                        <h2 className="text-2xl font-black text-white uppercase tracking-tighter leading-tight break-words px-4">
                            {playerStatus.song_title}
                        </h2>
                        <p className="text-[10px] font-bold text-white/40 uppercase tracking-[0.2em]">
                            {playerStatus.current_source || 'Sorgente Attuale'}
                        </p>
                    </>
                ) : (
                    <h2 className="text-xl font-bold text-white/30 uppercase tracking-widest">
                        Nessun Brano
                    </h2>
                )}
            </div>

            {/* 4. TRACK NAVIGATION */}
            <div className="flex items-center gap-4 mt-2">
                <button 
                    onClick={() => previousMutation.mutate()}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 active:border-b-0 border-b-4 border-b-black/40 rounded-2xl h-16 flex items-center justify-center transition-all active:translate-y-1 group"
                >
                    <SkipBack className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                </button>
                <button 
                    onClick={() => nextMutation.mutate()}
                    className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 active:border-b-0 border-b-4 border-b-black/40 rounded-2xl h-16 flex items-center justify-center transition-all active:translate-y-1 group"
                >
                    <SkipForward className="w-6 h-6 text-white/60 group-hover:text-white transition-colors" />
                </button>
            </div>

            {/* 5. SEEK TIMELINE */}
            <div className="bg-white/5 border border-white/10 rounded-2xl p-5 flex flex-col gap-4 mt-2">
                <div className="relative w-full h-12 flex items-center justify-between">
                    <span className="text-xs font-black text-white/50 tracking-widest">{formatTime(isSeeking ? seekingTime : playerStatus?.current_time)}</span>
                    <span className="text-xs font-black text-white/50 tracking-widest">{formatTime(playerStatus?.total_time)}</span>
                </div>
                
                <div className="relative w-full h-8 group cursor-pointer flex items-center touch-none">
                    <input
                        type="range"
                        min={0}
                        max={playerStatus?.total_time || 100}
                        value={isSeeking ? seekingTime : (playerStatus?.current_time || 0)}
                        onChange={(e) => {
                            setIsSeeking(true);
                            setSeekingTime(Number(e.target.value));
                        }}
                        onPointerUp={(e) => {
                            setIsSeeking(false);
                            seekMutation.mutate(Number(e.currentTarget.value));
                        }}
                        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 touch-none"
                    />
                    {/* Background Track */}
                    <div className="absolute w-full h-2 bg-black/50 rounded-full overflow-hidden border border-white/5">
                        {/* Fill Progress */}
                        <div 
                            className="h-full bg-gradient-to-r from-blue-600 to-blue-400 rounded-full transition-all duration-100 ease-linear"
                            style={{ 
                                width: `${progress}%`,
                                backgroundColor: highlightColor 
                            }}
                        />
                    </div>
                    {/* Handle Thumb */}
                    <div 
                        className="absolute w-6 h-6 bg-white rounded-full shadow-[0_0_15px_rgba(255,255,255,0.5)] border-2 border-black -ml-3 transition-transform duration-100 ease-linear"
                        style={{ left: `${progress}%` }}
                    />
                </div>
            </div>

            {/* 6. PRIMARY TRANSPORT: STOP & PLAY/PAUSE */}
            <div className="flex gap-4 mt-2">
                <button 
                    onClick={() => stopMutation.mutate()}
                    className="w-1/3 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 active:border-b-0 border-b-4 border-b-black/40 rounded-[2rem] h-28 flex flex-col items-center justify-center gap-2 transition-all active:translate-y-1 shadow-lg"
                >
                    <Square className="w-8 h-8 text-red-500 fill-current" />
                    <span className="text-[10px] uppercase font-black tracking-widest text-red-400">Stop</span>
                </button>
                <button 
                    onClick={() => playerStatus?.state === 'playing' ? pauseMutation.mutate() : playMutation.mutate()}
                    className="flex-1 bg-blue-600 border border-blue-400/30 active:border-b-0 border-b-4 border-b-black/50 rounded-[2rem] h-28 flex items-center justify-center transition-all active:translate-y-1 shadow-[0_0_30px_rgba(59,130,246,0.3)] relative overflow-hidden group"
                    style={{ backgroundColor: highlightColor, boxShadow: `0 0 30px ${highlightColor}44` }}
                >
                    <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
                    {playerStatus?.state === 'playing' ? (
                        <Pause className="w-12 h-12 text-white fill-current" />
                    ) : (
                        <Play className="w-12 h-12 text-white fill-current ml-2" />
                    )}
                </button>
            </div>

            {/* 7. BOTTOM CONTROLS: FADE, VOL L, VOL R */}
            <div className="grid grid-cols-3 gap-4 mt-4 pb-10">
                {/* Fade Control */}
                <div className="bg-[#1a1a1c] border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-4 shadow-xl">
                    <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Fade</span>
                    
                    <div className="flex-1 flex items-center justify-center relative my-2">
                        <select
                            value={fadeValue}
                            onChange={(e) => {
                                const val = Number(e.target.value);
                                setFadeValue(val);
                                fadeMutation.mutate(val);
                            }}
                            className="appearance-none bg-transparent w-full text-center text-3xl font-black text-white focus:outline-none z-10"
                            style={{ color: highlightColor }}
                        >
                            {[0, 1, 2, 3, 4, 5].map(v => (
                                <option key={v} value={v} className="bg-black text-white">{v}s</option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-0 w-4 h-4 text-white/40 pointer-events-none" />
                    </div>
                </div>

                {/* PL L Control */}
                <div className="bg-[#1a1a1c] border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-3 shadow-xl">
                    <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">PL L</span>
                        <span className="text-xs font-black" style={{ color: highlightColor }}>
                            {controlValues['pl_l']?.mute ? 'MUTE' : `${controlValues['pl_l']?.volume?.toFixed(1) || '0.0'} dB`}
                        </span>
                    </div>
                    <div className="w-full flex-1 flex flex-col items-center justify-center h-48 py-2 relative">
                        <input
                            type="range"
                            min="-96"
                            max="12"
                            step="0.5"
                            value={controlValues['pl_l']?.volume || 0}
                            onChange={(e) => setControlValues(p => ({ ...p, pl_l: { ...p.pl_l, volume: Number(e.target.value) } }))}
                            onMouseUp={(e) => volumeMutation.mutate({ id: 'pl_l', volume: Number(e.currentTarget.value) })}
                            onTouchEnd={(e) => volumeMutation.mutate({ id: 'pl_l', volume: Number(e.currentTarget.value) })}
                            className="w-40 h-8 -rotate-90 appearance-none bg-transparent origin-center absolute"
                            style={{
                                WebkitAppearance: 'none',
                            }}
                        />
                        {/* Custom visual track for SLIDER */}
                        <div className="w-3 h-full bg-black/50 rounded-full border border-white/5 relative overflow-hidden pointer-events-none">
                            <div 
                                className="absolute bottom-0 w-full transition-all"
                                style={{
                                    height: `${(( (controlValues['pl_l']?.volume || -96) + 96 ) / 108) * 100}%`,
                                    backgroundColor: highlightColor
                                }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => muteMutation.mutate({ id: 'pl_l', mute: !controlValues['pl_l']?.mute })}
                        className={`w-full h-10 mt-2 rounded-xl border flex items-center justify-center transition-all ${
                            controlValues['pl_l']?.mute 
                            ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 border-b-4 border-b-black/40 active:border-b-0 active:translate-y-1 text-white/40 hover:text-white'
                        }`}
                    >
                        <VolumeX className="w-4 h-4" />
                    </button>
                </div>

                {/* PL R Control */}
                <div className="bg-[#1a1a1c] border border-white/5 rounded-3xl p-4 flex flex-col items-center gap-3 shadow-xl">
                    <div className="flex items-center justify-between w-full px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-white/40">PL R</span>
                        <span className="text-xs font-black" style={{ color: highlightColor }}>
                            {controlValues['pl_r']?.mute ? 'MUTE' : `${controlValues['pl_r']?.volume?.toFixed(1) || '0.0'} dB`}
                        </span>
                    </div>
                    <div className="w-full flex-1 flex flex-col items-center justify-center h-48 py-2 relative">
                        <input
                            type="range"
                            min="-96"
                            max="12"
                            step="0.5"
                            value={controlValues['pl_r']?.volume || 0}
                            onChange={(e) => setControlValues(p => ({ ...p, pl_r: { ...p.pl_r, volume: Number(e.target.value) } }))}
                            onMouseUp={(e) => volumeMutation.mutate({ id: 'pl_r', volume: Number(e.currentTarget.value) })}
                            onTouchEnd={(e) => volumeMutation.mutate({ id: 'pl_r', volume: Number(e.currentTarget.value) })}
                            className="w-40 h-8 -rotate-90 appearance-none bg-transparent origin-center absolute"
                        />
                        {/* Custom visual track for SLIDER */}
                        <div className="w-3 h-full bg-black/50 rounded-full border border-white/5 relative overflow-hidden pointer-events-none">
                            <div 
                                className="absolute bottom-0 w-full transition-all"
                                style={{
                                    height: `${(( (controlValues['pl_r']?.volume || -96) + 96 ) / 108) * 100}%`,
                                    backgroundColor: highlightColor
                                }}
                            />
                        </div>
                    </div>
                    <button
                        onClick={() => muteMutation.mutate({ id: 'pl_r', mute: !controlValues['pl_r']?.mute })}
                        className={`w-full h-10 mt-2 rounded-xl border flex items-center justify-center transition-all ${
                            controlValues['pl_r']?.mute 
                            ? 'bg-red-500/20 border-red-500/50 text-red-400' 
                            : 'bg-white/5 hover:bg-white/10 border-white/10 border-b-4 border-b-black/40 active:border-b-0 active:translate-y-1 text-white/40 hover:text-white'
                        }`}
                    >
                        <VolumeX className="w-4 h-4" />
                    </button>
                </div>

            </div>

            <style>{`
                .custom-scrollbar-hidden::-webkit-scrollbar {
                    display: none;
                }
                .custom-scrollbar-hidden {
                    -ms-overflow-style: none;
                    scrollbar-width: none;
                }
                
                input[type=range]::-webkit-slider-thumb {
                    -webkit-appearance: none;
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: transparent;
                    cursor: pointer;
                    margin-top: -8px;
                }
                input[type=range]::-moz-range-thumb {
                    height: 24px;
                    width: 24px;
                    border-radius: 50%;
                    background: transparent;
                    cursor: pointer;
                    border: none;
                }
                input[type=range]::-webkit-slider-runnable-track {
                    width: 100%;
                    height: 8px;
                    cursor: pointer;
                    background: transparent;
                    border-radius: 8px;
                }
            `}</style>
        </div>
    );
};
