import React, { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import {
    Volume2,
    VolumeX,
    RefreshCw,
    Save,
    ChevronRight,
    Plus,
    Minus,
    Grid,
    LayoutList,
    Sliders
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';

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
    const { highlightColor, backgroundColor } = useSettings();
    const [pendingValues, setPendingValues] = useState<Record<number, number>>({});
    const [controlValues, setControlValues] = useState<Record<number, ControlValue>>({});
    const [viewMode, setViewMode] = useState<'mixer' | 'compact'>('mixer');
    const [isMutating, setIsMutating] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Fetch all controls
    const { data: controlsData = { controls: [] }, isLoading } = useQuery<{ controls: Control[] }>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data;
        },
    });
    const controls = controlsData.controls || [];

    // Fetch individual control values
    useEffect(() => {
        const fetchControlValues = async () => {
            const values: Record<number, ControlValue> = {};
            for (const control of controls) {
                try {
                    const volumeResponse = await api.get(`/device/controls/volume/${control.id}`);
                    values[control.id] = {
                        id: control.id,
                        volume: volumeResponse.data.volume
                    };

                    if (control.second_id) {
                        const muteResponse = await api.get(`/device/controls/mute/${control.second_id}`);
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

    const setControlMutation = useMutation({
        mutationFn: async ({ id, value }: { id: number; value: number | boolean }) => {
            await api.post(`/device/controls/${id}`, { value });
        },
        onMutate: async ({ id, value }) => {
            setIsMutating(true);
            await queryClient.cancelQueries({ queryKey: ['controls'] });
            const previousValues = { ...controlValues };

            setControlValues((prev) => {
                const next = { ...prev };
                if (next[id]) {
                    if (typeof value === 'number') next[id] = { ...next[id], volume: value };
                    else next[id] = { ...next[id], mute: value };
                } else {
                    const ownerControl = controls.find(c => c.second_id === id);
                    if (ownerControl && next[ownerControl.id]) {
                        next[ownerControl.id] = { ...next[ownerControl.id], mute: value as boolean };
                    }
                }
                return next;
            });

            return { previousValues };
        },
        onSettled: async (_data, _error, variables) => {
            const control = controls.find(c => c.id === variables.id || c.second_id === variables.id);
            if (control) {
                try {
                    const res = await api.get(`/device/controls/volume/${control.id}`);
                    setControlValues(p => ({ ...p, [control.id]: { ...p[control.id], volume: res.data.volume } }));

                    if (control.second_id) {
                        const muteRes = await api.get(`/device/controls/mute/${control.second_id}`);
                        setControlValues(p => ({ ...p, [control.id]: { ...p[control.id], mute: muteRes.data.mute } }));
                    }
                } catch (e) {
                    console.error("Error refreshing control state:", e);
                }
            }

            setPendingValues((p) => {
                const n = { ...p };
                delete n[variables.id];
                return n;
            });
            setIsMutating(false);
        },
    });

    useEffect(() => {
        if (isMutating) return;
        if (lastMessage?.type === 'command_executed' || lastMessage?.type === 'status_update') {
            queryClient.invalidateQueries({ queryKey: ['controls'] });
        }
    }, [lastMessage, queryClient, isMutating]);

    const handleVolumeChange = (controlId: number, value: number) => {
        setPendingValues((prev) => ({ ...prev, [controlId]: value }));
    };

    const handleVolumeRelease = (controlId: number, value: number) => {
        setControlMutation.mutate({ id: controlId, value });
        setControlValues(prev => ({
            ...prev,
            [controlId]: { ...prev[controlId], volume: value }
        }));
    };

    const handleStepVolume = (control: Control, direction: 'up' | 'down') => {
        const current = controlValues[control.id]?.volume ?? 0;
        const step = control.step || 1;
        const next = direction === 'up' ? current + step : current - step;
        const clamped = Math.max(control.min || -96, Math.min(control.max || 12, next));
        setControlMutation.mutate({ id: control.id, value: clamped });
        setControlValues(prev => ({
            ...prev,
            [control.id]: { ...prev[control.id], volume: clamped }
        }));
    };

    const handleMuteToggle = (control: Control) => {
        const muteId = control.second_id || control.id;
        const currentMute = controlValues[control.id]?.mute ?? false;
        setControlMutation.mutate({ id: muteId, value: !currentMute });
    };

    const scroll = (direction: 'left' | 'right') => {
        if (scrollContainerRef.current) {
            const amount = direction === 'left' ? -400 : 400;
            scrollContainerRef.current.scrollBy({ left: amount, behavior: 'smooth' });
        }
    };

    const renderMixerChannel = (control: Control) => {
        const val = control.id in pendingValues ? pendingValues[control.id] : controlValues[control.id]?.volume ?? 0;
        const isMuted = controlValues[control.id]?.mute ?? false;
        const min = control.min || -96;
        const max = control.max || 12;
        const percent = ((val - min) / (max - min)) * 100;

        return (
            <div key={control.id} className="flex flex-col items-center h-full w-40 shrink-0 select-none border-r border-white/5 relative last:border-r-0">
                {/* Channel Label */}
                <div className="h-12 flex items-center justify-center w-full px-2 mb-4 shrink-0">
                    <span className="text-xs font-black text-white/40 uppercase tracking-widest text-center truncate">
                        {control.name}
                    </span>
                </div>

                {/* Fader Track Container */}
                <div className="flex-1 relative w-16 flex flex-col items-center group py-4">
                    {/* Track Slot */}
                    <div className="absolute inset-y-4 w-3 bg-black rounded-full border border-white/5 shadow-[inset_0_2px_10px_rgba(0,0,0,1)] overflow-hidden">
                        <div
                            className="absolute bottom-0 w-full opacity-20 blur-[2px] transition-all duration-300"
                            style={{
                                height: `${percent}%`,
                                backgroundColor: highlightColor
                            }}
                        />
                    </div>

                    {/* Fader Cap */}
                    <div
                        className="absolute w-14 h-20 z-20 pointer-events-none transition-all duration-75"
                        style={{ bottom: `calc(${percent}% - 40px)` }}
                    >
                        <div className="w-full h-full bg-gradient-to-b from-[#444] via-[#1a1a1c] to-[#010101] border border-white/10 shadow-[0_15px_30px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-lg flex flex-col items-center justify-center overflow-hidden">
                            <div
                                className="w-full h-1.5 shadow-[0_0_15px_2px]"
                                style={{
                                    backgroundColor: highlightColor,
                                    boxShadow: `0 0 15px 2px ${highlightColor}`
                                }}
                            />
                            <div className="flex-1 flex flex-col items-center justify-center gap-1 opacity-20">
                                <div className="w-6 h-px bg-white" />
                                <div className="w-6 h-px bg-white" />
                                <div className="w-6 h-px bg-white" />
                            </div>
                        </div>
                    </div>

                    {/* Interaction Layer */}
                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={control.step || 0.1}
                        value={val}
                        onInput={(e) => handleVolumeChange(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onChange={(e) => handleVolumeChange(control.id, parseFloat(e.target.value))}
                        onMouseUp={(e) => handleVolumeRelease(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handleVolumeRelease(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        className="absolute inset-x-0 -inset-y-0 opacity-0 cursor-pointer h-full z-30"
                        style={{
                            appearance: 'slider-vertical' as any,
                            WebkitAppearance: 'slider-vertical' as any,
                            width: '64px',
                        }}
                    />
                </div>

                {/* DB Value Display */}
                <div className="mt-2 mb-4">
                    <span className="font-mono text-lg font-bold text-white/50 tabular-nums">
                        {val.toFixed(1)} <span className="text-[10px] opacity-40">dB</span>
                    </span>
                </div>

                {/* Precision Controls & Mute */}
                <div className="flex flex-col gap-2 w-full px-6 pb-6 shrink-0">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStepVolume(control, 'down')}
                            className="flex-1 h-12 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/5 border-b-4 border-black/50 rounded-xl transition-all active:translate-y-1 active:border-b-0"
                        >
                            <Minus className="w-5 h-5 text-blue-400" />
                        </button>
                        <button
                            onClick={() => handleStepVolume(control, 'up')}
                            className="flex-1 h-12 flex items-center justify-center bg-[#1e1e20] hover:bg-[#252528] border border-white/5 border-b-4 border-black/50 rounded-xl transition-all active:translate-y-1 active:border-b-0"
                        >
                            <Plus className="w-5 h-5 text-blue-400" />
                        </button>
                    </div>
                    <button
                        onClick={() => handleMuteToggle(control)}
                        className={`h-12 w-full flex items-center justify-center rounded-xl border border-white/5 border-b-4 transition-all active:translate-y-1 active:border-b-0 ${isMuted
                            ? 'bg-red-600 border-red-500 border-b-red-900 text-white'
                            : 'bg-[#1e1e20] hover:bg-[#252528] border-b-black/50 text-blue-400'
                            }`}
                    >
                        {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
                    </button>
                </div>
            </div>
        );
    };

    const renderCompactItem = (control: Control) => {
        const val = control.id in pendingValues ? pendingValues[control.id] : controlValues[control.id]?.volume ?? 0;
        const isMuted = controlValues[control.id]?.mute ?? false;

        return (
            <div key={control.id} className="bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                    <h3 className="font-bold text-white/80 uppercase tracking-wider truncate mr-2">{control.name}</h3>
                    <button
                        onClick={() => handleMuteToggle(control)}
                        className={`p-3 rounded-2xl border border-white/5 border-b-4 transition-all active:translate-y-1 active:border-b-0 ${isMuted
                            ? 'bg-red-600 border-red-500 border-b-red-900 text-white'
                            : 'bg-white/5 border-b-black text-white/40'
                            }`}
                    >
                        {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                    </button>
                </div>

                <div className="flex items-center gap-4">
                    <input
                        type="range"
                        min={control.min || -96}
                        max={control.max || 12}
                        step={control.step || 0.1}
                        value={val}
                        onChange={(e) => handleVolumeChange(control.id, parseFloat(e.target.value))}
                        onMouseUp={(e) => handleVolumeRelease(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handleVolumeRelease(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        className="flex-1 h-2 bg-black rounded-full appearance-none cursor-pointer"
                        style={{ accentColor: highlightColor }}
                    />
                    <div className="w-16 text-right font-mono font-bold text-white/60">
                        {val.toFixed(1)}
                    </div>
                </div>
            </div>
        );
    };

    return (
        <div
            className="fixed inset-0 flex flex-col overflow-hidden text-white"
            style={{ backgroundColor }}
        >
            {/* 1. TOP TITLE ROW (Aligned with Dashboard button row) */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <Sliders className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Sezione Controlli
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            {/* 2. UTILITY NAVIGATION BAR (Shifted down for layout) */}
            <div className="mt-32 h-24 px-8 flex items-center justify-between border-b border-white/5 bg-black/5 backdrop-blur-2xl shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] active:scale-95 transition-all">
                        <RefreshCw size={28} />
                    </button>
                    <button className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] active:scale-95 transition-all">
                        <Save size={28} />
                    </button>
                </div>

                {/* Empty Middle Space for Title above */}
                <div className="flex-1" />

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 rounded-2xl p-1 border border-white/5 mr-4 shadow-inner">
                        <button
                            onClick={() => setViewMode('mixer')}
                            className={`px-6 py-2 rounded-xl transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] ${viewMode === 'mixer' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                            <LayoutList size={16} /> Mixer
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-6 py-2 rounded-xl transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-[11px] ${viewMode === 'compact' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                            <Grid size={16} /> Compact
                        </button>
                    </div>
                    <button onClick={() => scroll('right')} className="w-14 h-14 bg-blue-600/20 border border-blue-500/30 rounded-2xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.15)] active:scale-95 transition-all">
                        <ChevronRight size={32} />
                    </button>
                </div>
            </div>

            {/* MAIN CONTENT AREA */}
            <main className="flex-1 overflow-hidden relative">
                <AnimatePresence mode="wait">
                    {viewMode === 'mixer' ? (
                        <motion.div
                            key="mixer"
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: -20 }}
                            className="h-full flex overflow-x-auto overflow-y-hidden no-scrollbar px-6"
                            ref={scrollContainerRef}
                        >
                            {controls.map(renderMixerChannel)}
                            {isLoading && (
                                <div className="flex-1 flex items-center justify-center">
                                    <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            key="compact"
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.98 }}
                            className="h-full overflow-y-auto p-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6"
                        >
                            {controls.map(renderCompactItem)}
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Subtle Scroll Hint for Mixer */}
                {viewMode === 'mixer' && controls.length > 5 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-black/20 to-transparent w-20 h-full pointer-events-none" />
                )}
            </main>
        </div>
    );
};
