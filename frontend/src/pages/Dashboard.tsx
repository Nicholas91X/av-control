import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import {
    Activity,
    Music,
    Settings,
    Sliders,
    Play,
    Pause,
    CheckCircle,
    XCircle,
    Clock
} from 'lucide-react';

interface SystemStatus {
    connected: boolean;
    preset: {
        id: string;
    };
    player: {
        state: string;
        song_title?: string;
        repeat_mode: string;
    };
    recorder: {
        state: string;
    };
}

export const Dashboard: React.FC = () => {
    // Fetch system status
    const { data: systemStatus } = useQuery<SystemStatus>({
        queryKey: ['system', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/status');
            return response.data;
        },
        refetchInterval: 2000, // Poll every 2 seconds
    });

    // Fetch presets count
    const { data: presetsData } = useQuery<{ presets: any[] }>({
        queryKey: ['presets'],
        queryFn: async () => {
            const response = await api.get('/device/presets');
            return response.data;
        },
    });

    // Fetch controls count
    const { data: controlsData } = useQuery<{ controls: any[] }>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data;
        },
    });

    const isConnected = systemStatus?.connected ?? false;
    const presetsCount = presetsData?.presets?.length ?? 0;
    const controlsCount = controlsData?.controls?.length ?? 0;
    const playerState = systemStatus?.player?.state ?? 'unknown';
    const currentSong = systemStatus?.player?.song_title ?? 'No song';
    const currentPreset = systemStatus?.preset?.id ?? 'None';
    const recorderState = systemStatus?.recorder?.state ?? 'stopped';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                <p className="text-gray-500 dark:text-gray-400">System overview and quick actions</p>
            </div>

            {/* Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                {/* Hardware Connection */}
                <Card title="Hardware Status">
                    <div className="flex items-center space-x-3">
                        {isConnected ? (
                            <>
                                <CheckCircle className="w-5 h-5 text-green-500" />
                                <span className="text-gray-900 dark:text-white font-medium">Connected</span>
                            </>
                        ) : (
                            <>
                                <XCircle className="w-5 h-5 text-red-500" />
                                <span className="text-gray-900 dark:text-white font-medium">Disconnected</span>
                            </>
                        )}
                    </div>
                </Card>

                {/* Presets Count */}
                <Card title="Available Presets">
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{presetsCount}</p>
                        <Settings className="w-8 h-8 text-primary-500 opacity-50" />
                    </div>
                </Card>

                {/* Controls Count */}
                <Card title="Audio Controls">
                    <div className="flex items-center justify-between">
                        <p className="text-3xl font-bold text-gray-900 dark:text-white">{controlsCount}</p>
                        <Sliders className="w-8 h-8 text-primary-500 opacity-50" />
                    </div>
                </Card>
            </div>

            {/* Current Status */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Player Status */}
                <Card title="Player Status">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">State</span>
                            <div className="flex items-center space-x-2">
                                {playerState === 'playing' ? (
                                    <Play className="w-4 h-4 text-green-500 fill-current" />
                                ) : playerState === 'paused' ? (
                                    <Pause className="w-4 h-4 text-yellow-500" />
                                ) : (
                                    <Activity className="w-4 h-4 text-gray-400" />
                                )}
                                <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                    {playerState}
                                </span>
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Current Song</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white truncate max-w-[200px]">
                                {currentSong}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Repeat Mode</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                {systemStatus?.player?.repeat_mode === 'none' ? 'Off' : systemStatus?.player?.repeat_mode}
                            </span>
                        </div>
                    </div>
                </Card>

                {/* Active Configuration */}
                <Card title="Active Configuration">
                    <div className="space-y-3">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Current Preset</span>
                            <span className="text-sm font-medium text-gray-900 dark:text-white">
                                {currentPreset}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Recorder</span>
                            <div className="flex items-center space-x-2">
                                {recorderState === 'recording' ? (
                                    <>
                                        <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
                                        <span className="text-sm font-medium text-red-600 dark:text-red-400">
                                            Recording
                                        </span>
                                    </>
                                ) : (
                                    <span className="text-sm font-medium text-gray-900 dark:text-white capitalize">
                                        {recorderState}
                                    </span>
                                )}
                            </div>
                        </div>
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-gray-500 dark:text-gray-400">Last Update</span>
                            <div className="flex items-center space-x-1 text-sm text-gray-900 dark:text-white">
                                <Clock className="w-3 h-3" />
                                <span>{new Date().toLocaleTimeString()}</span>
                            </div>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Quick Actions */}
            <Card title="Quick Actions">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    <Link to="/presets">
                        <Button variant="secondary" fullWidth className="h-20">
                            <div className="flex flex-col items-center space-y-2">
                                <Settings className="w-6 h-6" />
                                <span className="text-sm font-medium">Presets</span>
                            </div>
                        </Button>
                    </Link>

                    <Link to="/players">
                        <Button variant="secondary" fullWidth className="h-20">
                            <div className="flex flex-col items-center space-y-2">
                                <Music className="w-6 h-6" />
                                <span className="text-sm font-medium">Player</span>
                            </div>
                        </Button>
                    </Link>

                    <Link to="/controls">
                        <Button variant="secondary" fullWidth className="h-20">
                            <div className="flex flex-col items-center space-y-2">
                                <Sliders className="w-6 h-6" />
                                <span className="text-sm font-medium">Controls</span>
                            </div>
                        </Button>
                    </Link>

                    <Link to="/recorders">
                        <Button variant="secondary" fullWidth className="h-20">
                            <div className="flex flex-col items-center space-y-2">
                                <Activity className="w-6 h-6" />
                                <span className="text-sm font-medium">Recorder</span>
                            </div>
                        </Button>
                    </Link>
                </div>
            </Card>

            {/* Connection Warning */}
            {!isConnected && (
                <Card className="border-2 border-yellow-500 bg-yellow-50 dark:bg-yellow-900/20">
                    <div className="flex items-start space-x-3">
                        <XCircle className="w-6 h-6 text-yellow-600 dark:text-yellow-400 flex-shrink-0 mt-0.5" />
                        <div>
                            <h3 className="font-semibold text-yellow-800 dark:text-yellow-300">
                                Hardware Disconnected
                            </h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-400 mt-1">
                                The system is not connected to the audio hardware.
                                Check the network connection between boards.
                            </p>
                        </div>
                    </div>
                </Card>
            )}
        </div>
    );
};