import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Play, Pause, Square, SkipForward, SkipBack, Repeat, Music } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

interface Source {
    id: string;
    name: string;
}

interface Song {
    id: string;
    title: string;
    artist?: string;
    duration?: string;
}

interface PlayerStatus {
    state: 'playing' | 'paused' | 'stopped';
    current_source?: string;
    current_song?: string;
    repeat_mode: 'off' | 'one' | 'all';
}

export const Players: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const [selectedSource, setSelectedSource] = useState<string>('');

    // Fetch sources
    const { data: sources = [] } = useQuery<Source[]>({
        queryKey: ['player', 'sources'],
        queryFn: async () => {
            const response = await api.get('/device/player/sources');
            return response.data;
        },
    });

    // Fetch songs (only when source is selected)
    const { data: songs = [] } = useQuery<Song[]>({
        queryKey: ['player', 'songs', selectedSource],
        queryFn: async () => {
            const response = await api.get('/device/player/songs');
            return response.data;
        },
        enabled: !!selectedSource,
    });

    // Fetch player status
    const { data: playerStatus, refetch: refetchStatus } = useQuery<PlayerStatus>({
        queryKey: ['player', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/player/status');
            return response.data;
        },
        refetchInterval: 3000, // Poll every 3 seconds
    });

    // Mutations
    const selectSourceMutation = useMutation({
        mutationFn: async (sourceId: string) => {
            await api.post('/device/player/source', { source_id: sourceId });
        },
        onSuccess: (_, sourceId) => {
            setSelectedSource(sourceId);
            queryClient.invalidateQueries({ queryKey: ['player', 'songs'] });
            queryClient.invalidateQueries({ queryKey: ['player', 'status'] });
        },
    });

    const selectSongMutation = useMutation({
        mutationFn: async (songId: string) => {
            await api.post('/device/player/song', { song_id: songId });
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
        mutationFn: async (mode: string) => api.post('/device/player/repeat', { mode }),
        onSuccess: () => refetchStatus(),
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
                        {sources.map((source) => (
                            <button
                                key={source.id}
                                onClick={() => selectSourceMutation.mutate(source.id)}
                                disabled={selectSourceMutation.isPending}
                                className={`w-full px-4 py-3 rounded-lg text-left transition-all ${
                                    selectedSource === source.id || playerStatus?.current_source === source.id
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
                                    className={`w-3 h-3 rounded-full ${
                                        playerStatus?.state === 'playing'
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
                                {playerStatus?.current_song || 'No song selected'}
                            </p>
                        </div>

                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Repeat Mode</p>
                            <p className="text-gray-900 dark:text-white font-medium capitalize">
                                {playerStatus?.repeat_mode || 'Off'}
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
                                const modes = ['off', 'one', 'all'];
                                const currentIndex = modes.indexOf(playerStatus?.repeat_mode || 'off');
                                const nextMode = modes[(currentIndex + 1) % modes.length];
                                repeatMutation.mutate(nextMode);
                            }}
                            disabled={repeatMutation.isPending}
                            className="relative"
                        >
                            <Repeat className="w-5 h-5 mr-2" />
                            Repeat: {playerStatus?.repeat_mode || 'Off'}
                            {getRepeatIcon() && (
                                <span className="ml-2 text-xs font-bold">{getRepeatIcon()}</span>
                            )}
                        </Button>
                    </div>
                </Card>
            </div>

            {/* Song List */}
            {selectedSource && (
                <Card title="Songs" subtitle="Select a song to play">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                        {songs.map((song) => (
                            <button
                                key={song.id}
                                onClick={() => selectSongMutation.mutate(song.id)}
                                disabled={selectSongMutation.isPending}
                                className={`px-4 py-3 rounded-lg text-left transition-all ${
                                    playerStatus?.current_song === song.id
                                        ? 'bg-primary-50 dark:bg-primary-900/20 text-primary-700 dark:text-primary-400 border-2 border-primary-500'
                                        : 'bg-gray-50 dark:bg-gray-800 text-gray-700 dark:text-gray-300 border-2 border-transparent hover:border-gray-300 dark:hover:border-gray-600'
                                } disabled:opacity-50`}
                            >
                                <p className="font-medium truncate">{song.title}</p>
                                {song.artist && (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 truncate">
                                        {song.artist}
                                    </p>
                                )}
                                {song.duration && (
                                    <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                                        {song.duration}
                                    </p>
                                )}
                            </button>
                        ))}
                    </div>
                </Card>
            )}
        </div>
    );
};
