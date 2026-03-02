import React from 'react';
import { useSettings } from '../context/SettingsContext';
import { Card } from '../components/ui/Card';
import { Palette, Sun, Check, Settings as SettingsIcon, Sliders, Music, LayoutGrid, Power } from 'lucide-react';
import { useIsTablet } from '../hooks/useIsTablet';

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

const FADE_OPTIONS = [0, 1, 2, 3, 4, 5];

const STANDBY_TIMEOUT_OPTIONS = [
    { label: 'Disabilitato', value: 0 },
    { label: '5 min', value: 5 },
    { label: '10 min', value: 10 },
    { label: '15 min', value: 15 },
    { label: '30 min', value: 30 },
];

const VOL_STEP_OPTIONS = [
    { label: '0.1 dB', value: 0.1 },
    { label: '0.2 dB', value: 0.2 },
    { label: '0.5 dB', value: 0.5 },
    { label: '1 dB', value: 1 },
];

export const Settings: React.FC = () => {
    const {
        backgroundColor, setBackgroundColor,
        highlightColor, setHighlightColor,
        backlightLevel, setBacklightLevel,
        defaultFade, setDefaultFade,
        defaultVolStep, setDefaultVolStep,
        defaultControlsView, setDefaultControlsView,
        standbyTimeout, setStandbyTimeout,
    } = useSettings();

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
                <div className="shrink-0 px-5 pt-5 pb-3">
                    <div className="flex items-center gap-3 mb-1">
                        <SettingsIcon className="w-5 h-5 text-blue-400" />
                        <h1 className="text-lg font-black uppercase tracking-[0.2em]">Impostazioni</h1>
                    </div>
                    <div className="w-full h-px bg-gradient-to-r from-blue-500/50 via-transparent to-transparent" />
                </div>

                {/* Scrollable Settings */}
                <div className="flex-1 overflow-y-auto px-4 pb-8 space-y-4">

                    {/* Background Color */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Palette size={16} className="text-white/40" />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Colore Sfondo</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            {BG_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setBackgroundColor(preset.value)}
                                    className={`flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${
                                        backgroundColor === preset.value
                                            ? 'border-white/20 bg-white/10'
                                            : 'border-white/5 bg-white/3 opacity-50'
                                    }`}
                                >
                                    <div className="w-6 h-6 rounded-full border border-white/20 shrink-0" style={{ backgroundColor: preset.value }} />
                                    <span className={`text-[9px] font-black uppercase tracking-wider ${backgroundColor === preset.value ? 'text-white' : 'text-white/30'}`}>
                                        {preset.label}
                                    </span>
                                    {backgroundColor === preset.value && <Check className="w-3.5 h-3.5 text-white ml-auto" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Highlight Color */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <div className="w-4 h-4 rounded-full border border-white/30" style={{ backgroundColor: highlightColor }} />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Colore Highlight</span>
                        </div>
                        <div className="space-y-1.5">
                            {HIGHLIGHT_PRESETS.map((preset) => (
                                <button
                                    key={preset.value}
                                    onClick={() => setHighlightColor(preset.value)}
                                    className={`w-full flex items-center gap-3 p-3 rounded-xl border transition-all active:scale-95 ${
                                        highlightColor === preset.value
                                            ? 'border-white/15 bg-white/8'
                                            : 'border-white/5 opacity-40'
                                    }`}
                                >
                                    <div className="w-5 h-5 rounded-full border border-white/20" style={{ backgroundColor: preset.value }} />
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${highlightColor === preset.value ? 'text-white' : 'text-white/30'}`}>
                                        {preset.label}
                                    </span>
                                    {highlightColor === preset.value && (
                                        <div className="w-2.5 h-2.5 rounded-full ml-auto" style={{ backgroundColor: highlightColor, boxShadow: `0 0 8px 2px ${highlightColor}` }} />
                                    )}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Backlight */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Sun size={16} className="text-white/40" />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Retroilluminazione</span>
                            <span className="ml-auto text-lg font-black text-white/80">{backlightLevel}%</span>
                        </div>
                        <input
                            type="range"
                            min="10"
                            max="100"
                            value={backlightLevel}
                            onChange={(e) => setBacklightLevel(parseInt(e.target.value))}
                            className="w-full h-2 bg-black/40 rounded-full appearance-none cursor-pointer border border-white/5"
                            style={{
                                backgroundImage: `linear-gradient(to right, ${highlightColor} 0%, ${highlightColor} ${backlightLevel}%, transparent ${backlightLevel}%, transparent 100%)`
                            }}
                        />
                        <div className="flex justify-between">
                            {[10, 25, 50, 75, 100].map(val => (
                                <button
                                    key={val}
                                    onClick={() => setBacklightLevel(val)}
                                    className={`text-[9px] font-black uppercase tracking-widest px-2 py-1 rounded-lg transition-colors ${backlightLevel === val ? 'text-white bg-white/10' : 'text-white/20'}`}
                                >
                                    {val}%
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Default Fade */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Music size={16} className="text-white/40" />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Fade Predefinito</span>
                            <span className="ml-auto text-lg font-black text-white/80">{defaultFade}s</span>
                        </div>
                        <div className="grid grid-cols-6 gap-1.5">
                            {FADE_OPTIONS.map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setDefaultFade(val)}
                                    className={`h-10 rounded-xl font-black text-sm transition-all border active:scale-95 ${
                                        defaultFade === val
                                            ? 'border-white/20 text-white'
                                            : 'border-white/5 bg-white/5 text-white/30'
                                    }`}
                                    style={defaultFade === val ? { backgroundColor: highlightColor } : {}}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Vol Step */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Sliders size={16} className="text-white/40" />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Step Volume</span>
                        </div>
                        <div className="grid grid-cols-4 gap-1.5">
                            {VOL_STEP_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setDefaultVolStep(opt.value)}
                                    className={`h-10 rounded-xl font-black text-xs transition-all border active:scale-95 ${
                                        defaultVolStep === opt.value
                                            ? 'border-white/20 text-white'
                                            : 'border-white/5 bg-white/5 text-white/30'
                                    }`}
                                    style={defaultVolStep === opt.value ? { backgroundColor: highlightColor } : {}}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Auto-Standby */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <Power size={16} className="text-white/40" />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Auto-Standby</span>
                        </div>
                        <div className="space-y-1.5">
                            {STANDBY_TIMEOUT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStandbyTimeout(opt.value)}
                                    className={`w-full flex items-center justify-between p-3 rounded-xl border transition-all active:scale-95 ${
                                        standbyTimeout === opt.value
                                            ? 'border-white/20 text-white'
                                            : 'border-white/5 bg-white/5 text-white/30'
                                    }`}
                                    style={standbyTimeout === opt.value ? { backgroundColor: highlightColor } : {}}
                                >
                                    <span className="font-black text-xs uppercase tracking-wider">{opt.label}</span>
                                    {standbyTimeout === opt.value && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Controls View */}
                    <div className="bg-[#111113] border border-white/5 rounded-xl p-4 space-y-3">
                        <div className="flex items-center gap-3">
                            <LayoutGrid size={16} className="text-white/40" />
                            <span className="text-xs font-black uppercase tracking-wider text-white/60">Vista Controlli</span>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => setDefaultControlsView('mixer')}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 active:scale-95 ${
                                    defaultControlsView === 'mixer'
                                        ? 'border-white/20 bg-white/10'
                                        : 'border-white/5 bg-white/5 opacity-40'
                                }`}
                            >
                                <div className="flex gap-1 h-8">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-2.5 rounded-full ${defaultControlsView === 'mixer' ? 'bg-white/40' : 'bg-white/15'}`} />
                                    ))}
                                </div>
                                <span className={`font-black uppercase tracking-widest text-[10px] ${defaultControlsView === 'mixer' ? 'text-white' : 'text-white/30'}`}>Mixer</span>
                            </button>
                            <button
                                onClick={() => setDefaultControlsView('compact')}
                                className={`p-4 rounded-xl border transition-all flex flex-col items-center gap-2 active:scale-95 ${
                                    defaultControlsView === 'compact'
                                        ? 'border-white/20 bg-white/10'
                                        : 'border-white/5 bg-white/5 opacity-40'
                                }`}
                            >
                                <div className="flex flex-col gap-1 h-8 justify-center">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-10 h-2 rounded-full ${defaultControlsView === 'compact' ? 'bg-white/40' : 'bg-white/15'}`} />
                                    ))}
                                </div>
                                <span className={`font-black uppercase tracking-widest text-[10px] ${defaultControlsView === 'compact' ? 'text-white' : 'text-white/30'}`}>Compact</span>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // ============================================
    // RENDER TABLET VIEW
    // ============================================
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

            <div className="mt-28 h-4 shrink-0" />

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

                    {/* Default Fade */}
                    <Card className="p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <Music className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Fade Predefinito</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Transizione brani nel player</p>
                            </div>
                            <div className="ml-auto">
                                <span className="text-3xl font-black italic tracking-tighter text-white/90">{defaultFade}s</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-4 gap-2">
                            {FADE_OPTIONS.map((val) => (
                                <button
                                    key={val}
                                    onClick={() => setDefaultFade(val)}
                                    className={`
                                        h-12 rounded-2xl font-black text-sm transition-all duration-200 border-t border-x border-b-4
                                        active:translate-y-0.5 active:border-b-0
                                        ${defaultFade === val
                                            ? 'border-t-white/20 border-x-white/10 border-b-black text-white'
                                            : 'border-t-white/5 border-x-white/2 border-b-black bg-white/5 hover:bg-white/10 text-white/40'}
                                    `}
                                    style={defaultFade === val ? { backgroundColor: highlightColor } : {}}
                                >
                                    {val}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Default Step Volume */}
                    <Card className="p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <Sliders className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Step Volume</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Incremento pulsanti +/- nei controlli</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {VOL_STEP_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setDefaultVolStep(opt.value)}
                                    className={`
                                        relative p-4 rounded-2xl transition-all duration-200 border-t border-x border-b-4
                                        active:translate-y-0.5 active:border-b-0
                                        flex items-center justify-between
                                        ${defaultVolStep === opt.value
                                            ? 'border-t-white/20 border-x-white/10 border-b-black text-white'
                                            : 'border-t-white/5 border-x-white/2 border-b-black bg-white/5 hover:bg-white/10 text-white/40'}
                                    `}
                                    style={defaultVolStep === opt.value ? { backgroundColor: highlightColor } : {}}
                                >
                                    <span className="font-black text-sm uppercase tracking-wider">{opt.label}</span>
                                    {defaultVolStep === opt.value && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Auto-Standby */}
                    <Card className="p-8 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <Power className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Auto-Standby</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Schermo si spegne dopo inattività</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-2">
                            {STANDBY_TIMEOUT_OPTIONS.map((opt) => (
                                <button
                                    key={opt.value}
                                    onClick={() => setStandbyTimeout(opt.value)}
                                    className={`
                                        relative p-4 rounded-2xl transition-all duration-200 border-t border-x border-b-4
                                        active:translate-y-0.5 active:border-b-0
                                        flex items-center justify-between
                                        ${standbyTimeout === opt.value
                                            ? 'border-t-white/20 border-x-white/10 border-b-black text-white'
                                            : 'border-t-white/5 border-x-white/2 border-b-black bg-white/5 hover:bg-white/10 text-white/40'}
                                    `}
                                    style={standbyTimeout === opt.value ? { backgroundColor: highlightColor } : {}}
                                >
                                    <span className="font-black text-sm uppercase tracking-wider">{opt.label}</span>
                                    {standbyTimeout === opt.value && <Check className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </Card>

                    {/* Default Controls View */}
                    <Card className="p-8 md:col-span-2 space-y-6">
                        <div className="flex items-center gap-4 mb-4">
                            <div className="p-3 bg-white/5 rounded-2xl border border-white/10 shadow-xl text-white">
                                <LayoutGrid className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-xl font-black uppercase tracking-tight text-white/90">Vista Controlli</h2>
                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20">Tab predefinito nella pagina Controlli</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <button
                                onClick={() => setDefaultControlsView('mixer')}
                                className={`
                                    p-6 rounded-3xl transition-all duration-300 border-t-2 border-x border-b-[6px]
                                    active:translate-y-1 active:border-b-[1px]
                                    flex flex-col items-center gap-3
                                    ${defaultControlsView === 'mixer'
                                        ? 'border-t-white/30 border-x-white/15 border-b-black bg-[#2a2a2e]'
                                        : 'border-t-white/5 border-x-white/2 border-b-black bg-white/5 hover:bg-white/10 opacity-50'}
                                `}
                            >
                                <div className="flex gap-1.5 h-12">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-3 rounded-full ${defaultControlsView === 'mixer' ? 'bg-white/40' : 'bg-white/15'}`} />
                                    ))}
                                </div>
                                <span className={`font-black uppercase tracking-widest text-xs ${defaultControlsView === 'mixer' ? 'text-white' : 'text-white/30'}`}>Mixer</span>
                                {defaultControlsView === 'mixer' && <Check className="w-5 h-5 text-white" />}
                            </button>
                            <button
                                onClick={() => setDefaultControlsView('compact')}
                                className={`
                                    p-6 rounded-3xl transition-all duration-300 border-t-2 border-x border-b-[6px]
                                    active:translate-y-1 active:border-b-[1px]
                                    flex flex-col items-center gap-3
                                    ${defaultControlsView === 'compact'
                                        ? 'border-t-white/30 border-x-white/15 border-b-black bg-[#2a2a2e]'
                                        : 'border-t-white/5 border-x-white/2 border-b-black bg-white/5 hover:bg-white/10 opacity-50'}
                                `}
                            >
                                <div className="flex flex-col gap-1.5 h-12 justify-center">
                                    {[1, 2, 3].map(i => (
                                        <div key={i} className={`w-12 h-2.5 rounded-full ${defaultControlsView === 'compact' ? 'bg-white/40' : 'bg-white/15'}`} />
                                    ))}
                                </div>
                                <span className={`font-black uppercase tracking-widest text-xs ${defaultControlsView === 'compact' ? 'text-white' : 'text-white/30'}`}>Compact</span>
                                {defaultControlsView === 'compact' && <Check className="w-5 h-5 text-white" />}
                            </button>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};
