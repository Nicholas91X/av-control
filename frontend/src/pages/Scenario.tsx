import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { Check, User, Music, Save, Loader2 } from 'lucide-react';

interface Preset {
    id: string;
    name: string;
}

interface SelectionItem {
    id: string;
    label: string;
}

export const Scenario: React.FC = () => {
    const queryClient = useQueryClient();
    const { user } = useAuth();
    const { lastMessage, setLastMessage } = useWebSocket();

    // Placeholder for Celebrants
    const celebrants: SelectionItem[] = [
        { id: 'don-a', label: 'Don A' },
        { id: 'don-b', label: 'Don B' },
        { id: 'don-c', label: 'Don C' },
    ];
    const [selectedCelebrant, setSelectedCelebrant] = useState<string>('don-a');

    // Placeholder for Extra Memory List
    const memoryList: SelectionItem[] = [
        { id: 'mem-01', label: 'extra memory 01' },
        { id: 'mem-02', label: 'extra memory 02' },
        { id: 'mem-03', label: 'extra memory 03' },
        { id: 'mem-04', label: 'extra memory 04' },
    ];
    const [selectedMemory, setSelectedMemory] = useState<string>('');

    // Fetch real Presets (Celebrations)
    const { data: presetsData, isLoading: isLoadingPresets } = useQuery<{ presets: Preset[] }>({
        queryKey: ['presets'],
        queryFn: async () => {
            const response = await api.get('/device/presets');
            return response.data;
        },
    });
    const presets = presetsData?.presets || [];

    // Fetch current active preset
    const { data: currentPresetData } = useQuery<{ id: string }>({
        queryKey: ['presets', 'current'],
        queryFn: async () => {
            const response = await api.get('/device/presets/current');
            return response.data;
        },
    });
    const activePresetId = currentPresetData?.id;

    const loadPresetMutation = useMutation({
        mutationFn: async (presetId: string) => {
            const preset = presets.find(p => p.id === presetId);
            await api.post('/device/presets/load', { id: presetId });

            // Trigger local notification
            setLastMessage({
                type: 'command_executed',
                timestamp: new Date().toISOString(),
                data: {
                    user_id: user?.id || 'local-id',
                    username: user?.username || 'User',
                    command: `Loaded Celebration: ${preset?.name || presetId}`
                }
            });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['presets', 'current'] });
        },
    });

    const handleCelebrantClick = (c: SelectionItem) => {
        setSelectedCelebrant(c.id);
        setLastMessage({
            type: 'command_executed',
            timestamp: new Date().toISOString(),
            data: {
                user_id: user?.id || 'local-id',
                username: user?.username || 'User',
                command: `Selected Celebrant: ${c.label}`
            }
        });
    };

    const handleMemoryClick = (m: SelectionItem) => {
        setSelectedMemory(prev => prev === m.id ? '' : m.id);
        setLastMessage({
            type: 'command_executed',
            timestamp: new Date().toISOString(),
            data: {
                user_id: user?.id || 'local-id',
                username: user?.username || 'User',
                command: selectedMemory === m.id ? `Deselected Memory: ${m.label}` : `Selected Memory: ${m.label}`
            }
        });
    };

    // Handle WebSocket updates
    useEffect(() => {
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            queryClient.invalidateQueries({ queryKey: ['presets', 'current'] });
        }
    }, [lastMessage, queryClient]);

    const ScenarioButton: React.FC<{
        label: string;
        isActive: boolean;
        onClick: () => void;
        isLoading?: boolean;
        icon?: React.ReactNode;
        isNarrow?: boolean;
    }> = ({ label, isActive, onClick, isLoading, icon, isNarrow }) => (
        <button
            onClick={onClick}
            disabled={isLoading}
            className={`
                relative group flex items-center justify-between p-4 md:p-5 rounded-2xl transition-all duration-300
                border-2 ${isActive
                    ? 'bg-green-500/10 border-green-500/50 shadow-[0_0_15px_rgba(34,197,94,0.1)] scale-[1.01]'
                    : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/10 active:scale-95'}
                ${isNarrow ? 'w-full' : 'flex-1'}
            `}
        >
            <div className="flex items-center space-x-4">
                {icon && <div className={`${isActive ? 'text-green-400' : 'text-white/30'}`}>{icon}</div>}
                <span className={`text-xl md:text-2xl font-bold tracking-wide uppercase ${isActive ? 'text-green-400' : 'text-white/80'}`}>
                    {label}
                </span>
            </div>
            {isLoading ? (
                <Loader2 size={24} className="animate-spin text-green-400" />
            ) : isActive ? (
                <Check size={28} className="text-green-400" />
            ) : null}

            {/* Subtle inner glow for active state */}
            {isActive && (
                <div className="absolute inset-0 rounded-2xl bg-gradient-to-tr from-green-500/5 to-transparent pointer-events-none" />
            )}
        </button>
    );

    return (
        <div className="fixed inset-0 bg-black text-white p-6 md:p-12 font-sans overflow-hidden flex flex-col">
            {/* Background Light Effect */}
            <div className="absolute top-0 left-1/4 w-[600px] h-[600px] bg-blue-500/5 blur-[120px] rounded-full pointer-events-none" />
            <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-green-500/5 blur-[120px] rounded-full pointer-events-none" />

            {/* Header */}
            <div className="flex items-center justify-center mb-12 z-10 relative">
                <h1 className="text-5xl font-black tracking-tight text-white/90 drop-shadow-lg">
                    SCENARIO
                </h1>
            </div>

            {/* Main Content: Split Columns */}
            <div className="flex-1 flex flex-col gap-8 md:gap-12 overflow-y-auto pr-2 custom-scrollbar pb-12">

                {/* Top Row: Celebrant & Celebration */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">

                    {/* Celebrant Column */}
                    <div className="flex flex-col space-y-6">
                        <div className="flex items-center space-x-3 px-2">
                            <span className="text-sm font-bold tracking-widest text-white/30 uppercase">Celebrant:</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="flex flex-col space-y-4 px-2">
                            {celebrants.map(c => (
                                <ScenarioButton
                                    key={c.id}
                                    label={c.label}
                                    isActive={selectedCelebrant === c.id}
                                    onClick={() => handleCelebrantClick(c)}
                                    icon={<User size={24} />}
                                    isNarrow
                                />
                            ))}
                        </div>
                    </div>

                    {/* Celebration Column (Real Presets) */}
                    <div className="flex flex-col space-y-6">
                        <div className="flex items-center space-x-3 px-2">
                            <span className="text-sm font-bold tracking-widest text-white/30 uppercase">Celebration:</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="flex flex-col space-y-4 px-2">
                            {isLoadingPresets ? (
                                <div className="flex items-center justify-center p-12">
                                    <Loader2 className="animate-spin text-white/20" size={48} />
                                </div>
                            ) : (
                                presets.map(p => (
                                    <ScenarioButton
                                        key={p.id}
                                        label={p.name}
                                        isActive={activePresetId === p.id}
                                        onClick={() => loadPresetMutation.mutate(p.id)}
                                        isLoading={loadPresetMutation.isPending && loadPresetMutation.variables === p.id}
                                        icon={<Music size={24} />}
                                        isNarrow
                                    />
                                ))
                            )}
                        </div>
                    </div>
                </div>

                {/* Bottom Row: List (Extra Memory) */}
                <div className="flex flex-col space-y-6">
                    <div className="flex items-center space-x-3 px-2">
                        <span className="text-sm font-bold tracking-widest text-white/30 uppercase">List:</span>
                        <div className="h-px flex-1 bg-white/5" />
                    </div>
                    <div className="flex flex-col space-y-4 max-h-[400px] overflow-y-auto overflow-x-hidden px-2 custom-scrollbar">
                        {memoryList.map(m => (
                            <ScenarioButton
                                key={m.id}
                                label={m.label}
                                isActive={selectedMemory === m.id}
                                onClick={() => handleMemoryClick(m)}
                                icon={<Save size={24} />}
                                isNarrow
                            />
                        ))}
                    </div>
                </div>
            </div>

            {/* Footer Style Decoration */}
            <div className="absolute top-0 bottom-0 right-0 w-1 bg-gradient-to-b from-transparent via-white/5 to-transparent" />
        </div>
    );
};
