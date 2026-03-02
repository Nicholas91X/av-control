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
    Sliders,
    Check,
    X
} from 'lucide-react';
import { useWebSocket } from '../context/WebSocketContext';
import { useSettings } from '../context/SettingsContext';
import { useIsTablet } from '../hooks/useIsTablet';

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
    const { highlightColor, backgroundColor, defaultVolStep, setDefaultVolStep, defaultControlsView } = useSettings();
    const [pendingValues, setPendingValues] = useState<Record<number, number>>({});
    const [controlValues, setControlValues] = useState<Record<number, ControlValue>>({});
    const [viewMode, setViewMode] = useState<'mixer' | 'compact'>(defaultControlsView);
    const [isMutating, setIsMutating] = useState(false);
    const scrollContainerRef = useRef<HTMLDivElement>(null);
    const stepTimeoutsRef = useRef<Record<number, ReturnType<typeof setTimeout>>>({});
    const pendingStepValueRef = useRef<Record<number, number>>({});
    const draggingFaderRef = useRef<number | null>(null);
    const [saveModalOpen, setSaveModalOpen] = useState(false);
    const [selectedPresetToSave, setSelectedPresetToSave] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState(false);

    // Fetch presets list for save dialog
    const { data: presetsData } = useQuery<{ presets: { id: string; name: string }[] }>({
        queryKey: ['presets'],
        queryFn: async () => {
            const response = await api.get('/device/presets');
            return response.data;
        },
    });

    // Fetch current active preset
    const { data: currentPresetData } = useQuery<{ id: string }>({
        queryKey: ['presets', 'current'],
        queryFn: async () => {
            const response = await api.get('/device/presets/current');
            return response.data;
        },
    });

    // Save preset mutation
    const savePresetMutation = useMutation({
        mutationFn: async (presetId: string) => {
            await api.post('/device/presets/save', { id: presetId });
        },
        onSuccess: () => {
            setSaveSuccess(true);
            setTimeout(() => {
                setSaveSuccess(false);
                setSaveModalOpen(false);
                setSelectedPresetToSave(null);
            }, 1500);
        },
        onError: (error) => {
            console.error('Failed to save preset:', error);
        },
    });

    // Fetch all controls
    const { data: controlsData = { controls: [] }, isLoading } = useQuery<{ controls: Control[] }>({
        queryKey: ['controls'],
        queryFn: async () => {
            const response = await api.get('/device/controls');
            return response.data;
        },
    });

    // Use real controls from the API
    const controls = useMemo(() => {
        const baseControls = controlsData?.controls || [];
        const result: Control[] = [];

        baseControls.forEach((control: Control) => {
            result.push({ ...control, step: defaultVolStep });

            if (control.second_id) {
                let rName = control.name;
                if (rName.endsWith(' L')) {
                    rName = rName.substring(0, rName.length - 2) + ' R';
                } else if (rName.endsWith(' l')) {
                    rName = rName.substring(0, rName.length - 2) + ' r';
                } else {
                    rName += ' R';
                }

                result.push({
                    ...control,
                    id: control.second_id,
                    name: rName,
                    second_id: undefined, // Clear second_id for the synthesized control
                    step: defaultVolStep
                });
            }
        });

        return result;
    }, [controlsData?.controls, defaultVolStep]);



    const fetchControlValues = async () => {
        const values: Record<number, ControlValue> = {};
        for (const control of controls) {
            try {
                const volumeResponse = await api.get(`/device/controls/volume/${control.id}`);
                values[control.id] = {
                    id: control.id,
                    volume: volumeResponse.data.volume
                };

                // Always fetch mute state: use control.id
                try {
                    const muteResponse = await api.get(`/device/controls/mute/${control.id}`);
                    values[control.id] = {
                        ...values[control.id],
                        mute: muteResponse.data.mute,
                    };
                } catch {
                    // Mute endpoint not available for this control — leave mute undefined
                }
            } catch (error) {
                console.error(`Failed to fetch control ${control.id}:`, error);
            }
        }
        setControlValues(values);
    };

    // Fetch control values on mount AND every time controls change
    useEffect(() => {
        if (controls.length > 0) {
            fetchControlValues();
        }
    }, [controls]);

    // Load preset mutation (refresh from saved state)
    const loadPresetMutation = useMutation({
        mutationFn: async (presetId: string) => {
            await api.post('/device/presets/load', { id: presetId });
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ['presets', 'current'] });
            queryClient.invalidateQueries({ queryKey: ['controls'] });
            // Wait for hardware to settle before re-reading values
            setTimeout(() => fetchControlValues(), 600);
        },
    });

    const setControlMutation = useMutation({
        mutationFn: async ({ id, value }: { id: number; value: number | boolean }) => {
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
                    return c?.id === id;
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
            const control = controls.find(c => c.id === variables.id);
            if (control) {
                try {
                    const res = await api.get(`/device/controls/volume/${control.id}`);
                    setControlValues(p => ({ ...p, [control.id]: { ...p[control.id], volume: res.data.volume } }));

                    try {
                        const muteRes = await api.get(`/device/controls/mute/${control.id}`);
                        setControlValues(p => ({ ...p, [control.id]: { ...p[control.id], mute: muteRes.data.mute } }));
                    } catch {
                        // Mute not available for this control
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

    const handleVolumeRelease = (control: Control, value: number) => {
        setControlMutation.mutate({ id: control.id, value });
    };

    // Converte la posizione Y del puntatore in un valore dB per il fader verticale.
    // top del track = max, bottom = min.
    const calcFaderValue = (clientY: number, rect: DOMRect, min: number, max: number): number => {
        const relY = clientY - rect.top;
        const ratio = 1 - Math.max(0, Math.min(1, relY / rect.height));
        return Math.round((min + ratio * (max - min)) * 10) / 10;
    };

    const handleFaderPointerDown = (e: React.PointerEvent<HTMLDivElement>, control: Control) => {
        e.preventDefault();
        e.stopPropagation();
        e.currentTarget.setPointerCapture(e.pointerId);
        draggingFaderRef.current = control.id;
        const rect = e.currentTarget.getBoundingClientRect();
        const newVal = calcFaderValue(e.clientY, rect, control.min || -96, control.max || 12);
        handleVolumeChange(control.id, newVal);
    };

    const handleFaderPointerMove = (e: React.PointerEvent<HTMLDivElement>, control: Control) => {
        if (draggingFaderRef.current !== control.id) return;
        const rect = e.currentTarget.getBoundingClientRect();
        const newVal = calcFaderValue(e.clientY, rect, control.min || -96, control.max || 12);
        handleVolumeChange(control.id, newVal);
    };

    const handleFaderPointerUp = (e: React.PointerEvent<HTMLDivElement>, control: Control) => {
        if (draggingFaderRef.current !== control.id) return;
        draggingFaderRef.current = null;
        const rect = e.currentTarget.getBoundingClientRect();
        const newVal = calcFaderValue(e.clientY, rect, control.min || -96, control.max || 12);
        handleVolumeRelease(control, newVal);
    };

    const handleStepVolume = (control: Control, direction: 'up' | 'down') => {
        const current = pendingStepValueRef.current[control.id] ?? controlValues[control.id]?.volume ?? 0;
        const step = defaultVolStep;
        const next = direction === 'up' ? current + step : current - step;
        const max = control.max ?? 12;
        const clamped = Math.max(control.min || -96, Math.min(max, next));

        // Aggiorna UI immediatamente
        pendingStepValueRef.current[control.id] = clamped;
        setPendingValues(prev => ({ ...prev, [control.id]: clamped }));

        // Debounce: manda un solo comando dopo 150ms di inattività sul canale
        if (stepTimeoutsRef.current[control.id]) {
            clearTimeout(stepTimeoutsRef.current[control.id]);
        }
        stepTimeoutsRef.current[control.id] = setTimeout(() => {
            setControlMutation.mutate({ id: control.id, value: pendingStepValueRef.current[control.id] });
            delete pendingStepValueRef.current[control.id];
            delete stepTimeoutsRef.current[control.id];
        }, 150);
    };

    const handleResetAll = () => {
        if (currentPresetData?.id) {
            loadPresetMutation.mutate(currentPresetData.id);
            // Clear pending values so they don't override the fresh fetch
            setPendingValues({});
        } else {
            // No preset loaded — just re-read current hardware state
            setPendingValues({});
            fetchControlValues();
        }
    };

    const handleMuteToggle = (control: Control) => {
        const muteId = control.id;
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
            <div key={control.id} className="flex flex-col items-center h-full w-32 shrink-0 select-none border-r border-white/5 relative last:border-r-0 pb-10">
                {/* Channel Label */}
                <div className="h-16 flex items-center justify-center w-full px-2 mt-4 shrink-0">
                    <span className="text-sm font-black text-white uppercase tracking-[0.2em] text-center line-clamp-2 leading-relaxed">
                        {control.name}
                    </span>
                </div>

                {/* Fader Track Container */}
                <div className="flex-1 w-full relative flex flex-col items-center group px-4 my-6">
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
                        className="absolute w-12 h-20 z-20 pointer-events-none transition-all duration-75 flex flex-col items-center justify-center translate-y-1/2"
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

                    <div
                        className="absolute inset-y-0 inset-x-0 z-30 cursor-pointer"
                        style={{ touchAction: 'none' }}
                        onPointerDown={(e) => handleFaderPointerDown(e, control)}
                        onPointerMove={(e) => handleFaderPointerMove(e, control)}
                        onPointerUp={(e) => handleFaderPointerUp(e, control)}
                        onPointerCancel={(e) => handleFaderPointerUp(e, control)}
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
                    <h3 className="text-lg font-black text-white uppercase tracking-widest truncate mr-2">{control.name}</h3>
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

                <div className="flex items-center gap-4 min-h-[44px]">
                    <input
                        type="range"
                        min={control.min || -96}
                        max={control.max || 12}
                        step={control.step || 0.1}
                        value={val}
                        onInput={(e) => handleVolumeChange(control.id, parseFloat((e.target as HTMLInputElement).value))}
                        onChange={(e) => handleVolumeChange(control.id, parseFloat(e.target.value))}
                        onMouseUp={(e) => handleVolumeRelease(control, parseFloat((e.target as HTMLInputElement).value))}
                        onTouchEnd={(e) => handleVolumeRelease(control, parseFloat((e.target as HTMLInputElement).value))}
                        className="flex-1 h-3 bg-black rounded-full appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-7 [&::-webkit-slider-thumb]:h-7 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-blue-500 [&::-webkit-slider-thumb]:border-2 [&::-webkit-slider-thumb]:border-white/30 [&::-webkit-slider-thumb]:shadow-lg [&::-moz-range-thumb]:w-7 [&::-moz-range-thumb]:h-7 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:bg-blue-500 [&::-moz-range-thumb]:border-2 [&::-moz-range-thumb]:border-white/30"
                        style={{
                            accentColor: highlightColor,
                            touchAction: 'none',
                            ['--tw-slider-thumb-bg' as any]: highlightColor
                        }}
                    />
                    <div className="w-16 text-right font-mono font-bold text-white/60">
                        {val.toFixed(1)}
                    </div>
                </div>
            </div>
        );
    };

    const isTablet = useIsTablet();

    // ============================================
    // RENDER MOBILE VIEW
    // ============================================
    if (!isTablet) {
        return (
            <div
                className="fixed inset-0 flex flex-col overflow-hidden text-white font-sans"
                style={{ backgroundColor }}
            >
                {/* Header */}
                <div className="shrink-0 px-4 pt-4 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <Sliders className="w-5 h-5 text-blue-400" />
                        <h1 className="text-lg font-black uppercase tracking-[0.2em]">Controlli</h1>
                    </div>
                </div>

                {/* Utility Bar */}
                <div className="shrink-0 px-4 pb-3 flex items-center gap-2">
                    <button
                        onClick={handleResetAll}
                        className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 active:bg-white/10"
                    >
                        <RefreshCw size={18} />
                    </button>
                    <button
                        onClick={() => { setSelectedPresetToSave(currentPresetData?.id || null); setSaveModalOpen(true); }}
                        className="p-2 bg-white/5 border border-white/10 rounded-xl text-white/50 active:bg-white/10"
                    >
                        <Save size={18} />
                    </button>
                    <div className="flex-1" />
                    <div className="h-9 flex items-center bg-[#111113] border border-white/10 rounded-xl px-3 gap-2">
                        <span className="text-[8px] font-black text-white/20 uppercase tracking-widest">Step</span>
                        <select
                            value={defaultVolStep}
                            onChange={(e) => setDefaultVolStep(parseFloat(e.target.value))}
                            className="bg-transparent border-none text-blue-400 font-bold text-xs outline-none cursor-pointer"
                        >
                            <option value="0.1" className="bg-[#1a1a1c]">0.1</option>
                            <option value="0.2" className="bg-[#1a1a1c]">0.2</option>
                            <option value="0.5" className="bg-[#1a1a1c]">0.5</option>
                            <option value="1" className="bg-[#1a1a1c]">1.0</option>
                        </select>
                    </div>
                </div>

                {/* Channel Cards */}
                <div className="flex-1 overflow-y-auto px-4 pb-6 space-y-2">
                    {isLoading && (
                        <div className="flex-1 flex items-center justify-center py-12">
                            <div className="w-10 h-10 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin" />
                        </div>
                    )}
                    {controls.map((control) => {
                        const val = control.id in pendingValues ? pendingValues[control.id] : controlValues[control.id]?.volume ?? 0;
                        const isMuted = controlValues[control.id]?.mute ?? false;
                        const min = control.min || -96;
                        const max = control.max || 12;

                        return (
                            <div key={control.id} className="bg-[#111113] border border-white/5 rounded-xl p-3 flex items-center gap-3">
                                {/* Mute button */}
                                <button
                                    onClick={() => handleMuteToggle(control)}
                                    className={`shrink-0 w-9 h-9 rounded-lg flex items-center justify-center border transition-all active:scale-95 ${isMuted
                                        ? 'bg-red-500/20 border-red-500/30 text-red-400'
                                        : 'bg-white/5 border-white/10 text-white/40'
                                        }`}
                                >
                                    {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
                                </button>

                                {/* Name + Slider */}
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between mb-1">
                                        <span className="text-[10px] font-black uppercase tracking-wider text-white/40 truncate">{control.name}</span>
                                        <span className="text-xs font-mono font-bold text-white/50 shrink-0 ml-2">{val.toFixed(1)} dB</span>
                                    </div>
                                    <input
                                        type="range"
                                        min={min}
                                        max={max}
                                        step={control.step || 0.5}
                                        value={val}
                                        onChange={(e) => {
                                            const newVal = parseFloat(e.target.value);
                                            setPendingValues(prev => ({ ...prev, [control.id]: newVal }));
                                            setControlValues(prev => ({
                                                ...prev,
                                                [control.id]: { ...prev[control.id], volume: newVal }
                                            }));
                                        }}
                                        onMouseUp={(e) => {
                                            const v = parseFloat((e.target as HTMLInputElement).value);
                                            handleVolumeRelease(control, v);
                                            setPendingValues(prev => { const n = { ...prev }; delete n[control.id]; return n; });
                                        }}
                                        onTouchEnd={(e) => {
                                            const v = parseFloat((e.target as HTMLInputElement).value);
                                            handleVolumeRelease(control, v);
                                            setPendingValues(prev => { const n = { ...prev }; delete n[control.id]; return n; });
                                        }}
                                        className="w-full h-1 bg-white/10 rounded-full appearance-none cursor-pointer"
                                        style={{ accentColor: highlightColor }}
                                    />
                                </div>

                                {/* Step buttons */}
                                <div className="shrink-0 flex flex-col gap-1">
                                    <button
                                        onClick={() => handleStepVolume(control, 'up')}
                                        className="w-7 h-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 active:bg-white/20"
                                    >
                                        <Plus size={12} />
                                    </button>
                                    <button
                                        onClick={() => handleStepVolume(control, 'down')}
                                        className="w-7 h-7 bg-white/5 border border-white/10 rounded-lg flex items-center justify-center text-white/40 active:bg-white/20"
                                    >
                                        <Minus size={12} />
                                    </button>
                                </div>
                            </div>
                        );
                    })}
                </div>

                {/* Save Preset Modal (reused) */}
                {saveModalOpen && (
                    <div className="fixed inset-0 z-[200] flex items-end justify-center">
                        <div className="absolute inset-0 bg-black/60 backdrop-blur-md" onClick={() => setSaveModalOpen(false)} />
                        <div className="relative bg-[#1a1a1a] border-t border-white/10 p-6 rounded-t-[2rem] w-full shadow-2xl pb-8">
                            <button onClick={() => setSaveModalOpen(false)} className="absolute top-4 right-4 text-white/30"><X size={24} /></button>
                            {saveSuccess ? (
                                <div className="flex flex-col items-center py-8">
                                    <div className="w-14 h-14 bg-green-500/20 rounded-full flex items-center justify-center mb-3"><Check size={28} className="text-green-400" /></div>
                                    <h3 className="text-lg font-bold text-green-400">Preset Salvato!</h3>
                                </div>
                            ) : (
                                <>
                                    <h3 className="text-lg font-bold mb-4">Salva su Preset</h3>
                                    <p className="text-sm text-white/40 mb-3">Seleziona il preset su cui sovrascrivere:</p>
                                    <div className="space-y-2 max-h-48 overflow-y-auto mb-4">
                                        {presetsData?.presets?.map((preset) => (
                                            <button
                                                key={preset.id}
                                                onClick={() => setSelectedPresetToSave(preset.id)}
                                                className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedPresetToSave === preset.id
                                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                                    : 'border-white/5 bg-white/5 text-white/60'
                                                    } ${currentPresetData?.id === preset.id ? 'ring-1 ring-blue-400/30' : ''}`}
                                            >
                                                <span className="font-semibold">{preset.name || preset.id}</span>
                                                {currentPresetData?.id === preset.id && <span className="ml-2 text-xs text-blue-400 font-bold">(attivo)</span>}
                                            </button>
                                        ))}
                                    </div>
                                    <button
                                        onClick={() => selectedPresetToSave && savePresetMutation.mutate(selectedPresetToSave)}
                                        disabled={!selectedPresetToSave || savePresetMutation.isPending}
                                        className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                                    >
                                        {savePresetMutation.isPending ? 'Salvataggio...' : 'Conferma Salvataggio'}
                                    </button>
                                </>
                            )}
                        </div>
                    </div>
                )}
            </div>
        );
    }

    // ============================================
    // RENDER TABLET VIEW
    // ============================================
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
            <div className="mt-20 h-20 px-8 flex items-center justify-between border-b border-white/5 bg-black/5 backdrop-blur-2xl shrink-0 z-50">
                <div className="flex items-center gap-4">
                    <button
                        onClick={handleResetAll}
                        className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-95 transition-all"
                    >
                        <RefreshCw size={24} />
                    </button>
                    <button
                        onClick={() => {
                            setSelectedPresetToSave(currentPresetData?.id || null);
                            setSaveModalOpen(true);
                        }}
                        className="w-12 h-12 bg-blue-600/20 border border-blue-500/30 rounded-xl flex items-center justify-center text-blue-400 shadow-[0_0_20px_rgba(59,130,246,0.1)] active:scale-95 transition-all"
                    >
                        <Save size={24} />
                    </button>

                    <div className="h-12 flex items-center bg-black/40 border border-white/10 rounded-xl px-4 gap-3 shadow-inner">
                        <span className="text-[10px] font-black text-white/30 uppercase tracking-widest whitespace-nowrap">Step Volume</span>
                        <select
                            value={defaultVolStep}
                            onChange={(e) => setDefaultVolStep(parseFloat(e.target.value))}
                            className="bg-transparent border-none text-blue-400 font-bold text-sm outline-none cursor-pointer hover:text-white transition-colors"
                        >
                            <option value="0.1" className="bg-[#1a1a1c]">0.1 dB</option>
                            <option value="0.2" className="bg-[#1a1a1c]">0.2 dB</option>
                            <option value="0.5" className="bg-[#1a1a1c]">0.5 dB</option>
                            <option value="1" className="bg-[#1a1a1c]">1.0 dB</option>
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
                            style={{ touchAction: 'pan-x' }}
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
            {/* Save Preset Modal */}
            {saveModalOpen && (
                <div className="fixed inset-0 z-[200] flex items-center justify-center p-8">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-xl" onClick={() => setSaveModalOpen(false)} />
                    <div className="relative bg-[#1a1a1a] border border-white/10 p-8 rounded-[2rem] max-w-md w-full shadow-2xl">
                        <button
                            onClick={() => setSaveModalOpen(false)}
                            className="absolute top-6 right-6 text-white/30 hover:text-white transition-colors"
                        >
                            <X size={24} />
                        </button>

                        {saveSuccess ? (
                            <div className="flex flex-col items-center py-8">
                                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mb-4">
                                    <Check size={32} className="text-green-400" />
                                </div>
                                <h3 className="text-xl font-bold text-green-400">Preset Salvato!</h3>
                            </div>
                        ) : (
                            <>
                                <h3 className="text-xl font-bold mb-6 text-white">Salva su Preset</h3>
                                <p className="text-sm text-white/40 mb-4">Seleziona il preset su cui sovrascrivere la configurazione corrente:</p>
                                <div className="space-y-2 max-h-64 overflow-y-auto mb-6">
                                    {presetsData?.presets?.map((preset) => (
                                        <button
                                            key={preset.id}
                                            onClick={() => setSelectedPresetToSave(preset.id)}
                                            className={`w-full text-left px-4 py-3 rounded-xl border transition-all ${selectedPresetToSave === preset.id
                                                    ? 'border-blue-500 bg-blue-500/10 text-white'
                                                    : 'border-white/5 bg-white/5 text-white/60 hover:bg-white/10'
                                                } ${currentPresetData?.id === preset.id ? 'ring-1 ring-blue-400/30' : ''}`}
                                        >
                                            <span className="font-semibold">{preset.name || preset.id}</span>
                                            {currentPresetData?.id === preset.id && (
                                                <span className="ml-2 text-xs text-blue-400 font-bold">(attivo)</span>
                                            )}
                                        </button>
                                    ))}
                                </div>
                                <button
                                    onClick={() => selectedPresetToSave && savePresetMutation.mutate(selectedPresetToSave)}
                                    disabled={!selectedPresetToSave || savePresetMutation.isPending}
                                    className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:bg-white/5 disabled:text-white/20 rounded-xl font-bold transition-all active:scale-[0.98]"
                                >
                                    {savePresetMutation.isPending ? 'Salvataggio...' : 'Conferma Salvataggio'}
                                </button>
                                {savePresetMutation.isError && (
                                    <p className="text-red-400 text-sm mt-3 text-center">Errore nel salvataggio. Riprova.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};
