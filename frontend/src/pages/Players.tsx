import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Play, Pause, Square, SkipForward, SkipBack, Repeat, Music, ChevronLeft, ChevronRight } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

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
    repeat_mode: 'off' | 'one' | 'all' | 'none';
}

export const Players: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const [currentPage, setCurrentPage] = useState(1);
    const pageSize = 10;

    // Fetch sources
    const { data: sourcesData } = useQuery<{ sources: Source[] }>({
        queryKey: ['player', 'sources'],
        queryFn: async () => {
            const response = await api.get('/device/player/sources');
            return response.data;
        },
    });
    const sources = sourcesData?.sources || [];

    // Fetch songs
    const { data: songsData } = useQuery<{ songs: Song[] }>({
        queryKey: ['player', 'songs'],
        queryFn: async () => {
            const response = await api.get('/device/player/songs');
            return response.data;
        },
        enabled: true,
    });
    const songs = songsData?.songs || [];

    // Fetch player status
    const { data: playerStatus, refetch: refetchStatus } = useQuery<PlayerStatus>({
        queryKey: ['player', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/player/status');
            return response.data;
        },
        refetchInterval: 1000, // Poll every 1 second
    });

    // Mutations
    const selectSourceMutation = useMutation({
        mutationFn: async (sourceId: number) => {
            await api.post('/device/player/source', { id: sourceId });
        },
        onSuccess: () => {
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
        onSuccess: () => refetchStatus(),
    });

    const pauseMutation = useMutation({
        mutationFn: async () => api.post('/device/player/pause'),
        onSuccess: () => refetchStatus(),
    });

    const stopMutation = useMutation({
        mutationFn: async () => api.post('/device/player/stop'),
        onSuccess: () => refetchStatus(),
    });

    const nextMutation = useMutation({
        mutationFn: async () => api.post('/device/player/next'),
        onSuccess: () => refetchStatus(),
    });

    const previousMutation = useMutation({
        mutationFn: async () => api.post('/device/player/previous'),
        onSuccess: () => refetchStatus(),
    });

    const repeatMutation = useMutation({
        mutationFn: async (mode: string) => {
            const modeMap: Record<string, string> = {
                'off': 'none',
                'one': 'song',
                'all': 'list'
            };
            const apiMode = modeMap[mode] || 'none';
            return api.post('/device/player/repeat', { mode: apiMode });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        },
    });

    // Handle WebSocket updates
    React.useEffect(() => {
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            refetchStatus();
        }
    }, [lastMessage, refetchStatus]);

    const getRepeatIcon = () => {
        if (playerStatus?.repeat_mode === 'one') return '1';
        if (playerStatus?.repeat_mode === 'all') return '∞';
        return '';
    };

    const formatTime = (seconds?: number) => {
        if (!seconds) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    const paginatedSongs = songs.slice((currentPage - 1) * pageSize, currentPage * pageSize);
    const totalPages = Math.ceil(songs.length / pageSize);

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Players</h1>
                <p className="text-gray-500 dark:text-gray-400">Control audio/video playback</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Source Selection */}
                <Card title="Source" subtitle="Select audio/video source">
                    <div className="space-y-2">
                        {sources.map((source: Source) => (
                            <button
                                key={source.id}
                                onClick={() => selectSourceMutation.mutate(source.id)}
                                disabled={selectSourceMutation.isPending}
                                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${parseInt(playerStatus?.current_source || '-1') === source.id
                                    ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-2 border-primary-500'
                                    : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                    } disabled:opacity-50`}
                            >
                                <div className="flex items-center space-x-3">
                                    <Music className="w-5 h-5" />
                                    <span className="font-medium">{source.name}</span>
                                </div>
                            </button>
                        ))}
                    </div>
                </Card>

                {/* Player Status */}
                <Card title="Player Status" subtitle="Current playback state">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">State</p>
                            <div className="flex items-center space-x-2">
                                <span
                                    className={`w-3 h-3 rounded-full ${playerStatus?.state === 'playing'
                                        ? 'bg-green-500 animate-pulse'
                                        : playerStatus?.state === 'paused'
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-400'
                                        }`}
                                />
                                <span className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                                    {playerStatus?.state || 'Unknown'}
                                </span>
                            </div>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current Song</p>
                            <p className="text-gray-900 dark:text-white font-medium">
                                {playerStatus?.song_title || 'No song selected'}
                            </p>
                        </div>

                        {playerStatus?.total_time && playerStatus.total_time > 0 && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Time</p>
                                <p className="text-gray-900 dark:text-white font-mono">
                                    {formatTime(playerStatus.current_time)} / {formatTime(playerStatus.total_time)}
                                </p>
                            </div>
                        )}

                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Repeat Mode</p>
                            <p className="text-gray-900 dark:text-white font-medium capitalize">
                                {playerStatus?.repeat_mode === 'none' ? 'Off' : playerStatus?.repeat_mode || 'Off'}
                            </p>
                        </div>
                    </div>
                </Card>

                {/* Playback Controls */}
                <Card title="Controls" subtitle="Playback actions">
                    <div className="space-y-4">
                        {/* Main Controls */}
                        <div className="flex justify-center space-x-2">
                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => previousMutation.mutate()}
                                disabled={previousMutation.isPending}
                                className="p-3"
                            >
                                <SkipBack className="w-5 h-5" />
                            </Button>

                            {playerStatus?.state === 'playing' ? (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={() => pauseMutation.mutate()}
                                    disabled={pauseMutation.isPending}
                                    className="p-3"
                                >
                                    <Pause className="w-5 h-5" />
                                </Button>
                            ) : (
                                <Button
                                    variant="primary"
                                    size="lg"
                                    onClick={() => playMutation.mutate()}
                                    disabled={playMutation.isPending}
                                    className="p-3"
                                >
                                    <Play className="w-5 h-5" />
                                </Button>
                            )}

                            <Button
                                variant="danger"
                                size="lg"
                                onClick={() => stopMutation.mutate()}
                                disabled={stopMutation.isPending}
                                className="p-3"
                            >
                                <Square className="w-5 h-5" />
                            </Button>

                            <Button
                                variant="secondary"
                                size="lg"
                                onClick={() => nextMutation.mutate()}
                                disabled={nextMutation.isPending}
                                className="p-3"
                            >
                                <SkipForward className="w-5 h-5" />
                            </Button>
                        </div>

                        {/* Repeat Toggle */}
                        <Button
                            variant="secondary"
                            fullWidth
                            onClick={() => {
                                const daemonToFrontend: Record<string, string> = {
                                    'none': 'off',
                                    'song': 'one',
                                    'list': 'all'
                                };

                                const modes = ['off', 'one', 'all'];
                                const currentMode = daemonToFrontend[playerStatus?.repeat_mode || 'none'] || 'off';
                                const currentIndex = modes.indexOf(currentMode);
                                const nextMode = modes[(currentIndex + 1) % modes.length];
                                repeatMutation.mutate(nextMode);
                            }}
                            disabled={repeatMutation.isPending}
                            className="relative"
                        >
                            <Repeat className="w-5 h-5 mr-2" />
                            Repeat: {playerStatus?.repeat_mode === 'none' ? 'Off' : playerStatus?.repeat_mode || 'Off'}
                            {getRepeatIcon() && (
                                <span className="ml-2 text-xs font-bold">{getRepeatIcon()}</span>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Song List */}
            <Card title="Songs" subtitle="Select a song to play">
                <>
                    {songs.length === 0 ? (
                        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            <Music className="w-12 h-12 mx-auto mb-3 opacity-50" />
                            <p>No songs available</p>
                            <p className="text-sm mt-1">Select a source to load songs</p>
                        </div>
                    ) : (
                        <>
                            <div className="space-y-1">
                                {paginatedSongs.map((song: Song) => (
                                    <button
                                        key={song.id}
                                        onClick={() => selectSongMutation.mutate(song.id)}
                                        disabled={selectSongMutation.isPending}
                                        className={`w-full px-4 py-2 text-left transition-all flex items-center justify-between group rounded-md ${playerStatus?.song_title === song.name
                                            ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 font-medium'
                                            : 'hover:bg-gray-50 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                                            } disabled:opacity-50`}
                                    >
                                        <div className="flex-1 min-w-0 pr-4">
                                            <span className="truncate block">{song.name}</span>
                                        </div>
                                    </button>
                                ))}
                            </div>

                            {/* Pagination Controls */}
                            {totalPages > 1 && (
                                <div className="flex items-center justify-between pt-4 mt-2 border-t border-gray-100 dark:border-gray-700">
                                    <span className="text-sm text-gray-500 dark:text-gray-400">
                                        Page {currentPage} of {totalPages}
                                    </span>
                                    <div className="flex space-x-2">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                                            disabled={currentPage === 1}
                                        >
                                            <ChevronLeft className="w-4 h-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                                            disabled={currentPage === totalPages}
                                        >
                                            <ChevronRight className="w-4 h-4" />
                                        </Button>
                                    </div>
                                </div>
                            )}
                        </>
                    )}
                </>
            </Card>
        </div>
    );
};