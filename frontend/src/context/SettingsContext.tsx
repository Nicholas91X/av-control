import React, { createContext, useContext, useState, useEffect } from 'react';

interface SettingsContextType {
    backgroundColor: string;
    highlightColor: string;
    backlightLevel: number;
    isDark: boolean;
    setBackgroundColor: (color: string) => void;
    setHighlightColor: (color: string) => void;
    setBacklightLevel: (level: number) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
};

export const SettingsProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [backgroundColor, setBackgroundColor] = useState(() => localStorage.getItem('bg_color') || '#000000');
    const [highlightColor, setHighlightColor] = useState(() => localStorage.getItem('highlight_color') || '#3b82f6');
    const [backlightLevel, setBacklightLevel] = useState(() => Number(localStorage.getItem('backlight_level')) || 100);

    const isDark = React.useMemo(() => {
        const hex = backgroundColor.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
        return luminance < 0.5;
    }, [backgroundColor]);

    useEffect(() => {
        localStorage.setItem('bg_color', backgroundColor);
        localStorage.setItem('highlight_color', highlightColor);
        localStorage.setItem('backlight_level', backlightLevel.toString());

        // Update CSS variables
        document.documentElement.style.setProperty('--app-bg', backgroundColor);
        document.documentElement.style.setProperty('--app-highlight', highlightColor);

        // Update dark mode class
        if (isDark) {
            document.documentElement.classList.add('dark');
            document.documentElement.classList.remove('light');
        } else {
            document.documentElement.classList.remove('dark');
            document.documentElement.classList.add('light');
        }

        // Handle backlight (fake overlay)
        const overlay = document.getElementById('backlight-overlay');
        if (overlay) {
            overlay.style.opacity = (1 - backlightLevel / 100).toString();
        }
    }, [backgroundColor, highlightColor, backlightLevel, isDark]);

    return (
        <SettingsContext.Provider value={{
            backgroundColor,
            highlightColor,
            backlightLevel,
            isDark,
            setBackgroundColor,
            setHighlightColor,
            setBacklightLevel
        }}>
            {children}
            {/* Fake Backlight Overlay */}
            <div
                id="backlight-overlay"
                className="fixed inset-0 bg-black pointer-events-none z-[9999] transition-opacity duration-300"
                style={{ opacity: 1 - backlightLevel / 100 }}
            />
        </SettingsContext.Provider>
    );
};
