import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '../lib/api';
import { useWebSocket } from '../context/WebSocketContext';
import { useAuth } from '../context/AuthContext';
import { useSettings } from '../context/SettingsContext';
import { useIsTablet } from '../hooks/useIsTablet';
import { Check, User, Music, Save, Loader2, LayoutGrid, Undo2, ChevronLeft } from 'lucide-react';
import { AnimatePresence, motion } from 'framer-motion';

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

    // === PRESET UNDO STATE ===
    const [previousPresetId, setPreviousPresetId] = useState<string | null>(null);
    const [previousPresetName, setPreviousPresetName] = useState<string | null>(null);
    const [showUndo, setShowUndo] = useState(false);
    const undoTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const UNDO_TIMEOUT = 10000; // 10 seconds

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
            // Save current preset as "previous" before loading new one
            if (activePresetId && activePresetId !== presetId) {
                const prevPreset = presets.find(p => p.id === activePresetId);
                setPreviousPresetId(activePresetId);
                setPreviousPresetName(prevPreset?.name || activePresetId);
            }

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
        onSuccess: (_data, presetId) => {
            queryClient.invalidateQueries({ queryKey: ['presets', 'current'] });

            // Show undo pill (only if we changed from a different preset)
            if (previousPresetId && previousPresetId !== presetId) {
                setShowUndo(true);

                // Clear any existing timer
                if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

                // Auto-hide after 10 seconds
                undoTimerRef.current = setTimeout(() => {
                    setShowUndo(false);
                    setPreviousPresetId(null);
                    setPreviousPresetName(null);
                }, UNDO_TIMEOUT);
            }
        },
    });

    // Cleanup timer on unmount
    useEffect(() => {
        return () => {
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);
        };
    }, []);

    const handleUndo = () => {
        if (previousPresetId) {
            // Clear undo state first
            setShowUndo(false);
            if (undoTimerRef.current) clearTimeout(undoTimerRef.current);

            const restoreId = previousPresetId;
            setPreviousPresetId(null);
            setPreviousPresetName(null);

            // Load the previous preset
            loadPresetMutation.mutate(restoreId);
        }
    };

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
                relative group flex items-center justify-between p-4 md:p-5 rounded-3xl transition-all duration-300
                border-t-2 border-t-white/20 border-x border-x-white/10 border-b-[10px] ${isActive
                    ? 'bg-green-600/20 border-green-500/50 border-b-green-950'
                    : 'bg-[#2a2a2e] border-b-[#111114] shadow-2xl'}
                active:translate-y-2 active:border-b-4
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

        </button>
    );

    const navigate = useNavigate();
    const { backgroundColor } = useSettings();
    const isTablet = useIsTablet();

    // ============================================
    // RENDER MOBILE VIEW
    // ============================================
    if (!isTablet) {
        return (
            <div
                className="fixed top-0 left-0 right-0 bottom-7 flex flex-col overflow-hidden text-white font-sans"
                style={{ backgroundColor }}
            >
                {/* Header */}
                <div className="shrink-0 px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3 mb-1">
                        <button onClick={() => navigate('/')} className="p-1.5 -ml-1 rounded-lg text-white/30 active:bg-white/10"><ChevronLeft className="w-5 h-5" /></button>
                        <LayoutGrid className="w-5 h-5 text-blue-400" />
                        <h1 className="text-lg font-black uppercase tracking-[0.2em]">Scenario</h1>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-blue-500/50 via-transparent to-transparent" />
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-5">

                    {/* Celebrant Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <User size={14} className="text-white/30" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Celebrante</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="space-y-2">
                            {celebrants.map(c => (
                                <button
                                    key={c.id}
                                    onClick={() => handleCelebrantClick(c)}
                                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border active:translate-y-0.5 active:border-b-0 ${
                                        selectedCelebrant === c.id
                                            ? 'bg-green-600/15 border-green-500/30 border-b-2 border-b-green-900'
                                            : 'bg-[#111113] border-white/5 border-b-2 border-b-black/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <User size={16} className={selectedCelebrant === c.id ? 'text-green-400' : 'text-white/20'} />
                                        <span className={`font-bold text-sm uppercase tracking-wider ${selectedCelebrant === c.id ? 'text-green-400' : 'text-white/60'}`}>
                                            {c.label}
                                        </span>
                                    </div>
                                    {selectedCelebrant === c.id && <Check size={18} className="text-green-400" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Celebration (Presets) Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <Music size={14} className="text-white/30" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Celebrazione</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="space-y-2">
                            {isLoadingPresets ? (
                                <div className="flex items-center justify-center py-8">
                                    <Loader2 className="animate-spin text-white/20" size={32} />
                                </div>
                            ) : (
                                presets.map(p => (
                                    <button
                                        key={p.id}
                                        onClick={() => loadPresetMutation.mutate(p.id)}
                                        disabled={loadPresetMutation.isPending && loadPresetMutation.variables === p.id}
                                        className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border active:translate-y-0.5 active:border-b-0 ${
                                            activePresetId === p.id
                                                ? 'bg-green-600/15 border-green-500/30 border-b-2 border-b-green-900'
                                                : 'bg-[#111113] border-white/5 border-b-2 border-b-black/60'
                                        }`}
                                    >
                                        <div className="flex items-center gap-3">
                                            <Music size={16} className={activePresetId === p.id ? 'text-green-400' : 'text-white/20'} />
                                            <span className={`font-bold text-sm uppercase tracking-wider ${activePresetId === p.id ? 'text-green-400' : 'text-white/60'}`}>
                                                {p.name}
                                            </span>
                                        </div>
                                        {loadPresetMutation.isPending && loadPresetMutation.variables === p.id ? (
                                            <Loader2 size={18} className="animate-spin text-green-400" />
                                        ) : activePresetId === p.id ? (
                                            <Check size={18} className="text-green-400" />
                                        ) : null}
                                    </button>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Memory List Section */}
                    <div>
                        <div className="flex items-center gap-2 mb-2 px-1">
                            <Save size={14} className="text-white/30" />
                            <span className="text-[9px] font-black text-white/20 uppercase tracking-[0.3em]">Lista</span>
                            <div className="h-px flex-1 bg-white/5" />
                        </div>
                        <div className="space-y-2">
                            {memoryList.map(m => (
                                <button
                                    key={m.id}
                                    onClick={() => handleMemoryClick(m)}
                                    className={`w-full flex items-center justify-between p-3.5 rounded-xl transition-all border active:translate-y-0.5 active:border-b-0 ${
                                        selectedMemory === m.id
                                            ? 'bg-green-600/15 border-green-500/30 border-b-2 border-b-green-900'
                                            : 'bg-[#111113] border-white/5 border-b-2 border-b-black/60'
                                    }`}
                                >
                                    <div className="flex items-center gap-3">
                                        <Save size={16} className={selectedMemory === m.id ? 'text-green-400' : 'text-white/20'} />
                                        <span className={`font-bold text-sm uppercase tracking-wider ${selectedMemory === m.id ? 'text-green-400' : 'text-white/60'}`}>
                                            {m.label}
                                        </span>
                                    </div>
                                    {selectedMemory === m.id && <Check size={18} className="text-green-400" />}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Undo Floating Pill */}
                <AnimatePresence>
                    {showUndo && previousPresetName && (
                        <motion.div
                            initial={{ y: 100, opacity: 0, scale: 0.8 }}
                            animate={{ y: 0, opacity: 1, scale: 1 }}
                            exit={{ y: 100, opacity: 0, scale: 0.8 }}
                            transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[100]"
                        >
                            <button
                                onClick={handleUndo}
                                disabled={loadPresetMutation.isPending}
                                className="relative flex items-center gap-2 px-5 py-3 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] active:scale-95 transition-all overflow-hidden"
                            >
                                <motion.div
                                    initial={{ scaleX: 1 }}
                                    animate={{ scaleX: 0 }}
                                    transition={{ duration: UNDO_TIMEOUT / 1000, ease: 'linear' }}
                                    className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-400/60 origin-left rounded-full"
                                />
                                <Undo2 className="w-4 h-4 text-amber-400" />
                                <span className="text-white/90 font-bold text-xs uppercase tracking-wider">Annulla</span>
                                <span className="text-white/40 text-xs">·</span>
                                <span className="text-white/60 font-medium text-xs">{previousPresetName}</span>
                            </button>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        );
    }

    // ============================================
    // RENDER TABLET VIEW
    // ============================================
    return (
        <div
            className="fixed inset-0 bg-black text-gray-900 dark:text-white p-6 md:p-12 font-sans overflow-hidden flex flex-col transition-colors duration-500"
            style={{ backgroundColor: backgroundColor }}
        >

            {/* 1. TOP TITLE ROW */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <LayoutGrid className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Scenario
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            <div className="mt-28 h-4 shrink-0" />

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

            {/* === UNDO PRESET FLOATING PILL === */}
            <AnimatePresence>
                {showUndo && previousPresetName && (
                    <motion.div
                        initial={{ y: 100, opacity: 0, scale: 0.8 }}
                        animate={{ y: 0, opacity: 1, scale: 1 }}
                        exit={{ y: 100, opacity: 0, scale: 0.8 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                        className="fixed bottom-8 left-1/2 -translate-x-1/2 z-[100]"
                    >
                        <button
                            onClick={handleUndo}
                            disabled={loadPresetMutation.isPending}
                            className="relative flex items-center gap-3 px-6 py-4 bg-white/10 backdrop-blur-2xl rounded-full border border-white/20 shadow-[0_8px_32px_rgba(0,0,0,0.5)] hover:bg-white/15 active:scale-95 transition-all group overflow-hidden"
                        >
                            {/* Progress bar that shrinks over 10s */}
                            <motion.div
                                initial={{ scaleX: 1 }}
                                animate={{ scaleX: 0 }}
                                transition={{ duration: UNDO_TIMEOUT / 1000, ease: 'linear' }}
                                className="absolute bottom-0 left-0 right-0 h-[3px] bg-amber-400/60 origin-left rounded-full"
                            />

                            <Undo2 className="w-5 h-5 text-amber-400 group-hover:text-amber-300 transition-colors" />
                            <span className="text-white/90 font-bold text-sm uppercase tracking-wider">
                                Annulla
                            </span>
                            <span className="text-white/40 text-sm">·</span>
                            <span className="text-white/60 font-medium text-sm">
                                {previousPresetName}
                            </span>
                        </button>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};
