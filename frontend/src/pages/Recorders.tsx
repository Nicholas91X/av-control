import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Circle, Square, Video, Clock } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

interface RecorderStatus {
    state: 'recording' | 'stopped';
    current_file?: string;
    duration?: string;
    start_time?: string;
}

export const Recorders: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();

    // Fetch recorder status
    const { data: recorderStatus, refetch: refetchStatus } = useQuery<RecorderStatus>({
        queryKey: ['recorder', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/recorder/status');
            return response.data;
        },
        refetchInterval: 2000, // Poll every 2 seconds when recording
    });

    // Mutations
    const startRecordingMutation = useMutation({
        mutationFn: async () => {
            return api.post('/device/recorder/start', {});
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recorder', 'status'] });
        },
    });

    const stopRecordingMutation = useMutation({
        mutationFn: async () => api.post('/device/recorder/stop'),
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['recorder', 'status'] });
        },
    });

    // Handle WebSocket updates
    React.useEffect(() => {
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            refetchStatus();
        }
    }, [lastMessage, refetchStatus]);

    const isRecording = recorderStatus?.state === 'recording';

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recorders</h1>
                <p className="text-gray-500 dark:text-gray-400">Control video/audio recording</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recorder Status */}
                <Card title="Recorder Status" subtitle="Current recording state">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">State</p>
                            <div className="flex items-center space-x-3">
                                <span
                                    className={`w-4 h-4 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-gray-400'
                                        }`}
                                />
                                <span
                                    className={`text-xl font-bold ${isRecording
                                        ? 'text-red-600 dark:text-red-400'
                                        : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {isRecording ? 'RECORDING' : 'Stopped'}
                                </span>
                            </div>
                        </div>

                        {recorderStatus?.current_file && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current File</p>
                                <div className="flex items-center space-x-2">
                                    <Video className="w-4 h-4 text-gray-400" />
                                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                                        {recorderStatus.current_file}
                                    </p>
                                </div>
                            </div>
                        )}

                        {recorderStatus?.duration && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                                <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <p className="text-gray-900 dark:text-white font-mono text-lg font-semibold">
                                        {recorderStatus.duration}
                                    </p>
                                </div>
                            </div>
                        )}

                        {recorderStatus?.start_time && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Started At</p>
                                <p className="text-gray-900 dark:text-white text-sm">
                                    {new Date(recorderStatus.start_time).toLocaleString()}
                                </p>
                            </div>
                        )}
                    </div>
                </Card>

                {/* Recording Controls */}
                <Card title="Controls" subtitle="Start or stop recording">
                    <div className="space-y-4">
                        {isRecording ? (
                            <div className="space-y-4">
                                <div className="bg-red-50 dark:bg-red-900/20 border-2 border-red-500 rounded-lg p-4">
                                    <p className="text-red-700 dark:text-red-400 font-semibold text-center">
                                        Recording in progress...
                                    </p>
                                </div>

                                <Button
                                    variant="danger"
                                    size="lg"
                                    fullWidth
                                    onClick={() => stopRecordingMutation.mutate()}
                                    disabled={stopRecordingMutation.isPending}
                                    className="py-6"
                                >
                                    <Square className="w-6 h-6 mr-3" />
                                    <span className="text-lg font-semibold">Stop Recording</span>
                                </Button>
                            </div>
                        ) : (
                            <Button
                                variant="primary"
                                size="lg"
                                fullWidth
                                onClick={() => startRecordingMutation.mutate()}
                                disabled={startRecordingMutation.isPending}
                                className="py-6 bg-red-600 hover:bg-red-700"
                            >
                                <Circle className="w-6 h-6 mr-3 fill-current" />
                                <span className="text-lg font-semibold">Start Recording</span>
                            </Button>
                        )}

                        <div className="mt-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg">
                            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">
                                Recording Info
                            </h3>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                                <li>• Recordings are saved to the configured output directory</li>
                                <li>• File format: MP4 (H.264 video, AAC audio)</li>
                                <li>• Auto-stop on system shutdown or error</li>
                            </ul>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recording History (Placeholder) */}
            <Card title="Recent Recordings" subtitle="Last 5 recordings">
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <Video className="w-12 h-12 mx-auto mb-3 opacity-50" />
                    <p>Recording history feature coming soon</p>
                </div>
            </Card>
        </div>
    );
};
