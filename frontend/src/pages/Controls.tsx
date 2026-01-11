import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Sliders, Volume2, VolumeX, Sun, Mic } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

interface Control {
    id: number;
    name: string;
    type: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    second_id?: number;
}

interface ControlValue {
    id: number;
    volume?: number;
    mute?: boolean;
}

export const Controls: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const [pendingValues, setPendingValues] = useState<Record<number, number>>({});
    const [controlValues, setControlValues] = useState<Record<number, ControlValue>>({});

    // Fetch all controls
    const { data: controlsData = { controls: [] } } = useQuery<{ controls: Control[] }>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data;
        },
    });
    const controls = controlsData.controls || [];

    // Fetch individual control values
    React.useEffect(() => {
        const fetchControlValues = async () => {
            const values: Record<number, ControlValue> = {};

            for (const control of controls) {
                try {
                    const response = await api.get(`/device/controls/${control.id}`);
                    values[control.id] = response.data;

                    // Fetch mute value if second_id exists
                    if (control.second_id) {
                        const muteResponse = await api.get(`/device/controls/${control.second_id}`);
                        values[control.id] = {
                            ...values[control.id],
                            mute: muteResponse.data.mute,
                        };
                    }
                } catch (error) {
                    console.error(`Failed to fetch control ${control.id}:`, error);
                }
            }

            setControlValues(values);
        };

        if (controls.length > 0) {
            fetchControlValues();
        }
    }, [controls]);

    // Set control value mutation
    const setControlMutation = useMutation({
        mutationFn: async ({ id, value }: { id: number; value: number | boolean }) => {
            await api.post(`/device/controls/${id}`, { value });
        },
        onMutate: async ({ id, value }) => {
            await queryClient.cancelQueries({ queryKey: ['controls'] });
            const previousValues = { ...controlValues };

            setControlValues((prev) => {
                const next = { ...prev };

                // Se è un volume ID principale
                if (next[id]) {
                    if (typeof value === 'number') {
                        next[id] = { ...next[id], volume: value };
                    } else {
                        next[id] = { ...next[id], mute: value };
                    }
                } else {
                    // Se è un second_id, trova il control che lo possiede
                    const ownerControl = controls.find(c => c.second_id === id);
                    if (ownerControl && next[ownerControl.id]) {
                        next[ownerControl.id] = {
                            ...next[ownerControl.id],
                            mute: value as boolean
                        };
                    }
                }
                return next;
            });

            return { previousValues };
        },
        onError: (_err, _variables, context) => {
            if (context?.previousValues) {
                setControlValues(context.previousValues);
            }
        },
        onSettled: (_data, _error, variables) => {
            // Refetch the specific control value and its parent/child if necessary
            const control = controls.find(c => c.id === variables.id || c.second_id === variables.id);
            if (control) {
                api.get(`/device/controls/${control.id}`).then((response) => {
                    setControlValues((prev) => ({
                        ...prev,
                        [control.id]: {
                            ...prev[control.id],
                            ...response.data
                        },
                    }));
                });
                if (control.second_id) {
                    api.get(`/device/controls/${control.second_id}`).then((response) => {
                        setControlValues((prev) => ({
                            ...prev,
                            [control.id]: {
                                ...prev[control.id],
                                mute: response.data.mute
                            },
                        }));
                    });
                }
            }

            // Remove from pending
            setPendingValues((prev) => {
                const newPending = { ...prev };
                delete newPending[variables.id];
                return newPending;
            });
        },
    });

    // Handle WebSocket updates
    React.useEffect(() => {
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            queryClient.invalidateQueries({ queryKey: ['controls'] });
        }
    }, [lastMessage, queryClient]);

    const handleVolumeChange = (controlId: number, value: number) => {
        setPendingValues((prev) => ({ ...prev, [controlId]: value }));
    };

    const handleVolumeRelease = (controlId: number, value: number) => {
        setControlMutation.mutate({ id: controlId, value });
    };

    const handleMuteToggle = (control: Control) => {
        const muteId = control.second_id || control.id;
        const currentMute = controlValues[control.id]?.mute ?? false;
        setControlMutation.mutate({ id: muteId, value: !currentMute });
    };

    const getControlIcon = (control: Control) => {
        if (control.name.toLowerCase().includes('volume') || control.name.toLowerCase().includes('mic')) {
            return controlValues[control.id]?.mute ? VolumeX : Volume2;
        }
        if (control.name.toLowerCase().includes('brightness')) return Sun;
        if (control.name.toLowerCase().includes('mic')) return Mic;
        return Sliders;
    };

    const renderControl = (control: Control) => {
        const Icon = getControlIcon(control);
        const currentValue = controlValues[control.id];
        const volumeValue = control.id in pendingValues
            ? pendingValues[control.id]
            : currentValue?.volume ?? 0;
        const isMuted = currentValue?.mute || false;

        // Handle volume_mute type
        if (control.type === 'volume_mute') {
            return (
                <Card key={control.id} className="p-6">
                    <div className="flex items-start space-x-4">
                        <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                            <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                        </div>
                        <div className="flex-1">
                            <div className="flex items-center justify-between mb-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {control.name}
                                </h3>
                                <button
                                    onClick={() => handleMuteToggle(control)}
                                    disabled={setControlMutation.isPending}
                                    className={`p-2 rounded-lg transition-colors ${isMuted
                                        ? 'bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400'
                                        : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                                        } hover:bg-opacity-80 disabled:opacity-50`}
                                    title={isMuted ? 'Unmute' : 'Mute'}
                                >
                                    {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                                </button>
                            </div>
                            <div className="flex items-center space-x-4 mt-4">
                                <input
                                    type="range"
                                    min={control.min || -96}
                                    max={control.max || 12}
                                    step={control.step || 0.1}
                                    value={volumeValue}
                                    onChange={(e) =>
                                        handleVolumeChange(control.id, Number(e.target.value))
                                    }
                                    onMouseUp={(e) =>
                                        handleVolumeRelease(
                                            control.id,
                                            Number((e.target as HTMLInputElement).value)
                                        )
                                    }
                                    onTouchEnd={(e) =>
                                        handleVolumeRelease(
                                            control.id,
                                            Number((e.target as HTMLInputElement).value)
                                        )
                                    }
                                    className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                                    disabled={setControlMutation.isPending || isMuted}
                                />
                                <div className="w-24 text-right">
                                    <span className="text-xl font-bold text-gray-900 dark:text-white">
                                        {volumeValue.toFixed(1)}
                                    </span>
                                    <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                        dB
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                </Card>
            );
        }

        // Fallback for other types (if any)
        return (
            <Card key={control.id} className="p-6">
                <div className="flex items-center space-x-4">
                    <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                        <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                    <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {control.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                            Type: {control.type}
                        </p>
                    </div>
                </div>
            </Card>
        );
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Device Controls</h1>
                <p className="text-gray-500 dark:text-gray-400">
                    Adjust system settings and device parameters
                </p>
            </div>

            {controls.length > 0 ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {controls.map((control) => renderControl(control))}
                </div>
            ) : (
                <Card>
                    <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                        <Sliders className="w-12 h-12 mx-auto mb-3 opacity-50" />
                        <p className="text-lg font-medium">No controls available</p>
                        <p className="text-sm mt-1">Device controls will appear here when configured</p>
                    </div>
                </Card>
            )}
        </div>
    );
};