import React, { useState, useEffect, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import {
    Volume2,
    VolumeX,
    RefreshCw,
    Save,
    ChevronLeft,
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
    const [volStep, setVolStep] = useState(0.1);
    const scrollContainerRef = useRef<HTMLDivElement>(null);

    // Fetch all controls
    const { data: controlsData = { controls: [] }, isLoading } = useQuery<{ controls: Control[] }>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data;
        },
    });

    const baseControls = controlsData.controls || [];
    // TEST: Duplicate controls to reach 12 items
    const controls = useMemo(() => {
        if (baseControls.length === 0) return [];
        return Array.from({ length: 12 }, (_, i) => {
            const isEven = (i + 1) % 2 === 0;
            return {
                ...baseControls[i % baseControls.length],
                id: 1000 + i,
                name: isEven ? `BUS ${i + 1}` : `CH ${i + 1}`,
                max: isEven ? 6 : 12,
                min: -96,
                step: volStep
            };
        });
    }, [baseControls, volStep]);

    const initialFetchDone = useRef(false);

    // Fetch individual control values
    useEffect(() => {
        const fetchControlValues = async () => {
            const values: Record<number, ControlValue> = {};
            for (const control of controls) {
                if (control.id >= 1000) {
                    values[control.id] = { id: control.id, volume: -10, mute: false };
                    continue;
                }
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

        if (controls.length > 0 && !initialFetchDone.current) {
            fetchControlValues();
            initialFetchDone.current = true;
        }
    }, [controls]);

    const setControlMutation = useMutation({
        mutationFn: async ({ id, value }: { id: number; value: number | boolean }) => {
            if (id >= 1000) return; // Mock success
            await api.post(`/device/controls/${id}`, { value });
        },
        onMutate: async ({ id, value }) => {
            setIsMutating(true);
            await queryClient.cancelQueries({ queryKey: ['controls'] });

            setControlValues((prev) => {
                const next = { ...prev };
                // Find control that owns this ID (could be volume or mute)
                const controlId = Object.keys(next).find(cid => {
                    const c = controls.find(ctrl => ctrl.id === Number(cid));
                    return c?.id === id || c?.second_id === id;
                }) || id;

                if (next[Number(controlId)]) {
                    if (typeof value === 'number') {
                        next[Number(controlId)] = { ...next[Number(controlId)], volume: value };
                    } else {
                        next[Number(controlId)] = { ...next[Number(controlId)], mute: value };
                    }
                }
                return next;
            });
        },
        onSettled: async (_data, _error, variables) => {
            if (variables.id >= 1000) {
                if (typeof variables.value === 'number') {
                    setControlValues(p => ({ ...p, [variables.id]: { ...p[variables.id], volume: variables.value as number } }));
                } else {
                    setControlValues(p => ({ ...p, [variables.id]: { ...p[variables.id], mute: variables.value as boolean } }));
                }
            } else {
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
    };

    const handleStepVolume = (control: Control, direction: 'up' | 'down') => {
        const current = controlValues[control.id]?.volume ?? 0;
        const step = volStep;
        const next = direction === 'up' ? current + step : current - step;
        const max = control.max ?? 12;
        const clamped = Math.max(control.min || -96, Math.min(max, next));
        setControlMutation.mutate({ id: control.id, value: clamped });
    };

    const handleResetAll = () => {
        controls.forEach(control => {
            setControlMutation.mutate({ id: control.id, value: 0 });
        });
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
            <div key={control.id} className="flex flex-col items-center h-full w-40 shrink-0 select-none border-r border-white/5 relative last:border-r-0 pb-12">
                {/* Channel Label */}
                <div className="h-16 flex items-center justify-center w-full px-2 mt-4 shrink-0">
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] text-center line-clamp-2 leading-relaxed">
                        {control.name}
                    </span>
                </div>

                {/* Fader Track Container */}
                <div className="flex-1 w-full relative flex flex-col items-center group px-6 my-10">
                    <div className="absolute inset-y-0 w-2 bg-black/70 rounded-full border border-white/5 shadow-[inset_0_2px_15px_rgba(0,0,0,1)] overflow-hidden pointer-events-none">
                        <div
                            className="absolute bottom-0 w-full opacity-60 transition-all duration-300"
                            style={{
                                height: `${percent}%`,
                                backgroundColor: highlightColor,
                                boxShadow: `0 0 30px ${highlightColor}66`
                            }}
                        />
                    </div>

                    <div
                        className="absolute w-14 h-24 z-20 pointer-events-none transition-all duration-75 flex flex-col items-center justify-center translate-y-1/2"
                        style={{ bottom: `${percent}%` }}
                    >
                        <div className="w-full h-full bg-gradient-to-b from-[#555] via-[#1a1a1c] to-[#000] border border-white/20 shadow-[0_20px_40px_-12px_rgba(0,0,0,1),inset_0_1px_1px_rgba(255,255,255,0.1)] rounded-xl flex flex-col items-center justify-center overflow-hidden">
                            <div
                                className="w-full h-2.5 shrink-0"
                                style={{
                                    backgroundColor: highlightColor || '#3b82f6',
                                    boxShadow: `0 0 15px ${highlightColor || '#3b82f6'}`
                                }}
                            />
                            <div className="flex-1 flex flex-col items-center justify-center gap-1.5 opacity-30 my-2">
                                <div className="w-8 h-[1.5px] bg-white/40" />
                                <div className="w-8 h-[1.5px] bg-white/40" />
                                <div className="w-8 h-[1.5px] bg-white/40" />
                            </div>
                            <div className="font-mono text-[10px] font-black text-blue-400/80 mb-2">
                                {val.toFixed(1)}
                            </div>
                        </div>
                    </div>

                    <input
                        type="range"
                        min={min}
                        max={max}
                        step={control.step || 0.1}
                        value={val}
                        onInput={(e) => handleVolumeChange(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onChange={(e) => handleVolumeChange(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onMouseUp={(e) => handleVolumeRelease(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handleVolumeRelease(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        className="absolute inset-y-0 inset-x-0 opacity-0 cursor-pointer w-full z-30"
                        style={{
                            appearance: 'slider-vertical' as any,
                            WebkitAppearance: 'slider-vertical' as any,
                        }}
                    />
                </div>

                {/* DB Value Display */}
                <div className="h-10 flex items-center mb-2 shrink-0">
                    <span className="font-mono text-xl font-bold text-white/50 tabular-nums tracking-wider uppercase">
                        {val.toFixed(1)} <span className="text-[10px] opacity-30 ml-0.5">dB</span>
                    </span>
                </div>

                {/* Precision Controls & Mute */}
                <div className="flex flex-col gap-3 w-full px-6 shrink-0 mt-auto">
                    <div className="flex gap-2">
                        <button
                            onClick={() => handleStepVolume(control, 'down')}
                            className="flex-1 h-14 flex items-center justify-center bg-[#18181a] hover:bg-[#202022] border border-white/5 border-b-4 border-black/80 rounded-2xl transition-all active:translate-y-0.5 active:border-b-0 shadow-lg"
                        >
                            <Minus className="w-6 h-6 text-blue-400" />
                        </button>
                        <button
                            onClick={() => handleStepVolume(control, 'up')}
                            className="flex-1 h-14 flex items-center justify-center bg-[#18181a] hover:bg-[#202022] border border-white/5 border-b-4 border-black/80 rounded-2xl transition-all active:translate-y-0.5 active:border-b-0 shadow-lg"
                        >
                            <Plus className="w-6 h-6 text-blue-400" />
                        </button>
                    </div>
                    <button
                        onClick={() => handleMuteToggle(control)}
                        className={`h-14 w-full flex items-center justify-center rounded-2xl border border-white/5 border-b-4 transition-all active:translate-y-0.5 active:border-b-0 shadow-lg ${isMuted
                            ? 'bg-red-600/90 border-red-500/50 border-b-red-950 text-white'
                            : 'bg-[#18181a] hover:bg-[#202022] border-b-black/80 text-blue-400'
                            }`}
                    >
                        {isMuted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
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
            {/* 1. TOP TITLE ROW */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <Sliders className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Controlli
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            {/* 2. UTILITY NAVIGATION BAR */}
            <div className="mt-24 h-20 px-8 flex items-center justify-between border-b border-white/5 bg-black/5 backdrop-blur-2xl shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleResetAll}
                        className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-95 transition-all"
                    >
                        <RefreshCw size={24} />
                    </button>
                    <button className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-95 transition-all">
                        <Save size={24} />
                    </button>

                    <div className="h-12 flex items-center bg-black/40 border border-white/10 rounded-xl px-4 gap-3 shadow-inner">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap">Step Volume</span>
                        <select
                            value={volStep}
                            onChange={(e) => setVolStep(parseFloat(e.target.value))}
                            className="bg-transparent border-none text-blue-400 font-bold text-sm outline-none cursor-pointer hover:text-white transition-colors"
                        >
                            <option value="0.1" className="bg-[#1a1a1c]">0.1 dB</option>
                            <option value="0.2" className="bg-[#1a1a1c]">0.2 dB</option>
                            <option value="0.5" className="bg-[#1a1a1c]">0.5 dB</option>
                            <option value="1.0" className="bg-[#1a1a1c]">1.0 dB</option>
                        </select>
                    </div>
                </div>

                <div className="flex-1" />

                <div className="flex items-center gap-4">
                    <div className="flex bg-black/40 rounded-xl p-1 border border-white/5 mr-4 shadow-inner">
                        <button
                            onClick={() => setViewMode('mixer')}
                            className={`px-5 py-2 rounded-lg transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] ${viewMode === 'mixer' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                            <LayoutList size={14} /> Mixer
                        </button>
                        <button
                            onClick={() => setViewMode('compact')}
                            className={`px-5 py-2 rounded-lg transition-all flex items-center gap-2 font-bold uppercase tracking-widest text-[10px] ${viewMode === 'compact' ? 'bg-white/10 text-white shadow-lg' : 'text-white/20 hover:text-white/40'}`}
                        >
                            <Grid size={14} /> Compact
                        </button>
                    </div>
                    <div className="flex items-center gap-4">
                        <button onClick={() => scroll('left')} className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-95 transition-all">
                            <ChevronLeft size={28} />
                        </button>
                        <button onClick={() => scroll('right')} className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-95 transition-all">
                            <ChevronRight size={28} />
                        </button>
                    </div>
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

                {viewMode === 'mixer' && controls.length > 5 && (
                    <div className="absolute right-0 top-1/2 -translate-y-1/2 bg-gradient-to-l from-black/20 to-transparent w-20 h-full pointer-events-none" />
                )}
            </main>
        </div>
    );
};
