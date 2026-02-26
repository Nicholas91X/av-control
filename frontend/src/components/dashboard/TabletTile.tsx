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
    // Sizes use `vh` so that portrait mode (tall viewport → large vh) gets bigger tiles
    // than landscape mode (short viewport → small vh). In landscape vh = vmin, so
    // landscape behaviour is unchanged. Portrait tiles grow proportionally with height.
    const sizeClasses = {
        small: 'w-[clamp(7rem,15vh,11rem)] h-[clamp(7rem,15vh,11rem)]',
        large: 'w-[clamp(9rem,20vh,14rem)] h-[clamp(9rem,20vh,14rem)]',
        xl:    'w-[clamp(12rem,26vh,18rem)] h-[clamp(12rem,26vh,18rem)]',
    };

    const iconSize = {
        small: 'clamp(1.8rem, 6vh,   3.5rem)',
        large: 'clamp(2.2rem, 8.5vh, 5rem)',
        xl:    'clamp(3rem,   11vh,  6.5rem)',
    };

    return (
        // The button's bounding box = circle only (no label in flow).
        // This ensures translate(-50%,-50%) on the orbit wrapper centers
        // the CIRCLE — not circle+label — on the orbit point.
        <button
            onClick={onClick}
            className={`
                relative group flex-shrink-0 active:translate-y-2 transition-transform duration-200
                ${sizeClasses[size as keyof typeof sizeClasses]}
                ${className}
            `}
        >
            {/* Circle — fills the button's square bounding box */}
            <div
                className="absolute inset-0 rounded-full overflow-hidden
                    bg-[#2a2a2e] border-t-2 border-t-white/20 border-x border-x-white/10
                    border-b-[14px] border-b-[#111114] group-active:border-b-[4px]
                    transition-[border] duration-200"
                style={{
                    boxShadow: glowColor
                        ? `0 0 40px ${glowColor}33, 0 20px 50px rgba(0,0,0,0.9)`
                        : '0 20px 50px rgba(0,0,0,0.9)',
                }}
            >
                {/* Tap colour flash */}
                <div
                    className="absolute inset-0 opacity-0 group-active:opacity-20 transition-opacity duration-300 pointer-events-none"
                    style={{ backgroundColor: glowColor || '#3b82f6' }}
                />
                {/* Glossy top-half sheen */}
                <div className="absolute inset-0 bg-gradient-to-b from-white/10 to-transparent pointer-events-none" />
                {/* Radial colour glow */}
                <div
                    className="absolute inset-0 pointer-events-none opacity-25"
                    style={{ background: `radial-gradient(circle at 50% 35%, ${glowColor || '#ffffff'}55, transparent 65%)` }}
                />

                {/* Icon + Label as a single centred unit — placed LAST so it renders
                    above the absolute overlay divs (tap flash, sheen, glow). */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 px-2
                    group-hover:scale-110 transition-transform duration-300">
                    <Icon
                        size={iconSize[size as keyof typeof iconSize]}
                        style={{ color: glowColor || 'white' }}
                        className={`drop-shadow-lg ${iconClassName}`}
                    />
                    {!hideLabel && (
                        <span className={`
                            whitespace-nowrap uppercase font-bold tracking-widest text-center
                            text-white/60 group-hover:text-white/90 transition-colors duration-300
                            ${size === 'small' ? 'text-[clamp(9px,1.4vh,13px)]' : 'text-[clamp(10px,1.6vh,15px)]'}
                        `}>
                            {label}
                        </span>
                    )}
                </div>
            </div>
        </button>
    );
};
