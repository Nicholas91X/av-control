import React, { useState, useEffect, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import {
    Play,
    Pause,
    Square,
    SkipForward,
    SkipBack,
    Repeat,
    Repeat1,
    Music,
    ListMusic,
    Check,
    ChevronDown,
    Search,
    VolumeX,
    Rewind as FastRewind,
    FastForward,
    ArrowRight,
    Plus,
    Minus,
    RefreshCw,
    Delete,
    CornerDownLeft,
    Undo2,
    X
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useIsTablet } from '../hooks/useIsTablet';

interface Source {
    id: number;
    name: string;
}

interface Song {
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

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

export const Players: React.FC = () => {
    const isTablet = useIsTablet();
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const songListRef = useRef<HTMLDivElement>(null);

    // ============================================
    // STATE & QUERIES
    // ============================================
    const [selectedSource, setSelectedSource] = useState<number | null>(null);
    const [isMutating, setIsMutating] = useState(false);
    const [pendingVolumes, setPendingVolumes] = useState<Record<number, number>>({});
    const [controlValues, setControlValues] = useState<Record<number, any>>({});
    const [isSeeking, setIsSeeking] = useState(false);
    const [seekingTime, setSeekingTime] = useState(0);
    const lastSeekTimeRef = useRef<number>(0);
    const lastTransportActionTimeRef = useRef<number>(0);
    const lastKnownPlayheadRef = useRef<{ time: number; timestamp: number }>({ time: 0, timestamp: 0 });

    // Search State
    const [isSearchModalOpen, setIsSearchModalOpen] = useState(false);
    const [searchQuery, setSearchQuery] = useState('');
    const [searchResults, setSearchResults] = useState<number[]>([]);
    const [currentSearchIndex, setCurrentSearchIndex] = useState(-1);
    const [isSearchActive, setIsSearchActive] = useState(false);
    const [keyboardLayout, setKeyboardLayout] = useState<'alpha' | 'symbols'>('alpha');

    // Fade State
    const [fadeValue, setFadeValue] = useState(4);
    const [isFadeDropdownOpen, setIsFadeDropdownOpen] = useState(false);
    const fadeRef = useRef<HTMLDivElement>(null);
    const [isOTPDashboardOpen, setIsOTPDashboardOpen] = useState(false);

    // Fetch controls to find Volume 1 and Volume 2
    const { data: controlsData } = useQuery<{ controls: any[] }>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data;
        },
    });
    const allControls = controlsData?.controls || [];
    const volumeControls = allControls
        .filter(c => c.type === 'volume_mute' || c.name.toLowerCase().includes('volume'))
        .slice(0, 2);

    // Fetch values for our volume controls
    useEffect(() => {
        const fetchValues = async () => {
            const values: Record<number, any> = {};
            for (const ctrl of volumeControls) {
                try {
                    const volRes = await api.get(`/device/controls/volume/${ctrl.id}`);
                    let mute = false;
                    if (ctrl.second_id) {
                        const muteRes = await api.get(`/device/controls/mute/${ctrl.second_id}`);
                        mute = muteRes.data.mute;
                    }
                    values[ctrl.id] = { volume: volRes.data.volume, mute };
                } catch (e) { console.error(e); }
            }
            setControlValues(values);
        };
        if (volumeControls.length > 0) fetchValues();
    }, [volumeControls.length]);

    const setControlMutation = useMutation({
        mutationFn: async ({ id, value }: { id: number; value: number | boolean }) => {
            await api.post(`/device/controls/${id}`, { value });
        },
        onMutate: () => setIsMutating(true),
        onSettled: () => setIsMutating(false),
        onSuccess: (_data, variables) => {
            // Se è un'azione sul volume, non invalidiamo tutto per evitare glitch visivi
            // Ma aggiorniamo solo se non è un volume
            const control = volumeControls.find(c => c.id === variables.id || c.second_id === variables.id);
            if (!control) {
                queryClient.invalidateQueries({ queryKey: ['controls'] });
            }
        }
    });

    const handleStepVolume = (control: any, direction: 'up' | 'down') => {
        const current = controlValues[control.id]?.volume ?? 0;
        const step = control.step || 1;
        const next = direction === 'up' ? current + step : current - step;
        const clamped = Math.max(control.min || -96, Math.min(control.max || 12, next));
        setControlMutation.mutate({ id: control.id, value: clamped });
        setControlValues(prev => ({
            ...prev,
            [control.id]: { ...prev[control.id], volume: clamped }
        }));
    };

    const handleSliderChange = (control: any, e: React.ChangeEvent<HTMLInputElement>) => {
        const val = parseFloat(e.target.value);
        setPendingVolumes(prev => ({ ...prev, [control.id]: val }));
    };

    const handleSliderRelease = (control: any, val: number) => {
        setControlMutation.mutate({ id: control.id, value: val });
        // Update local state immediately so it doesn't snap back before the next fetch
        setControlValues(prev => ({
            ...prev,
            [control.id]: { ...prev[control.id], volume: val }
        }));
        setPendingVolumes(prev => {
            const next = { ...prev };
            delete next[control.id];
            return next;
        });
    };

    // Fetch sources
    const { data: sourcesData } = useQuery<{ sources: Source[] }>({
        queryKey: ['player', 'sources'],
        queryFn: async () => {
            const response = await api.get('/device/player/sources');
            return response.data;
        },
    });
    const sources = sourcesData?.sources || [];

    // Sync source selection
    useEffect(() => {
        if (sources.length > 0 && selectedSource === null) {
            const defaultSource = sources[0].id;
            setSelectedSource(defaultSource);
            selectSourceMutation.mutate(defaultSource);
        }
    }, [sources]);

    // Fetch songs for selected source
    const { data: songsData, isLoading: isLoadingSongs } = useQuery<{ songs: Song[] }>({
        queryKey: ['player', 'songs', selectedSource],
        queryFn: async () => {
            const response = await api.get('/device/player/songs');
            return response.data;
        },
        enabled: selectedSource !== null,
        staleTime: 0,
    });
    const songs = songsData?.songs || [];

    // Fetch player status (Polling)
    const { data: playerStatus } = useQuery<PlayerStatus>({
        queryKey: ['player', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/player/status');
            return response.data;
        },
        refetchInterval: isMutating ? false : 1000,
    });

    // ============================================
    // MUTATIONS
    // ============================================
    const selectSourceMutation = useMutation({
        mutationFn: async (sourceId: number) => {
            queryClient.setQueryData(['player', 'songs', sourceId], []);
            await api.post('/device/player/source', { id: sourceId });
        },
        onMutate: () => setIsMutating(true),
        onSettled: () => setIsMutating(false),
        onSuccess: async () => {
            await wait(200);
            queryClient.invalidateQueries({ queryKey: ['player', 'songs'] });
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        },
    });

    const selectSongMutation = useMutation({
        mutationFn: async (songId: number) => {
            await api.post('/device/player/song', { id: songId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        },
    });

    const playMutation = useMutation({
        mutationFn: async () => api.post('/device/player/play'),
        onMutate: async () => {
            const now = Date.now();
            lastTransportActionTimeRef.current = now;
            // Capture current position before play starts to avoid reset
            const currentStatus = queryClient.getQueryData<PlayerStatus>(['player', 'status']);
            if (currentStatus) {
                lastKnownPlayheadRef.current = { time: currentStatus.current_time || 0, timestamp: now };
            }

            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, state: 'playing' };
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const pauseMutation = useMutation({
        mutationFn: async () => api.post('/device/player/pause'),
        onMutate: async () => {
            const now = Date.now();
            lastTransportActionTimeRef.current = now;

            const currentStatus = queryClient.getQueryData<PlayerStatus>(['player', 'status']);
            if (currentStatus) {
                lastKnownPlayheadRef.current = { time: currentStatus.current_time || 0, timestamp: now };
            }

            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, state: 'paused' };
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const stopMutation = useMutation({
        mutationFn: async () => api.post('/device/player/stop'),
        onMutate: async () => {
            lastTransportActionTimeRef.current = Date.now();
            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, state: 'stopped', current_time: 0 };
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const nextMutation = useMutation({
        mutationFn: async () => api.post('/device/player/next'),
        onMutate: async () => {
            lastTransportActionTimeRef.current = Date.now();
            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, current_time: 0 };
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const previousMutation = useMutation({
        mutationFn: async () => api.post('/device/player/previous'),
        onMutate: async () => {
            lastTransportActionTimeRef.current = Date.now();
            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, current_time: 0 };
            });
        },
        onSuccess: () => queryClient.invalidateQueries({ queryKey: ['player', 'status'] }),
    });

    const seekMutation = useMutation({
        mutationFn: async (time: number) => api.post('/device/player/seek', { time }),
        onMutate: async (time: number) => {
            setIsMutating(true);
            lastTransportActionTimeRef.current = Date.now();
            lastSeekTimeRef.current = Date.now();
            lastKnownPlayheadRef.current = { time, timestamp: Date.now() };

            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            const previousStatus = queryClient.getQueryData<PlayerStatus>(['player', 'status']);
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, current_time: time };
            });
            return { previousStatus };
        },
        onSuccess: () => {
            // Keep local data fresh
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        },
        onSettled: () => setIsMutating(false),
    });

    const repeatMutation = useMutation({
        mutationFn: async (mode: string) => {
            const modeMap: Record<string, string> = {
                'off': 'none',
                'one': 'song',
                'all': 'group'
            };
            return api.post('/device/player/repeat', { mode: modeMap[mode] || 'none' });
        },
        onMutate: async (mode: string) => {
            setIsMutating(true);
            const modeMap: Record<string, 'song' | 'group' | 'none'> = {
                'off': 'none', 'one': 'song', 'all': 'group'
            };
            await queryClient.cancelQueries({ queryKey: ['player', 'status'] });
            const previousStatus = queryClient.getQueryData<PlayerStatus>(['player', 'status']);
            queryClient.setQueryData<PlayerStatus>(['player', 'status'], (old) => {
                if (!old) return old;
                return { ...old, repeat_mode: modeMap[mode] };
            });
            return { previousStatus };
        },
        onSettled: async () => {
            await wait(500);
            setIsMutating(false);
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        },
    });

    // WebSocket updates
    useEffect(() => {
        if (isMutating) return;
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        }
    }, [lastMessage, queryClient, isMutating]);

    // Handle click outside for dropdowns
    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (fadeRef.current && !fadeRef.current.contains(event.target as Node)) {
                setIsFadeDropdownOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    // Helpers
    const formatTime = (seconds?: number) => {
        if (!seconds) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const getStatusDisplay = (state?: string) => {
        const s = state?.toLowerCase() || 'stopped';
        if (s === 'playing') return { text: 'IN RIPRODUZIONE', color: 'text-green-400', bg: 'bg-green-500/20', border: 'border-green-500/30' };
        if (s === 'paused') return { text: 'IN PAUSA', color: 'text-yellow-400', bg: 'bg-yellow-500/20', border: 'border-yellow-500/30' };
        return { text: 'FERMO', color: 'text-red-400', bg: 'bg-red-500/20', border: 'border-red-500/30' };
    };

    const scrollToSong = (index: number) => {
        if (songListRef.current) {
            const container = songListRef.current;
            // songListRef.current points to the div with overflow-y-auto
            // Inside it, we have the outer container, then the list of buttons
            const innerContainer = container.querySelector('.song-list-container');
            if (innerContainer) {
                const songElement = innerContainer.children[index] as HTMLElement;
                if (songElement) {
                    songElement.scrollIntoView({ behavior: 'smooth', block: 'center' });
                }
            }
        }
    };

    const handleSearch = (query: string) => {
        if (!query.trim()) return;

        const results: number[] = [];
        const lowerQuery = query.toLowerCase();

        songs.forEach((song, idx) => {
            const position = (idx + 1).toString();
            if (song.name.toLowerCase().includes(lowerQuery) || position.includes(lowerQuery)) {
                results.push(idx);
            }
        });

        setSearchResults(results);
        if (results.length > 0) {
            setCurrentSearchIndex(0);
            setIsSearchActive(true);
            setIsSearchModalOpen(false);
            // Select the first result on the server
            selectSongMutation.mutate(songs[results[0]].id);
            // We use a small timeout to ensure states are updated
            setTimeout(() => scrollToSong(results[0]), 100);
        }
    };

    const findNext = () => {
        if (searchResults.length === 0) return;
        const nextIndex = (currentSearchIndex + 1) % searchResults.length;
        setCurrentSearchIndex(nextIndex);
        // Sync with server
        selectSongMutation.mutate(songs[searchResults[nextIndex]].id);
        scrollToSong(searchResults[nextIndex]);
    };

    const clearSearch = () => {
        setIsSearchActive(false);
        setSearchResults([]);
        setCurrentSearchIndex(-1);
        setSearchQuery('');
    };


    // ============================================
    // RENDER TABLET VIEW
    // ============================================
    if (isTablet) {
        return (
            <div className="h-screen bg-[#0a0a0c] flex flex-col overflow-hidden text-white font-sans">
                {/* Main Content Grid */}
                <div className="flex-1 flex overflow-hidden p-6 gap-6">

                    {/* Column 1: Sources (Left) */}
                    <div className="w-[20%] flex flex-col gap-4 justify-end pb-2">
                        <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-2">
                            <h2 className="text-blue-400 font-bold tracking-widest uppercase text-xs">Sources</h2>
                        </div>
                        <div className="flex flex-col gap-2 overflow-y-auto custom-scrollbar-hidden">
                            {sources.map((source) => {
                                const isSelected = selectedSource === source.id;
                                return (
                                    <button
                                        key={source.id}
                                        onClick={() => {
                                            setSelectedSource(source.id);
                                            selectSourceMutation.mutate(source.id);
                                        }}
                                        className={`w-full text-left p-6 rounded-xl font-bold text-xl transition-all duration-300 ${isSelected
                                            ? 'bg-blue-600 text-white shadow-[0_0_20px_rgba(37,99,235,0.4)]'
                                            : 'bg-white/5 text-blue-200/40 hover:bg-white/10'
                                            }`}
                                    >
                                        {source.name}
                                    </button>
                                );
                            })}
                            <div className="mt-4 p-4 text-[10px] text-white/20 font-mono tracking-tighter">
                                Internal: 2919MB / 10685MB
                            </div>
                        </div>
                    </div>

                    {/* Column 2: Songs & Transport (Center) */}
                    <div className="flex-1 flex flex-col gap-6">
                        {/* Songs Library */}
                        <div
                            ref={songListRef}
                            className="flex-1 bg-white/5 border border-white/10 rounded-2xl overflow-y-auto custom-scrollbar-hidden"
                        >
                            {isLoadingSongs ? (
                                <div className="h-full flex items-center justify-center">
                                    <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
                                </div>
                            ) : (
                                <div className="divide-y divide-white/5 song-list-container">
                                    {songs.map((song, index) => {
                                        const isPlaying = playerStatus?.song_title === song.name;
                                        const isSearchResult = searchResults.includes(index);
                                        const isCurrentSelection = isSearchActive && searchResults[currentSearchIndex] === index;

                                        return (
                                            <button
                                                key={song.id}
                                                onClick={() => {
                                                    selectSongMutation.mutate(song.id);
                                                    // If search is active and this song is in results, update current match index
                                                    if (isSearchActive) {
                                                        const resIdx = searchResults.indexOf(index);
                                                        if (resIdx !== -1) {
                                                            setCurrentSearchIndex(resIdx);
                                                        }
                                                    }
                                                }}
                                                className={`w-full flex items-center p-5 text-left transition-all border-l-4 ${isCurrentSelection
                                                    ? 'bg-blue-600/40 border-blue-400 shadow-[inset_0_0_20px_rgba(59,130,246,0.3)] z-10'
                                                    : isSearchResult
                                                        ? 'bg-blue-600/10 border-blue-400/30'
                                                        : isPlaying
                                                            ? 'bg-blue-600/20 text-blue-400 border-transparent'
                                                            : 'hover:bg-white/5 text-white/70 border-transparent'
                                                    }`}
                                            >
                                                <span className={`w-12 font-mono text-xl ${isSearchResult ? 'opacity-100 text-blue-400' : 'opacity-40'}`}>
                                                    {(index + 1).toString().padStart(1, ' ')}
                                                </span>
                                                <span className={`text-2xl font-bold tracking-tight uppercase truncate ${isSearchResult ? 'text-white' : ''}`}>
                                                    {song.name}
                                                </span>
                                                {isCurrentSelection && (
                                                    <div className="ml-auto w-2 h-2 bg-blue-400 rounded-full animate-pulse shadow-[0_0_10px_rgba(96,165,250,1)]" />
                                                )}
                                            </button>
                                        );
                                    })}
                                </div>
                            )}
                        </div>

                        {(() => {
                            const status = getStatusDisplay(playerStatus?.state);

                            // TRANSPORT STABILITY ENGINE
                            const now = Date.now();
                            const isPlaying = playerStatus?.state === 'playing';
                            const timeSinceLastAction = now - lastTransportActionTimeRef.current;
                            const isInGracePeriod = timeSinceLastAction < 10000; // Increased to 10s for max safety

                            let effectiveTime: number;

                            if (isSeeking) {
                                effectiveTime = seekingTime;
                            } else if (isInGracePeriod) {
                                // During grace period, calculate local projection
                                const baseTime = lastKnownPlayheadRef.current.time;
                                const elapsed = isPlaying ? Math.floor((now - lastKnownPlayheadRef.current.timestamp) / 1000) : 0;
                                effectiveTime = Math.min(baseTime + elapsed, playerStatus?.total_time || 999);
                            } else {
                                effectiveTime = playerStatus?.current_time || 0;
                                lastKnownPlayheadRef.current = { time: effectiveTime, timestamp: now };
                            }

                            const progressPercent = ((effectiveTime / (playerStatus?.total_time || 1)) * 100);

                            return (
                                <>
                                    {/* Status Bar */}
                                    <div className={`bg-black/60 border-2 ${status.border} rounded-xl p-3 flex items-center justify-between`}>
                                        <div className="flex items-center gap-4">
                                            <span className={`${status.bg} ${status.color} px-4 py-1.5 rounded-md text-xs font-black uppercase tracking-widest border ${status.border} shadow-[0_0_15px_rgba(0,0,0,0.5)]`}>
                                                {status.text}
                                            </span>
                                            <div className="h-4 w-px bg-white/10" />
                                            <span className={`${status.color} font-bold text-xl tracking-tight uppercase truncate max-w-[400px]`}>
                                                {playerStatus?.song_title || 'Nessun brano'}
                                            </span>
                                        </div>
                                        <div className={`${status.color} font-mono text-xl font-black tabular-nums`}>
                                            {formatTime(effectiveTime)}
                                        </div>
                                    </div>

                                    {/* Transport Controls */}
                                    <div className="flex justify-between gap-4 mb-6 px-1">
                                        {/* 1) Brano precedente */}
                                        <button
                                            onClick={() => previousMutation.mutate()}
                                            className="flex-1 h-20 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-[2.5rem] shadow-xl transition-all active:translate-y-1 active:border-b-0 group"
                                        >
                                            <SkipBack className="w-10 h-10 text-blue-400/80 fill-blue-400/5 group-hover:text-blue-400 transition-colors" />
                                        </button>

                                        {/* 2) Traccia indietro di 5 secondi */}
                                        <button
                                            onClick={() => {
                                                const newTime = Math.max(0, effectiveTime - 5);
                                                lastTransportActionTimeRef.current = Date.now();
                                                lastKnownPlayheadRef.current = { time: newTime, timestamp: Date.now() };
                                                seekMutation.mutate(newTime);
                                            }}
                                            className="flex-1 h-20 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-[2.5rem] shadow-xl transition-all active:translate-y-1 active:border-b-0 group"
                                        >
                                            <FastRewind className="w-10 h-10 text-blue-400/80 fill-blue-400/5 group-hover:text-blue-400 transition-colors" />
                                        </button>

                                        {/* 3) Play/Pause */}
                                        {isPlaying ? (
                                            <button
                                                onClick={() => pauseMutation.mutate()}
                                                className="flex-1 h-20 flex items-center justify-center bg-blue-600 hover:bg-blue-500 border border-blue-400/50 border-b-4 border-blue-500/50 rounded-[2.5rem] shadow-[0_10px_30px_rgba(37,99,235,0.3)] transition-all active:translate-y-1 active:border-b-0 group"
                                            >
                                                <Pause className="w-10 h-10 text-white fill-white" />
                                            </button>
                                        ) : (
                                            <button
                                                onClick={() => playMutation.mutate()}
                                                className="flex-1 h-20 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-[2.5rem] shadow-xl transition-all active:translate-y-1 active:border-b-0 group"
                                            >
                                                <Play className="w-10 h-10 text-blue-400/80 fill-blue-400/5 ml-1 group-hover:text-blue-400 transition-colors" />
                                            </button>
                                        )}

                                        {/* 4) Stop */}
                                        <button
                                            onClick={() => stopMutation.mutate()}
                                            className="flex-1 h-20 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-[2.5rem] shadow-xl transition-all active:translate-y-1 active:border-b-0 group"
                                        >
                                            <Square className="w-10 h-10 text-blue-400/80 fill-blue-400/5 group-hover:text-blue-400 transition-colors" />
                                        </button>

                                        {/* 5) Traccia avanti di 5 secondi */}
                                        <button
                                            onClick={() => {
                                                const newTime = Math.min(playerStatus?.total_time || 999, effectiveTime + 5);
                                                lastTransportActionTimeRef.current = Date.now();
                                                lastKnownPlayheadRef.current = { time: newTime, timestamp: Date.now() };
                                                seekMutation.mutate(newTime);
                                            }}
                                            className="flex-1 h-20 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-[2.5rem] shadow-xl transition-all active:translate-y-1 active:border-b-0 group"
                                        >
                                            <FastForward className="w-10 h-10 text-blue-400/80 fill-blue-400/5 group-hover:text-blue-400 transition-colors" />
                                        </button>

                                        {/* 6) Brano successivo */}
                                        <button
                                            onClick={() => nextMutation.mutate()}
                                            className="flex-1 h-20 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-[2.5rem] shadow-xl transition-all active:translate-y-1 active:border-b-0 group"
                                        >
                                            <SkipForward className="w-10 h-10 text-blue-400/80 fill-blue-400/5 group-hover:text-blue-400 transition-colors" />
                                        </button>
                                    </div>

                                    {/* Seek Bar - Modern & Elegant */}
                                    <div className="flex flex-col gap-2 bg-white/5 border border-white/10 p-6 rounded-2xl">
                                        <div className="relative h-4 flex items-center">
                                            {/* Track Background */}
                                            <div className="absolute inset-x-0 h-1.5 bg-white/10 rounded-full" />

                                            {/* Active Progress Track */}
                                            <div
                                                className={`absolute left-0 h-1.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-full shadow-[0_0_15px_rgba(59,130,246,0.6)] ${!isSeeking ? 'transition-all duration-500' : ''}`}
                                                style={{ width: `${progressPercent}%` }}
                                            />

                                            {/* Interactive Slider - LARGE TOUCH AREA */}
                                            <input
                                                type="range"
                                                min={0}
                                                max={playerStatus?.total_time || 100}
                                                value={effectiveTime}
                                                onMouseDown={() => {
                                                    setIsSeeking(true);
                                                    setSeekingTime(effectiveTime);
                                                }}
                                                onTouchStart={() => {
                                                    setIsSeeking(true);
                                                    setSeekingTime(effectiveTime);
                                                }}
                                                onInput={(e) => {
                                                    setSeekingTime(parseInt((e.target as HTMLInputElement).value));
                                                }}
                                                onChange={(e) => {
                                                    const newVal = parseInt(e.target.value);
                                                    setSeekingTime(newVal);
                                                }}
                                                onMouseUp={(e) => {
                                                    const val = parseInt((e.target as HTMLInputElement).value);
                                                    lastTransportActionTimeRef.current = Date.now();
                                                    lastKnownPlayheadRef.current = { time: val, timestamp: Date.now() };
                                                    seekMutation.mutate(val);
                                                    setTimeout(() => setIsSeeking(false), 50);
                                                }}
                                                onTouchEnd={(e) => {
                                                    const val = parseInt((e.target as HTMLInputElement).value);
                                                    lastTransportActionTimeRef.current = Date.now();
                                                    lastKnownPlayheadRef.current = { time: val, timestamp: Date.now() };
                                                    seekMutation.mutate(val);
                                                    setTimeout(() => setIsSeeking(false), 50);
                                                }}
                                                className="absolute inset-x-0 w-full h-20 -top-8 opacity-0 cursor-pointer z-30"
                                            />

                                            {/* Elegant Handle */}
                                            <div
                                                className={`absolute w-6 h-6 bg-white rounded-full shadow-[0_0_20px_rgba(255,255,255,0.6)] pointer-events-none z-10 border-2 border-blue-500 ${!isSeeking ? 'transition-all duration-500' : 'transition-transform'}`}
                                                style={{
                                                    left: `calc(${progressPercent}% - 12px)`,
                                                    transform: isSeeking ? 'scale(1.2)' : 'scale(1)'
                                                }}
                                            />
                                        </div>
                                        <div className="flex justify-between text-[10px] font-black text-white/30 tracking-widest uppercase">
                                            <span>{formatTime(effectiveTime)}</span>
                                            <span>{formatTime(playerStatus?.total_time)}</span>
                                        </div>
                                    </div>
                                </>
                            );
                        })()}

                    </div>

                    {/* Column 3: Volume & Nav (Right) - ANALOG MIXER STYLE */}
                    <div className="w-[18%] flex flex-col gap-4 pb-2">
                        {/* Main Fader Box */}
                        <div className="flex-1 flex flex-col gap-6 bg-gradient-to-b from-white/10 to-transparent border border-white/20 rounded-[3rem] p-6 backdrop-blur-xl shadow-2xl relative overflow-hidden">
                            <div className="flex-1 flex flex-row justify-center gap-8">
                                {volumeControls.map(ctrl => {
                                    const val = ctrl.id in pendingVolumes ? pendingVolumes[ctrl.id] : (controlValues[ctrl.id]?.volume ?? 0);
                                    const isMuted = controlValues[ctrl.id]?.mute;
                                    const min = ctrl.min ?? -96;
                                    const max = ctrl.max ?? 12;
                                    const range = max - min;
                                    const percent = ((val - min) / range) * 100;

                                    return (
                                        <div key={`channel-${ctrl.id}`} className="flex flex-col items-center gap-8 h-full">
                                            {/* Plus Button */}
                                            <button
                                                onClick={() => handleStepVolume(ctrl, 'up')}
                                                className="w-14 h-14 flex items-center justify-center bg-[#1a1a1c] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-2xl transition-all active:translate-y-1 active:border-b-0 shadow-lg shrink-0"
                                            >
                                                <Plus className="w-6 h-6 text-blue-400" />
                                            </button>

                                            {/* Fader Track */}
                                            <div className="flex-1 relative w-12 flex flex-col items-center group py-4">
                                                {/* Track Slot */}
                                                <div className="absolute inset-y-0 w-2.5 bg-black/80 rounded-full border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] overflow-hidden">
                                                    <div
                                                        className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 opacity-20 blur-[1px]"
                                                        style={{ height: `${percent}%` }}
                                                    />
                                                </div>

                                                {/* Fader Cap */}
                                                <div
                                                    className="absolute w-12 h-18 z-20 pointer-events-none"
                                                    style={{ bottom: `calc(${percent}% - 36px)` }}
                                                >
                                                    <div className="w-full h-full bg-gradient-to-b from-[#444] via-[#1a1a1c] to-[#000] border border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded flex flex-col items-center justify-center">
                                                        <div className="w-full h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] mb-1" />
                                                        <div className="flex flex-col gap-0.5 opacity-20 mb-1">
                                                            <div className="w-4 h-px bg-white" />
                                                            <div className="w-4 h-px bg-white" />
                                                            <div className="w-4 h-px bg-white" />
                                                        </div>
                                                        <div className="font-mono text-[9px] font-bold text-blue-400">
                                                            {Math.round(val)}
                                                        </div>
                                                    </div>
                                                </div>

                                                {/* Interaction Layer */}
                                                <input
                                                    type="range"
                                                    min={min}
                                                    max={max}
                                                    step={ctrl.step || 0.1}
                                                    value={val}
                                                    onChange={(e) => handleSliderChange(ctrl, e)}
                                                    onMouseUp={(e) => handleSliderRelease(ctrl, parseFloat((e.target as HTMLInputElement).value))}
                                                    onTouchEnd={(e) => handleSliderRelease(ctrl, parseFloat((e.target as HTMLInputElement).value))}
                                                    className="absolute inset-x-0 -inset-y-0 opacity-0 cursor-pointer h-full w-[150%] -left-[25%] z-30"
                                                    style={{
                                                        appearance: 'slider-vertical' as any,
                                                        WebkitAppearance: 'slider-vertical' as any,
                                                        width: '48px',
                                                    }}
                                                />
                                            </div>

                                            {/* Minus Button */}
                                            <button
                                                onClick={() => handleStepVolume(ctrl, 'down')}
                                                className="w-14 h-14 flex items-center justify-center bg-[#1a1a1c] hover:bg-[#252528] border border-white/10 border-b-4 border-white/10 rounded-2xl transition-all active:translate-y-1 active:border-b-0 shadow-lg shrink-0"
                                            >
                                                <Minus className="w-6 h-6 text-blue-400" />
                                            </button>

                                            {/* Mute Button */}
                                            <button
                                                onClick={() => {
                                                    const muteId = ctrl.second_id || ctrl.id;
                                                    setControlMutation.mutate({ id: muteId, value: !isMuted });
                                                    setControlValues(prev => ({
                                                        ...prev,
                                                        [ctrl.id]: { ...prev[ctrl.id], mute: !isMuted }
                                                    }));
                                                }}
                                                className={`w-14 h-12 rounded-2xl flex items-center justify-center transition-all border shrink-0 border-b-4 active:translate-y-1 active:border-b-0 ${isMuted
                                                    ? 'bg-red-600 border-red-400 border-b-red-800 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                                                    : 'bg-[#1a1a1c] border-white/10 border-b-white/10 text-blue-400 hover:border-blue-500 shadow-lg'
                                                    }`}
                                            >
                                                <VolumeX className={`w-7 h-7 ${isMuted ? 'animate-pulse' : ''}`} />
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>

                            {/* Recall Preset Button */}
                            <button
                                onClick={() => {
                                    volumeControls.forEach(ctrl => {
                                        setControlMutation.mutate({ id: ctrl.id, value: 0 });
                                        setControlValues(prev => ({
                                            ...prev,
                                            [ctrl.id]: { ...prev[ctrl.id], volume: 0 }
                                        }));
                                    });
                                }}
                                className="mx-auto w-12 h-12 bg-[#1a1a1c] border border-white/10 border-b-4 border-white/10 rounded-full flex items-center justify-center text-red-500/60 hover:text-red-500 hover:bg-white/10 transition-all active:translate-y-1 active:border-b-0 group shadow-lg"
                            >
                                <RefreshCw className="w-5 h-5 group-hover:rotate-180 transition-transform duration-500" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Bottom Utility Bar - REDESIGNED TRIPARTITE LAYOUT */}
                <div className="h-24 bg-black border-t border-white/10 flex items-center px-6 gap-3 shrink-0 relative z-50">

                    {/* SECTION 1: MEDIA MANAGEMENT */}
                    <div className="flex-1 flex items-center">
                        <button className="px-6 h-12 bg-white/5 border border-white/10 border-b-4 border-black/40 rounded-xl text-sm font-black uppercase tracking-widest text-white/40 hover:text-white hover:bg-white/10 transition-all active:translate-y-1 active:border-b-0">
                            Songs Management
                        </button>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    {/* SECTION 2: PLAYBACK CONTROLS */}
                    <div className="flex-[1.5] flex items-center justify-center gap-4">
                        <div className="flex gap-2">
                            <button
                                onClick={() => {
                                    const isGroup = playerStatus?.repeat_mode === 'group';
                                    repeatMutation.mutate(isGroup ? 'off' : 'all');
                                }}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border border-b-4 shadow-lg active:translate-y-1 active:border-b-0 ${playerStatus?.repeat_mode === 'group'
                                    ? 'bg-blue-600 border-blue-400 border-b-blue-900/60 shadow-[0_0_15px_rgba(59,130,246,0.5)] text-white'
                                    : 'bg-white/5 border-white/10 border-b-black/40 text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <ListMusic className="w-6 h-6" />
                            </button>
                            <button
                                onClick={() => {
                                    const isSong = playerStatus?.repeat_mode === 'song';
                                    repeatMutation.mutate(isSong ? 'off' : 'one');
                                }}
                                className={`w-12 h-12 rounded-xl flex items-center justify-center transition-all border border-b-4 shadow-lg active:translate-y-1 active:border-b-0 ${playerStatus?.repeat_mode === 'song'
                                    ? 'bg-blue-600 border-blue-400 border-b-blue-900/60 shadow-[0_0_15px_rgba(59,130,246,0.5)] text-white'
                                    : 'bg-white/5 border-white/10 border-b-black/40 text-white/40 hover:text-white hover:bg-white/10'
                                    }`}
                            >
                                <Repeat1 className="w-6 h-6" />
                            </button>
                        </div>

                        <button
                            onClick={() => setIsOTPDashboardOpen(true)}
                            className="w-12 h-12 bg-white/5 border border-white/10 border-b-4 border-black/40 rounded-xl flex items-center justify-center text-[10px] font-black text-white/40 hover:text-white hover:bg-white/10 transition-all active:translate-y-1 active:border-b-0 uppercase tracking-tighter"
                        >
                            OTP
                        </button>

                        <div
                            ref={fadeRef}
                            className="relative bg-white/5 border border-white/10 border-b-4 border-black/40 rounded-xl px-5 h-12 flex items-center gap-3 text-xs font-black uppercase tracking-widest text-white/40 cursor-pointer hover:bg-white/10 transition-all select-none active:translate-y-1 active:border-b-0"
                            onClick={() => setIsFadeDropdownOpen(!isFadeDropdownOpen)}
                        >
                            <div className="flex items-center gap-2 text-white/60">
                                <span>Fade</span>
                                <span className="w-4 text-center text-blue-400 font-black">{fadeValue}</span>
                                <ChevronDown className={`w-4 h-4 transition-transform duration-300 ${isFadeDropdownOpen ? 'rotate-180' : ''}`} />
                            </div>

                            {/* Fade Dropdown Menu */}
                            {isFadeDropdownOpen && (
                                <div className="absolute bottom-full left-0 mb-4 w-full min-w-[120px] bg-[#0a0a0c]/95 border border-white/10 rounded-xl shadow-[0_10px_40px_rgba(0,0,0,0.8)] backdrop-blur-xl overflow-hidden animate-in slide-in-from-bottom-2 duration-200 z-[110]">
                                    <div className="flex flex-col">
                                        {[0, 1, 2, 3, 4, 5].map((val) => (
                                            <button
                                                key={val}
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    setFadeValue(val);
                                                    setIsFadeDropdownOpen(false);
                                                }}
                                                className={`w-full h-12 flex items-center justify-between px-6 transition-all border-b border-white/5 last:border-0 ${fadeValue === val
                                                    ? 'bg-blue-600 text-white'
                                                    : 'hover:bg-white/5 text-white/40 hover:text-white'
                                                    }`}
                                            >
                                                <span className="font-black text-sm">{val}</span>
                                                {fadeValue === val && <Check className="w-4 h-4" />}
                                            </button>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="w-px h-8 bg-white/10" />

                    {/* SECTION 3: NAVIGATION & SEARCH */}
                    <div className={`flex-1 flex justify-end ${isSearchActive ? 'gap-2' : 'gap-4'}`}>
                        <button className={`flex items-center gap-2 h-12 bg-white/5 border border-white/10 border-b-4 border-black/40 rounded-xl text-sm font-black uppercase tracking-widest text-white/40 hover:text-white whitespace-nowrap transition-all hover:bg-white/10 active:translate-y-1 active:border-b-0 ${isSearchActive ? 'px-4' : 'px-8'}`}>
                            <Search className="w-4 h-4" /> Filter
                        </button>

                        {!isSearchActive ? (
                            <button
                                onClick={() => {
                                    setSearchQuery('');
                                    setIsSearchModalOpen(true);
                                }}
                                className="flex items-center gap-2 px-8 h-12 bg-blue-600/10 border border-blue-500/30 border-b-4 border-blue-900/60 rounded-xl text-sm font-black uppercase tracking-widest text-blue-400 hover:text-white hover:bg-blue-600/20 whitespace-nowrap transition-all active:translate-y-1 active:border-b-0"
                            >
                                <Search className="w-4 h-4" /> Cerca
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={findNext}
                                    className="flex items-center gap-2 px-4 h-12 bg-blue-600 border border-blue-400/50 border-b-4 border-blue-900/60 rounded-xl text-sm font-black uppercase tracking-widest text-white whitespace-nowrap shadow-[0_0_15px_rgba(59,130,246,0.3)] transition-all active:translate-y-1 active:border-b-0 group"
                                >
                                    <SkipForward className="w-4 h-4 group-active:translate-x-1 transition-transform" />
                                    Succ
                                </button>
                                <button
                                    onClick={clearSearch}
                                    className="flex items-center gap-2 px-4 h-12 bg-[#1a1a1c] border border-white/10 border-b-4 border-black/40 rounded-xl text-sm font-black uppercase tracking-widest text-red-500/60 hover:text-red-500 whitespace-nowrap transition-all active:translate-y-1 active:border-b-0"
                                >
                                    <X className="w-4 h-4" /> Fine
                                </button>
                            </>
                        )}
                    </div>
                </div>

                {/* Search Modal - PREMIUM DESIGN */}
                {isSearchModalOpen && (
                    <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-md animate-in fade-in duration-300">
                        <div className="w-full max-w-4xl bg-[#0a0a0c]/90 border border-white/10 rounded-[3rem] p-10 shadow-[0_0_100px_rgba(0,0,0,0.8)] flex flex-col gap-10 backdrop-blur-xl animate-in zoom-in duration-500">

                            {/* Modal Header */}
                            <div className="flex items-center justify-between px-2">
                                <div className="space-y-1">
                                    <h2 className="text-4xl font-black uppercase tracking-tighter text-white flex items-center gap-3">
                                        <Search className="w-8 h-8 text-blue-500" />
                                        Cerca
                                    </h2>
                                    <p className="text-xs font-bold text-white/20 uppercase tracking-[0.3em] ml-11">Brano o Posizione</p>
                                </div>
                                <button
                                    onClick={() => setIsSearchModalOpen(false)}
                                    className="w-14 h-14 flex items-center justify-center bg-white/5 hover:bg-white/10 border border-white/10 border-b-4 border-black/40 rounded-full transition-all active:translate-y-1 active:border-b-0"
                                >
                                    <X className="w-7 h-7 text-white/40" />
                                </button>
                            </div>

                            {/* Search Input - ELEGANT GLASS */}
                            <div className="relative group">
                                <div className="absolute -inset-1 bg-gradient-to-r from-blue-600/20 to-transparent rounded-3xl blur opacity-0 group-focus-within:opacity-100 transition-opacity duration-500" />
                                <input
                                    type="text"
                                    value={searchQuery}
                                    readOnly
                                    placeholder="Scrivi qui..."
                                    className="relative w-full h-24 bg-black/40 border border-white/10 rounded-[1.5rem] px-10 text-4xl font-black text-white placeholder:text-white/5 outline-none focus:border-blue-500/50 transition-all tracking-tight"
                                />
                                {searchQuery && (
                                    <button
                                        onClick={() => setSearchQuery('')}
                                        className="absolute right-8 top-1/2 -translate-y-1/2 w-12 h-12 flex items-center justify-center bg-white/5 hover:bg-white/10 rounded-full text-white/20 hover:text-red-400 transition-all"
                                    >
                                        <Delete className="w-6 h-6" />
                                    </button>
                                )}
                            </div>

                            {/* Virtual Keyboard - SHADOW KEYBOARD DESIGN */}
                            <div className="flex flex-col gap-4">
                                {(() => {
                                    const rows = keyboardLayout === 'alpha'
                                        ? [
                                            ['1', '2', '3', '4', '5', '6', '7', '8', '9', '0'],
                                            ['Q', 'W', 'E', 'R', 'T', 'Y', 'U', 'I', 'O', 'P'],
                                            ['A', 'S', 'D', 'F', 'G', 'H', 'J', 'K', 'L'],
                                            ['Z', 'X', 'C', 'V', 'B', 'N', 'M', '.', ',', '-']
                                        ]
                                        : [
                                            ['!', '@', '#', '$', '%', '^', '&', '*', '(', ')'],
                                            ['_', '+', '=', '{', '}', '[', ']', ':', ';', '|'],
                                            ['<', '>', '?', '/', '\\', '`', '~', '\'', '"', '°'],
                                            ['¿', '¡', '«', '»', '—', '·', '…', '§', '¶', '©']
                                        ];

                                    return (
                                        <>
                                            {rows.map((row, ridx) => (
                                                <div key={ridx} className="flex justify-center gap-3">
                                                    {row.map(key => (
                                                        <button
                                                            key={key}
                                                            onClick={() => setSearchQuery(prev => prev + key)}
                                                            className="flex-1 h-16 bg-white/5 hover:bg-white/10 border-t border-white/10 border-b-4 border-black/40 rounded-2xl text-2xl font-bold transition-all active:translate-y-1 active:border-b-0 shadow-2xl relative overflow-hidden group"
                                                        >
                                                            <span className="relative z-10 text-white">{key}</span>
                                                        </button>
                                                    ))}
                                                </div>
                                            ))}
                                            <div className="flex justify-center gap-3 mt-2">
                                                <button
                                                    onClick={() => setKeyboardLayout(keyboardLayout === 'alpha' ? 'symbols' : 'alpha')}
                                                    className="w-28 h-20 bg-blue-600/10 hover:bg-blue-600/20 border-t border-blue-500/20 border-b-4 border-blue-900/60 rounded-2xl text-lg font-black tracking-widest transition-all active:translate-y-1 active:border-b-0 shadow-2xl text-blue-400"
                                                >
                                                    {keyboardLayout === 'alpha' ? '?123' : 'ABC'}
                                                </button>
                                                <button
                                                    onClick={() => setSearchQuery(prev => prev + ' ')}
                                                    className="flex-[4] h-20 bg-white/5 hover:bg-white/10 border-t border-white/10 border-b-4 border-black/40 rounded-2xl text-sm font-black tracking-[0.5em] transition-all active:translate-y-1 active:border-b-0 shadow-2xl text-white/30 uppercase"
                                                >
                                                    SPAZIO
                                                </button>
                                                <button
                                                    onClick={() => setSearchQuery(prev => prev.slice(0, -1))}
                                                    className="w-28 h-20 bg-red-900/10 hover:bg-red-900/20 border-t border-red-500/10 border-b-4 border-red-900/60 rounded-2xl flex items-center justify-center transition-all active:translate-y-1 active:border-b-0 shadow-2xl text-red-500/60"
                                                >
                                                    <Delete className="w-7 h-7" />
                                                </button>
                                                <button
                                                    onClick={() => handleSearch(searchQuery)}
                                                    className="flex-[1.5] h-20 bg-blue-600 hover:bg-blue-500 border-t border-blue-400/50 border-b-4 border-blue-900/60 rounded-2xl flex items-center justify-center gap-3 text-2xl font-black transition-all active:translate-y-1 active:border-b-0 shadow-[0_10px_30px_rgba(37,99,235,0.4)] text-white"
                                                >
                                                    VAI <CornerDownLeft className="w-6 h-6" />
                                                </button>
                                            </div>
                                        </>
                                    );
                                })()}
                            </div>
                        </div>
                    </div>
                )}

                {/* OTP Dashboard Overlay - ANIMATED TRANSITION */}
                <AnimatePresence>
                    {isOTPDashboardOpen && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                            animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                            exit={{ opacity: 0, scale: 0.98, filter: "blur(10px)" }}
                            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
                            className="fixed inset-0 z-[200] bg-[#050505] flex flex-col p-8 md:p-12 overflow-hidden text-white"
                        >
                            {/* Background Decorative Glows */}
                            <div className="absolute top-1/4 -left-20 w-80 h-80 bg-blue-600/10 blur-[120px] rounded-full pointer-events-none" />
                            <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-blue-900/10 blur-[120px] rounded-full pointer-events-none" />

                            {/* Top Bar: Navigation & Title Section */}
                            <div className="flex items-center justify-between mb-8 relative z-10 shrink-0">
                                <div className="space-y-1">
                                    <h2 className="text-xl font-black text-white/30 uppercase tracking-[0.4em]">One Touch Player</h2>
                                    <div className="h-1 w-24 bg-blue-600/50 rounded-full" />
                                </div>

                                <button
                                    onClick={() => setIsOTPDashboardOpen(false)}
                                    className="w-16 h-16 flex items-center justify-center bg-white/5 border border-white/10 border-b-4 border-black/60 rounded-2xl active:translate-y-1 active:border-b-0 transition-all shadow-2xl group"
                                >
                                    <Undo2 className="w-8 h-8 text-white/40 group-hover:text-blue-400 transition-colors" />
                                </button>
                            </div>

                            {/* Main Interaction Area */}
                            <div className="flex-1 flex gap-10 items-stretch min-h-0 relative z-10 pb-4">

                                {/* LEFT SIDE: Refined Playback Controls */}
                                <div className="flex-[1.5] flex flex-col gap-6">
                                    <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-[3rem] p-10 backdrop-blur-3xl shadow-2xl flex flex-col items-center justify-center relative overflow-hidden">
                                        {/* Center Glow Effect */}
                                        {playerStatus?.state === 'playing' && (
                                            <div className="absolute inset-0 bg-blue-600/10 animate-pulse transition-opacity" />
                                        )}

                                        <div className="relative z-20 flex flex-col items-center gap-10">
                                            {/* Large Primary Toggle Area */}
                                            <div className="flex items-center gap-8">
                                                {playerStatus?.state === 'playing' ? (
                                                    <button
                                                        onClick={() => pauseMutation.mutate()}
                                                        className="w-40 h-40 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.5)] border-t border-blue-400/50 border-b-8 border-blue-900 active:translate-y-2 active:border-b-0 transition-all ring-8 ring-blue-500/10"
                                                    >
                                                        <Pause className="w-20 h-20 text-white fill-current" />
                                                    </button>
                                                ) : (
                                                    <button
                                                        onClick={() => playMutation.mutate()}
                                                        className="w-40 h-40 rounded-full bg-blue-600 flex items-center justify-center shadow-[0_0_80px_rgba(37,99,235,0.5)] border-t border-blue-400/50 border-b-8 border-blue-900 active:translate-y-2 active:border-b-0 transition-all ring-8 ring-blue-500/10"
                                                    >
                                                        <Play className="w-20 h-20 text-white fill-current ml-3" />
                                                    </button>
                                                )}

                                                <button
                                                    onClick={() => stopMutation.mutate()}
                                                    className="w-32 h-32 rounded-[2.5rem] bg-red-600/10 border border-red-500/20 border-b-8 border-red-900 active:translate-y-2 active:border-b-0 flex items-center justify-center text-red-500 hover:bg-red-600 hover:text-white transition-all group shadow-xl"
                                                >
                                                    <Square className="w-12 h-12 fill-current group-hover:scale-110 transition-transform" />
                                                </button>
                                            </div>

                                            {/* Status Bar */}
                                            <div className={`px-10 py-3 rounded-full text-[10px] font-black uppercase tracking-[0.5em] border ${playerStatus?.state === 'playing' ? 'bg-green-600/10 text-green-400 border-green-500/30' : playerStatus?.state === 'paused' ? 'bg-amber-600/10 text-amber-400 border-amber-500/30' : 'bg-red-600/10 text-red-500 border-red-500/30'}`}>
                                                Stato Player: {playerStatus?.state === 'playing' ? 'IN RIPRODUZIONE' : playerStatus?.state === 'paused' ? 'IN PAUSA' : 'FERMO'}
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* RIGHT SIDE: EXACT DASHBOARD FADERS (REPLICATED STYLE) */}
                                <div className="flex-1 bg-white/[0.02] border border-white/10 rounded-[3rem] px-8 py-8 backdrop-blur-3xl shadow-2xl flex justify-around gap-12">
                                    {volumeControls.map((ctrl) => {
                                        const val = pendingVolumes[ctrl.id] ?? controlValues[ctrl.id]?.volume ?? 0;
                                        const isMuted = controlValues[ctrl.id]?.mute;
                                        const min = ctrl.min || -96;
                                        const max = ctrl.max || 12;
                                        const range = max - min;
                                        const percent = ((val - min) / range) * 100;

                                        return (
                                            <div key={`otp-fader-${ctrl.id}`} className="flex flex-col items-center gap-1 h-full">
                                                {/* Plus Button */}
                                                <button
                                                    onClick={() => handleStepVolume(ctrl, 'up')}
                                                    className="w-12 h-12 flex items-center justify-center bg-[#1a1a1c] hover:bg-[#252528] border border-white/10 border-b-4 border-black rounded-xl transition-all active:translate-y-1 active:border-b-0 shadow-lg shrink-0 text-blue-400"
                                                >
                                                    <Plus className="w-5 h-5" />
                                                </button>

                                                {/* Fader Track */}
                                                <div className="flex-1 relative w-12 flex flex-col items-center group py-0">
                                                    {/* Track Slot */}
                                                    <div className="absolute inset-y-0 w-2.5 bg-black/80 rounded-full border border-white/10 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] overflow-hidden">
                                                        <div
                                                            className="absolute bottom-0 w-full bg-gradient-to-t from-blue-600 to-blue-400 opacity-20 blur-[1px]"
                                                            style={{ height: `${percent}%` }}
                                                        />
                                                    </div>

                                                    {/* Fader Cap */}
                                                    <div
                                                        className="absolute w-12 h-18 z-20 pointer-events-none"
                                                        style={{ bottom: `calc(${percent}% - 36px)` }}
                                                    >
                                                        <div className="w-full h-full bg-gradient-to-b from-[#444] via-[#1a1a1c] to-[#010101] border border-white/20 shadow-[0_10px_20px_rgba(0,0,0,0.8),inset_0_1px_1px_rgba(255,255,255,0.2)] rounded flex flex-col items-center justify-center">
                                                            <div className="w-full h-1 bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,1)] mb-1" />
                                                            <div className="flex flex-col gap-0.5 opacity-20 mb-1">
                                                                <div className="w-4 h-px bg-white" />
                                                                <div className="w-4 h-px bg-white" />
                                                                <div className="w-4 h-px bg-white" />
                                                            </div>
                                                            <div className="font-mono text-[10px] font-bold text-blue-400">
                                                                {Math.round(val)}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Interaction Layer (Vertical Range Input) */}
                                                    <input
                                                        type="range"
                                                        min={min}
                                                        max={max}
                                                        step={ctrl.step || 0.1}
                                                        value={val}
                                                        onChange={(e) => handleSliderChange(ctrl, e)}
                                                        onMouseUp={(e) => handleSliderRelease(ctrl, parseFloat((e.target as HTMLInputElement).value))}
                                                        onTouchEnd={(e) => handleSliderRelease(ctrl, parseFloat((e.target as HTMLInputElement).value))}
                                                        className="absolute inset-x-0 -inset-y-0 opacity-0 cursor-pointer h-full w-[150%] -left-[25%] z-30"
                                                        style={{
                                                            appearance: 'slider-vertical' as any,
                                                            WebkitAppearance: 'slider-vertical' as any,
                                                            width: '48px',
                                                        }}
                                                    />
                                                </div>

                                                {/* Minus Button */}
                                                <button
                                                    onClick={() => handleStepVolume(ctrl, 'down')}
                                                    className="w-12 h-12 flex items-center justify-center bg-[#1a1a1c] hover:bg-[#252528] border border-white/10 border-b-4 border-black rounded-xl transition-all active:translate-y-1 active:border-b-0 shadow-lg shrink-0 text-blue-400"
                                                >
                                                    <Minus className="w-5 h-5" />
                                                </button>

                                                {/* Mute Button */}
                                                <button
                                                    onClick={() => {
                                                        const muteId = ctrl.second_id || ctrl.id;
                                                        setControlMutation.mutate({ id: muteId, value: !isMuted });
                                                        setControlValues(prev => ({
                                                            ...prev,
                                                            [ctrl.id]: { ...prev[ctrl.id], mute: !isMuted }
                                                        }));
                                                    }}
                                                    className={`w-12 h-10 rounded-xl flex items-center justify-center transition-all border shrink-0 border-b-4 active:translate-y-1 active:border-b-0 ${isMuted
                                                        ? 'bg-red-600 border-red-400 border-b-red-800 text-white shadow-[0_0_20px_rgba(220,38,38,0.4)]'
                                                        : 'bg-[#1a1a1c] border-white/10 border-b-black text-blue-400 hover:border-blue-500 shadow-lg'
                                                        }`}
                                                >
                                                    <VolumeX className="w-6 h-6" />
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>

                            {/* Footer Content: Unified Title & Timer */}
                            <div className="mt-8 flex items-center justify-between gap-12 bg-white/[0.02] border border-white/10 rounded-[2.5rem] p-8 backdrop-blur-3xl shadow-2xl relative z-10 shrink-0">

                                {/* RPT SONG (ICON ONLY) */}
                                <div className="pr-10 border-r border-white/10">
                                    <button
                                        onClick={() => {
                                            const isSong = playerStatus?.repeat_mode === 'song';
                                            repeatMutation.mutate(isSong ? 'off' : 'one');
                                        }}
                                        className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all border-b-4 active:translate-y-1 active:border-b-0 ${playerStatus?.repeat_mode === 'song'
                                            ? 'bg-blue-600 border-blue-900 text-white shadow-xl shadow-blue-500/20'
                                            : 'bg-white/5 border-black text-white/40'
                                            }`}
                                    >
                                        <Repeat1 className="w-7 h-7" />
                                    </button>
                                </div>

                                {/* Full Single-Row Title Display */}
                                <div className="flex-1 min-w-0">
                                    <h1 className="text-4xl font-black text-white tracking-tighter uppercase whitespace-nowrap overflow-hidden text-ellipsis w-full">
                                        {playerStatus?.song_title || 'No Media Selected'}
                                    </h1>
                                </div>

                                {/* Precise Timer - Elegant & Smaller */}
                                <div className="pl-8 text-right border-l border-white/5">
                                    <div className="font-mono text-3xl font-medium text-blue-400 tabular-nums tracking-widest opacity-80">
                                        {formatTime(playerStatus?.current_time)}
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
                {/* END of OTP Dashboard Overlay */}
            </div>
        );
    }

    // ============================================
    // RENDER STANDARD VIEW
    // ============================================
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;
    const paginatedSongs = songs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(songs.length / pageSize);

    return (
        <div className="space-y-6 max-w-7xl mx-auto p-4 md:p-8">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-white tracking-tight">Players</h1>
                    <p className="text-gray-500 dark:text-gray-400">Control audio/video playback and sources</p>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Source Selection */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Source</h3>
                    <div className="grid gap-3">
                        {sources.map((source: Source) => (
                            <button
                                key={source.id}
                                onClick={() => {
                                    setSelectedSource(source.id);
                                    selectSourceMutation.mutate(source.id);
                                }}
                                disabled={selectSourceMutation.isPending}
                                className={`w-full px-6 py-5 rounded-2xl text-left transition-all relative overflow-hidden group ${selectedSource === source.id
                                    ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                                    : 'bg-white dark:bg-dark-surface text-gray-700 dark:text-gray-300 border border-gray-100 dark:border-gray-800 hover:border-blue-400 dark:hover:border-blue-600'
                                    } disabled:opacity-50 font-bold flex items-center justify-between`}
                            >
                                <div className="flex items-center space-x-4">
                                    <div className={`p-2 rounded-lg ${selectedSource === source.id ? 'bg-white/20' : 'bg-gray-100 dark:bg-gray-800'}`}>
                                        <Music className="w-5 h-5" />
                                    </div>
                                    <span className="text-lg">{source.name}</span>
                                </div>
                                {selectedSource === source.id ? (
                                    <Check className="w-5 h-5 animate-in zoom-in duration-300" />
                                ) : (
                                    <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                                )}
                            </button>
                        ))}
                    </div>
                </div>

                {/* Player Status & Info */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Playback</h3>
                    <div className="bg-white dark:bg-dark-surface rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm relative overflow-hidden">
                        {/* Status Backdrop Glow */}
                        <div className={`absolute -top-24 -right-24 w-48 h-48 blur-[80px] rounded-full opacity-20 transition-colors duration-1000 ${playerStatus?.state === 'playing' ? 'bg-green-500' : 'bg-blue-500'}`} />

                        <div className="relative z-10 space-y-8">
                            <div className="flex items-center justify-between">
                                <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-[0.2em] border ${playerStatus?.state === 'playing' ? 'bg-green-500/10 text-green-500 border-green-500/20' : 'bg-gray-500/10 text-gray-500 border-gray-500/20'}`}>
                                    {playerStatus?.state || 'Idle'}
                                </div>
                                <div className="text-right">
                                    <p className="font-mono text-3xl font-black text-gray-900 dark:text-white tabular-nums">
                                        {formatTime(playerStatus?.current_time)}
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Now Playing</p>
                                <p className="text-2xl font-black text-gray-900 dark:text-white leading-tight min-h-[4rem]">
                                    {playerStatus?.song_title || 'Ready to play'}
                                </p>
                            </div>

                            <div className="space-y-3">
                                <div className="h-2 bg-gray-100 dark:bg-gray-800/50 rounded-full overflow-hidden">
                                    <div
                                        className="h-full bg-blue-600 transition-all duration-700 ease-out shadow-[0_0_15px_rgba(37,99,235,0.4)]"
                                        style={{ width: `${((playerStatus?.current_time || 0) / (playerStatus?.total_time || 1)) * 100}%` }}
                                    />
                                </div>
                                <div className="flex justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-1">
                                    <span>{formatTime(playerStatus?.current_time)}</span>
                                    <span>{formatTime(playerStatus?.total_time)}</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Main Controls Panel */}
                <div className="space-y-4">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Controls</h3>
                    <div className="bg-white dark:bg-dark-surface rounded-[2rem] p-8 border border-gray-100 dark:border-gray-800 shadow-sm space-y-8">
                        <div className="flex items-center justify-center gap-4">
                            <button onClick={() => previousMutation.mutate()} className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all active:scale-95 border border-transparent">
                                <SkipBack className="w-8 h-8" />
                            </button>

                            {playerStatus?.state === 'playing' ? (
                                <button onClick={() => pauseMutation.mutate()} className="w-24 h-24 rounded-[2rem] bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all active:scale-90 ring-4 ring-blue-500/10">
                                    <Pause className="w-10 h-10 fill-current" />
                                </button>
                            ) : (
                                <button onClick={() => playMutation.mutate()} className="w-24 h-24 rounded-[2rem] bg-blue-600 text-white flex items-center justify-center shadow-2xl shadow-blue-500/40 hover:bg-blue-700 transition-all active:scale-90 ring-4 ring-blue-500/10">
                                    <Play className="w-10 h-10 fill-current ml-1" />
                                </button>
                            )}

                            <button onClick={() => nextMutation.mutate()} className="p-5 rounded-2xl bg-gray-50 dark:bg-gray-800/50 text-gray-600 dark:text-gray-300 hover:bg-blue-50 dark:hover:bg-blue-900/20 hover:text-blue-600 transition-all active:scale-95 border border-transparent">
                                <SkipForward className="w-8 h-8" />
                            </button>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button onClick={() => stopMutation.mutate()} className="group flex items-center justify-center gap-3 py-4 rounded-xl font-black uppercase tracking-widest text-xs border-2 border-red-500/10 text-red-500 hover:bg-red-500 hover:text-white transition-all active:scale-98">
                                <Square className="w-4 h-4 fill-current group-hover:scale-110" /> Stop
                            </button>
                            <button
                                onClick={() => {
                                    const modes = ['off', 'one', 'all'];
                                    const current = playerStatus?.repeat_mode === 'song' ? 'one' : playerStatus?.repeat_mode === 'group' ? 'all' : 'off';
                                    const next = modes[(modes.indexOf(current) + 1) % modes.length];
                                    repeatMutation.mutate(next);
                                }}
                                className={`flex items-center justify-center gap-3 py-4 rounded-xl font-black uppercase tracking-widest text-xs border-2 transition-all active:scale-98 ${playerStatus?.repeat_mode !== 'none'
                                    ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-500/20'
                                    : 'border-blue-500/10 text-blue-500 hover:bg-blue-50 dark:hover:bg-blue-900/20'
                                    }`}
                            >
                                <Repeat className="w-4 h-4" />
                                {playerStatus?.repeat_mode === 'song' ? 'One' : playerStatus?.repeat_mode === 'group' ? 'All' : 'Off'}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Song Library */}
            <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-gray-400 uppercase tracking-widest ml-1">Media Library</h3>
                    {songs.length > 0 && (
                        <span className="text-[10px] font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full uppercase tracking-tighter">
                            {songs.length} Tracks available
                        </span>
                    )}
                </div>

                <div className="bg-white dark:bg-dark-surface rounded-[2.5rem] p-6 border border-gray-100 dark:border-gray-800 shadow-sm">
                    {songs.length === 0 ? (
                        <div className="text-center py-24 flex flex-col items-center justify-center">
                            <div className="w-20 h-20 rounded-full bg-gray-50 dark:bg-gray-800 flex items-center justify-center mb-6">
                                <Music className="w-10 h-10 text-gray-300 dark:text-gray-600" />
                            </div>
                            <h4 className="text-xl font-bold text-gray-900 dark:text-white">Empty Archive</h4>
                            <p className="text-gray-500 dark:text-gray-400 mt-2">Select a different source or upload media to begin.</p>
                        </div>
                    ) : (
                        <div className="grid gap-2">
                            {paginatedSongs.map((song: Song, index) => {
                                const isCurrent = playerStatus?.song_title === song.name;
                                return (
                                    <button
                                        key={song.id}
                                        onClick={() => selectSongMutation.mutate(song.id)}
                                        className={`w-full group px-6 py-5 text-left transition-all flex items-center justify-between rounded-2xl ${isCurrent
                                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-500/20'
                                            : 'hover:bg-blue-50 dark:hover:bg-blue-900/10 text-gray-700 dark:text-gray-300'
                                            }`}
                                    >
                                        <div className="flex items-center space-x-6 flex-1 min-w-0">
                                            <span className={`font-mono text-sm font-bold w-6 transition-colors ${isCurrent ? 'text-blue-200' : 'text-gray-400'}`}>
                                                {((currentPage - 1) * pageSize + index + 1).toString().padStart(2, '0')}
                                            </span>
                                            <div className="flex-1 min-w-0 pr-8">
                                                <span className="truncate text-lg font-bold block tracking-tight uppercase">{song.name}</span>
                                                <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${isCurrent ? 'text-blue-100/60' : 'text-gray-400/80 group-hover:text-blue-400'}`}>
                                                    Audio Track • PCM 44.1kHz
                                                </span>
                                            </div>
                                        </div>
                                        {isCurrent && (
                                            <div className="flex items-center space-x-2 animate-in slide-in-from-right-4 duration-500">
                                                <div className="flex items-end gap-1 h-4 px-2">
                                                    <div className="w-1 bg-white animate-pulse" style={{ height: '60%' }} />
                                                    <div className="w-1 bg-white animate-pulse delay-75" style={{ height: '100%' }} />
                                                    <div className="w-1 bg-white animate-pulse delay-150" style={{ height: '40%' }} />
                                                </div>
                                                <Check className="w-6 h-6" />
                                            </div>
                                        )}
                                    </button>
                                );
                            })}
                        </div>
                    )}

                    {totalPages > 1 && (
                        <div className="flex items-center justify-between pt-8 mt-4 border-t border-gray-50 dark:border-gray-800">
                            <div className="flex items-center gap-3">
                                <button
                                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    Previous
                                </button>
                                <button
                                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="px-6 py-3 rounded-xl bg-gray-100 dark:bg-gray-800/50 text-gray-600 dark:text-gray-400 font-bold uppercase tracking-widest text-[10px] hover:bg-blue-600 hover:text-white transition-all disabled:opacity-30 disabled:pointer-events-none"
                                >
                                    Next
                                </button>
                            </div>
                            <div className="flex flex-col items-end">
                                <span className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Page Information</span>
                                <span className="text-xl font-black text-gray-900 dark:text-white mt-1">
                                    {currentPage} <span className="text-gray-300 dark:text-gray-700 mx-2">/</span> {totalPages}
                                </span>
                            </div>
                        </div>
                    )}
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
            `}</style>
        </div>
    );
};