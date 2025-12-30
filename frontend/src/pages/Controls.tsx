import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Sliders, Volume2, Sun, Mic } from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';

interface Control {
    id: string;
    name: string;
    type: 'slider' | 'toggle' | 'button';
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    current_value?: number | boolean;
}

export const Controls: React.FC = () => {
    const queryClient = useQueryClient();
    const { lastMessage } = useWebSocket();
    const [pendingValues, setPendingValues] = useState<Record<string, number>>({});

    // Fetch all controls
    const { data: controls = [] } = useQuery<Control[]>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data?.controls || [];
        },
    });

    // Set control value mutation
    const setControlMutation = useMutation({
        mutationFn: async ({ id, value }: { id: string; value: number | boolean }) => {
            await api.post(`/device/controls/${id}`, { value });
        },
        onSuccess: (_, variables) => {
            queryClient.invalidateQueries({ queryKey: ['controls'] });
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

    const handleSliderChange = (controlId: string, value: number) => {
        setPendingValues((prev) => ({ ...prev, [controlId]: value }));
    };

    const handleSliderRelease = (controlId: string, value: number) => {
        setControlMutation.mutate({ id: controlId, value });
    };

    const handleToggle = (controlId: string, currentValue: boolean) => {
        setControlMutation.mutate({ id: controlId, value: !currentValue });
    };

    const handleButton = (controlId: string) => {
        setControlMutation.mutate({ id: controlId, value: true });
    };

    const getControlIcon = (control: Control) => {
        if (control.name.toLowerCase().includes('volume')) return Volume2;
        if (control.name.toLowerCase().includes('brightness')) return Sun;
        if (control.name.toLowerCase().includes('mic')) return Mic;
        return Sliders;
    };

    const renderControl = (control: Control) => {
        const Icon = getControlIcon(control);
        const currentValue =
            control.id in pendingValues
                ? pendingValues[control.id]
                : (control.current_value as number);

        switch (control.type) {
            case 'slider':
                return (
                    <Card key={control.id} className="p-6">
                        <div className="flex items-start space-x-4">
                            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                                    {control.name}
                                </h3>
                                <div className="flex items-center space-x-4 mt-4">
                                    <input
                                        type="range"
                                        min={control.min || 0}
                                        max={control.max || 100}
                                        step={control.step || 1}
                                        value={currentValue}
                                        onChange={(e) =>
                                            handleSliderChange(control.id, Number(e.target.value))
                                        }
                                        onMouseUp={(e) =>
                                            handleSliderRelease(
                                                control.id,
                                                Number((e.target as HTMLInputElement).value)
                                            )
                                        }
                                        onTouchEnd={(e) =>
                                            handleSliderRelease(
                                                control.id,
                                                Number((e.target as HTMLInputElement).value)
                                            )
                                        }
                                        className="flex-1 h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer dark:bg-gray-700 accent-primary-600"
                                        disabled={setControlMutation.isPending}
                                    />
                                    <div className="w-20 text-right">
                                        <span className="text-xl font-bold text-gray-900 dark:text-white">
                                            {currentValue}
                                        </span>
                                        {control.unit && (
                                            <span className="text-sm text-gray-500 dark:text-gray-400 ml-1">
                                                {control.unit}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    </Card>
                );

            case 'toggle':
                const isOn = control.current_value as boolean;
                return (
                    <Card key={control.id} className="p-6">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                    <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                                </div>
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                                    {control.name}
                                </h3>
                            </div>
                            <button
                                onClick={() => handleToggle(control.id, isOn)}
                                disabled={setControlMutation.isPending}
                                className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${isOn
                                        ? 'bg-primary-600'
                                        : 'bg-gray-200 dark:bg-gray-700'
                                    } disabled:opacity-50`}
                            >
                                <span
                                    className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${isOn ? 'translate-x-7' : 'translate-x-1'
                                        }`}
                                />
                            </button>
                        </div>
                    </Card>
                );

            case 'button':
                return (
                    <Card key={control.id} className="p-6">
                        <div className="flex items-center space-x-4">
                            <div className="p-3 bg-primary-50 dark:bg-primary-900/20 rounded-lg">
                                <Icon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                            </div>
                            <div className="flex-1">
                                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                                    {control.name}
                                </h3>
                                <Button
                                    variant="primary"
                                    onClick={() => handleButton(control.id)}
                                    disabled={setControlMutation.isPending}
                                    isLoading={setControlMutation.isPending}
                                >
                                    Execute
                                </Button>
                            </div>
                        </div>
                    </Card>
                );

            default:
                return null;
        }
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
