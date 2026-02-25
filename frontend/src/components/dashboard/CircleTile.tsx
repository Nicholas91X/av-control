import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface CircleTileProps {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    size?: 'small' | 'large';
    color?: string;
    glowColor?: string;
    className?: string;
    iconClassName?: string;
    hideLabel?: boolean;
}

export const CircleTile: React.FC<CircleTileProps> = ({
    icon: Icon,
    label,
    onClick,
    size = 'small',
    glowColor,
    className = '',
    iconClassName = '',
    hideLabel = false,
}) => {
    // The sizes here will determine the diameter of the circular button
    const sizeClasses = {
        small: 'w-[clamp(4.5rem,15vw,6rem)] h-[clamp(4.5rem,15vw,6rem)]', // For the surrounding buttons
        large: 'w-[clamp(7rem,25vw,10rem)] h-[clamp(7rem,25vw,10rem)]', // For the central button
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center rounded-full transition-all duration-200 ease-out
                bg-[#2a2a2e] border-t-2 border-t-white/20 border-x border-x-white/10 border-b-[8px] border-b-[#111114] shadow-[0_20px_40px_rgba(0,0,0,1)]
                active:translate-y-2 active:border-b-[4px]
                group overflow-hidden
                ${sizeClasses[size as keyof typeof sizeClasses]}
                ${className}
            `}
            style={{
                boxShadow: glowColor ? `0 0 25px ${glowColor}25, inset 0 0 10px rgba(181, 64, 64, 0.05)` : 'inset 0 0 10px rgba(255,255,255,0.05)',
                backgroundColor: undefined // Will be overridden by tailwind or hover if needed
            }}
        >
            {/* Tap Background Overlay */}
            <div
                className="absolute inset-0 opacity-0 active:opacity-20 transition-opacity duration-300 pointer-events-none rounded-full"
                style={{ backgroundColor: glowColor || '#3b82f6' }}
            />
            {/* Background Grain/Texture (Simulated) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat rounded-full"
                style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-matter.png")' }} />

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none rounded-full" />

            <div className={`
                flex items-center justify-center rounded-full mb-1
                group-hover:scale-110 transition-transform duration-300
                ${iconClassName}
            `}>
                <Icon
                    size={size === 'small' ? 'clamp(1.5rem, 5vw, 2rem)' : 'clamp(2.5rem, 8vw, 3.5rem)'}
                    style={{ color: glowColor || 'white' }}
                    className="drop-shadow-lg"
                />
            </div>

            {!hideLabel && (
                <span className={`
                    uppercase font-bold text-center tracking-widest text-white/80 transition-colors duration-300 group-hover:text-white
                    ${size === 'small' ? 'text-[clamp(8px,2.5vw,10px)]' : 'text-[clamp(10px,3vw,12px)]'}
                `}>
                    {label}
                </span>
            )}

            {/* Subtle bottom border highlight */}
            <div className="absolute bottom-4 left-1/4 right-1/4 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity rounded-full" />
        </button>
    );
};
