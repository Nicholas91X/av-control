import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Settings, CheckCircle, Loader2 } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

interface Preset {
    id: string;
    name: string;
}

interface CurrentPreset {
    id: string;
}

export const Presets: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();

    // Fetch all presets
    const { data: presetsData, isLoading: isLoadingPresets } = useQuery<{ presets: Preset[] }>({
        queryKey: ['presets'],
        queryFn: async () => {
            const response = await api.get('/device/presets');
            return response.data;
        },
    });
    const presets = presetsData?.presets || [];

    // Fetch current preset
    const { data: currentPresetData } = useQuery<CurrentPreset>({
        queryKey: ['presets', 'current'],
        queryFn: async () => {
            const response = await api.get('/device/presets/current');
            return response.data;
        },
        refetchInterval: 5000, // Poll every 5 seconds
    });
    const currentPresetId = currentPresetData?.id;

    // Load preset mutation
    const loadPresetMutation = useMutation({
        mutationFn: async (presetId: string) => {
            await api.post('/device/presets/load', { id: presetId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['presets', 'current'] });
            queryClient.invalidateQueries({ queryKey: ['controls'] });
            queryClient.invalidateQueries({ queryKey: ['player'] });
        },
    });

    // Handle WebSocket updates
    React.useEffect(() => {
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            queryClient.invalidateQueries({ queryKey: ['presets', 'current'] });
        }
    }, [lastMessage, queryClient]);

    const handleLoadPreset = (presetId: string) => {
        loadPresetMutation.mutate(presetId);
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Presets</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Load audio configuration presets for different scenarios
                </p>
            </div>

            {isLoadingPresets ? (
                <Card>
                    <div className="text-center py-12">
                        <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-primary-500 mx-auto"></div>
                        <p className="text-gray-500 dark:text-gray-400 mt-4">Loading presets...</p>
                    </div>
                </Card>
            ) : presets.length === 0 ? (
                <Card>
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Settings className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No presets available</p>
                        <p className="text-sm mt-1">Audio presets will appear here when configured</p>
                    </div>
                </Card>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {presets.map((preset) => {
                        const isActive = currentPresetId === preset.id;
                        const isLoading = loadPresetMutation.isPending && loadPresetMutation.variables === preset.id;

                        return (
                            <Card key={preset.id} className="hover:shadow-lg transition-shadow">
                                <div className="p-6">
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex-1">
                                            <div className="flex items-center space-x-2 mb-1">
                                                {isActive && (
                                                    <CheckCircle className="w-5 h-5 text-green-500" />
                                                )}
                                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                                    {preset.name}
                                                </h3>
                                            </div>
                                            <p className="text-sm text-gray-500 dark:text-gray-400">
                                                {preset.id}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-3">
                                        {isActive ? (
                                            <div className="px-4 py-2 bg-green-50 dark:bg-green-900/20 border-2 border-green-500 rounded-lg text-center">
                                                <p className="text-green-700 dark:text-green-400 font-semibold">
                                                    Currently Active
                                                </p>
                                            </div>
                                        ) : (
                                            <Button
                                                variant="primary"
                                                fullWidth
                                                onClick={() => handleLoadPreset(preset.id)}
                                                disabled={isLoading || loadPresetMutation.isPending}
                                                isLoading={isLoading}
                                            >
                                                {isLoading ? (
                                                    <>
                                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                                        Loading...
                                                    </>
                                                ) : (
                                                    <>
                                                        <Settings className="w-4 h-4 mr-2" />
                                                        Load Preset
                                                    </>
                                                )}
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};