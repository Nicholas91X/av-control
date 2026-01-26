import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Card } from '../components/ui/Card';
import { Palette, Sun, Check, Settings as SettingsIcon } from 'lucide-react';

const BG_PRESETS = [
    { label: 'OLED Black', value: '#000000' },
    { label: 'Deep Charcoal', value: '#0a0a0c' },
    { label: 'Dark Navy', value: '#0a0c14' },
    { label: 'Studio Grey', value: '#121214' },
];

const HIGHLIGHT_PRESETS = [
    { label: 'Classic Blue', value: '#3b82f6' },
    { label: 'Vibrant Green', value: '#22c55e' },
    { label: 'Oto Red', value: '#ef4444' },
    { label: 'Amber Gold', value: '#f59e0b' },
    { label: 'Purple Rain', value: '#a855f7' },
];

export const Settings: React.FC = () => {
    const {
        backgroundColor, setBackgroundColor,
        highlightColor, setHighlightColor,
        backlightLevel, setBacklightLevel
    } = useSettings();

    return (
        <div className="fixed inset-0 flex flex-col overflow-hidden transition-colors duration-500" style={{ backgroundColor }}>
            {/* 1. TOP TITLE ROW */}
            <div className="absolute top-8 inset-x-0 h-16 flex items-center justify-center pointer-events-none z-[60]">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3 mb-1">
                        <SettingsIcon className="w-5 h-5 text-blue-400" />
                        <h2 className="text-2xl font-black text-white uppercase tracking-[0.4em]">
                            Impostazioni
                        </h2>
                    </div>
                    <div className="w-64 h-[2px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.3)]" />
                </div>
            </div>

            <div className="mt-32 h-4 shrink-0" />

            <div className="flex-1 space-y-12 p-6 md:p-16 max-w-6xl mx-auto overflow-y-auto">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-12 mt-12">
                    {/* Background Color Selection */}
                    <Card className="p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <Palette className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Colore Sfondo</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Seleziona la profondità del nero</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {BG_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setBackgroundColor(preset.value)}
                                    className={`
                                        relative p-4 rounded-3xl transition-all duration-300 border-t-2 border-x border-b-[8px]
                                        active:translate-y-1 active:border-b-[2px]
                                        ${backgroundColor === preset.value
                                            ? 'border-t-white/40 border-x-white/20 border-b-black bg-[#2a2a2e]'
                                            : 'border-t-white/10 border-x-white/5 border-b-black bg-white/5 hover:bg-white/10 opacity-60'}
                                    `}
                                >
                                    <div className="flex items-center justify-between">
                                        <div className="w-8 h-8 rounded-full border border-white/20 shadow-inner" style={{ backgroundColor: preset.value }} />
                                        {backgroundColor === preset.value && <Check className="w-5 h-5 text-white" />}
                                    </div>
                                    <p className={`text-[10px] font-black uppercase tracking-widest mt-3 text-left ${backgroundColor === preset.value ? 'text-white' : 'text-white/40'}`}>
                                        {preset.label}
                                    </p>
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Highlight Color Selection */}
                    <Card className="p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <div className="w-6 h-6 rounded-full border-2 border-white/50" style={{ backgroundColor: highlightColor }} />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Colore Highlight</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Pulsanti e icone di stato</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-3">
                            {HIGHLIGHT_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setHighlightColor(preset.value)}
                                    className={`
                                        relative p-4 rounded-[1.5rem] transition-all duration-300 border-t-2 border-x border-b-[6px]
                                        active:translate-y-1 active:border-b-[1px]
                                        flex items-center justify-between gap-4
                                        ${highlightColor === preset.value
                                            ? 'border-t-white/20 border-x-white/10 border-b-black bg-[#252529]'
                                            : 'border-t-white/5 border-x-white/2 border-b-black bg-white/5 hover:bg-white/10 opacity-50'}
                                    `}
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-6 h-6 rounded-full border-2 border-white/20" style={{ backgroundColor: preset.value }} />
                                        <span className={`font-black uppercase tracking-widest text-xs ${highlightColor === preset.value ? 'text-white' : 'text-white/20'}`}>
                                            {preset.label}
                                        </span>
                                    </div>
                                    {highlightColor === preset.value && <div className="w-3 h-3 rounded-full shadow-[0_0_10px_2px]" style={{ backgroundColor: highlightColor, boxShadow: `0 0 10px 2px ${highlightColor}` }} />}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Backlight Level */}
                    <Card className="p-8 md:col-span-2 space-y-8">
                        <div className="flex items-center gap-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <Sun className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Retroilluminazione</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Luminosità pannello OLED</p>
                            </div>
                            <div className="ml-auto">
                                <span className="text-4xl font-black italic tracking-tighter text-white/90">{backlightLevel}%</span>
                            </div>
                        </div>

                        <div className="relative pt-6 pb-12 px-2">
                            <input
                                type="range"
                                min="10"
                                max="100"
                                value={backlightLevel}
                                onChange={(e) => setBacklightLevel(parseInt(e.target.value))}
                                className="w-full h-8 bg-black/40 rounded-full appearance-none cursor-pointer border border-white/5 shadow-inner accent-white transition-all hover:bg-black/60"
                                style={{
                                    backgroundImage: `linear-gradient(to right, ${highlightColor} 0%, ${highlightColor} ${backlightLevel}%, transparent ${backlightLevel}%, transparent 100%)`
                                }}
                            />
                            <div className="flex justify-between mt-4 px-2">
                                {[10, 25, 50, 75, 100].map(val => (
                                    <button
                                        key={val}
                                        onClick={() => setBacklightLevel(val)}
                                        className={`text-[10px] font-black uppercase tracking-widest transition-colors ${backlightLevel === val ? 'text-white' : 'text-white/20 hover:text-white/40'}`}
                                    >
                                        {val}%
                                    </button>
                                ))}
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
