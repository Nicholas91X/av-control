import React from 'react';
import type { LucideIcon } from 'lucide-react';

interface TabletTileProps {
    icon: LucideIcon;
    label: string;
    onClick?: () => void;
    size?: 'small' | 'large' | 'xl';
    color?: string;
    glowColor?: string;
    className?: string;
    iconClassName?: string;
    hideLabel?: boolean;
}

export const TabletTile: React.FC<TabletTileProps> = ({
    icon: Icon,
    label,
    onClick,
    size = 'small',
    glowColor,
    className = '',
    iconClassName = '',
    hideLabel = false,
}) => {
    const sizeClasses = {
        small: 'w-[clamp(8rem,15vw,10rem)] h-[clamp(8rem,15vw,10rem)]',
        large: 'w-[clamp(12rem,22vw,16rem)] h-[clamp(12rem,22vw,16rem)]',
        xl: 'w-[clamp(16rem,30vw,20rem)] h-[clamp(16rem,30vw,20rem)]',
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative flex flex-col items-center justify-center rounded-2xl transition-all duration-500 ease-out
                hover:scale-105 active:scale-95
                bg-[#1a1a1a] border border-white/10
                group overflow-hidden shadow-2xl
                ${sizeClasses[size as keyof typeof sizeClasses]}
                ${className}
                active:shadow-inner
            `}
            style={{
                boxShadow: glowColor ? `0 0 30px ${glowColor}22, inset 0 0 10px rgba(255,255,255,0.05)` : 'inset 0 0 10px rgba(255,255,255,0.05)',
                backgroundColor: undefined // Will be overridden by tailwind or hover if needed
            }}
        >
            {/* Tap Background Overlay */}
            <div
                className="absolute inset-0 opacity-0 active:opacity-20 transition-opacity duration-300 pointer-events-none"
                style={{ backgroundColor: glowColor || '#3b82f6' }}
            />
            {/* Background Grain/Texture (Simulated) */}
            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-repeat"
                style={{ backgroundImage: 'url("https://www.transparenttextures.com/patterns/dark-matter.png")' }} />

            {/* Glossy Overlay */}
            <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />

            <div className={`
                flex items-center justify-center rounded-xl mb-2 md:mb-3 
                ${size === 'small' ? 'p-2 md:p-3' : 'p-4 md:p-6'}
                group-hover:scale-110 transition-transform duration-300
                ${iconClassName}
            `}>
                <Icon
                    size={size === 'small' ? 'clamp(2rem, 6vw, 2.5rem)' : size === 'large' ? 'clamp(3rem, 10vw, 5rem)' : 'clamp(4rem, 15vw, 6rem)'}
                    style={{ color: glowColor || 'white' }}
                    className="drop-shadow-lg"
                />
            </div>

            {!hideLabel && (
                <span className={`
                    uppercase font-bold tracking-widest text-white/80 transition-colors duration-300 group-hover:text-white
                    ${size === 'small' ? 'text-[clamp(8px,1.5vw,10px)]' : 'text-[clamp(10px,2vw,12px)]'}
                `}>
                    {label}
                </span>
            )}

            {/* Subtle bottom border highlight */}
            <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
};
