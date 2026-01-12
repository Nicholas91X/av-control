import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Circle, Square, Video, Clock, AlertCircle } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

interface RecorderStatus {
    state: 'recording' | 'stopped' | 'nomedia';
    current_time?: number;
    filename?: string;
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
            return api.post('/device/recorder/start');
        },
        onSuccess: async () => {
            // Refetch esplicito per aggiornare subito lo stato
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

    // Handle WebSocket updates
    React.useEffect(() => {
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            refetchStatus();
        }
    }, [lastMessage, refetchStatus]);

    const isRecording = recorderStatus?.state === 'recording';
    const isNoMedia = recorderStatus?.state === 'nomedia';

    const formatTime = (seconds?: number) => {
        if (!seconds) return '00:00';
        const m = Math.floor(seconds / 60);
        const s = seconds % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Recorders</h1>
                <p className="text-gray-500 dark:text-gray-400">Control video/audio recording</p>
            </div>

            {/* FIX #3: Alert per stato nomedia */}
            {isNoMedia && (
                <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-4 rounded-md">
                    <div className="flex items-start">
                        <AlertCircle className="w-5 h-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                        <div>
                            <h3 className="text-sm font-semibold text-yellow-800 dark:text-yellow-200">
                                No Media Source Selected
                            </h3>
                            <p className="text-sm text-yellow-700 dark:text-yellow-300 mt-1">
                                Il recorder è nello stato "nomedia". Potrebbe essere necessario selezionare una sorgente
                                nella sezione Players o configurare l'input di registrazione prima di avviare una registrazione.
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Recorder Status */}
                <Card title="Recorder Status" subtitle="Current recording state">
                    <div className="space-y-4">
                        <div>
                            <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">State</p>
                            <div className="flex items-center space-x-3">
                                <span
                                    className={`w-4 h-4 rounded-full ${isRecording
                                        ? 'bg-red-500 animate-pulse'
                                        : isNoMedia
                                            ? 'bg-yellow-500'
                                            : 'bg-gray-400'
                                        }`}
                                />
                                <span
                                    className={`text-xl font-bold ${isRecording
                                        ? 'text-red-600 dark:text-red-400'
                                        : isNoMedia
                                            ? 'text-yellow-600 dark:text-yellow-400'
                                            : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                >
                                    {isRecording ? 'RECORDING' : isNoMedia ? 'NO MEDIA' : 'Stopped'}
                                </span>
                            </div>
                        </div>

                        {recorderStatus?.filename && recorderStatus.filename !== '' && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Current File</p>
                                <div className="flex items-center space-x-2">
                                    <Video className="w-4 h-4 text-gray-400" />
                                    <p className="text-gray-900 dark:text-white font-mono text-sm">
                                        {recorderStatus.filename}
                                    </p>
                                </div>
                            </div>
                        )}

                        {isRecording && recorderStatus?.current_time !== undefined && (
                            <div>
                                <p className="text-sm text-gray-500 dark:text-gray-400 mb-1">Duration</p>
                                <div className="flex items-center space-x-2">
                                    <Clock className="w-4 h-4 text-gray-400" />
                                    <p className="text-gray-900 dark:text-white font-mono text-lg font-semibold">
                                        {formatTime(recorderStatus.current_time)}
                                    </p>
                                </div>
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
                                <li>• Le registrazioni vengono salvate nella directory configurata</li>
                                <li>• Il nome del file viene generato automaticamente se non specificato</li>
                                <li>• Verificare di aver selezionato una sorgente valida nella sezione Players</li>
                                <li>• Lo stato "nomedia" indica che non c'è una sorgente attiva per la registrazione</li>
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