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
    // Sizes use `vmin` so tiles scale with the SHORT side of the viewport in both
    // portrait (vmin = vw) and landscape (vmin = vh). This keeps tiles proportional
    // to the orbit radius which uses min(35vw, 26vh) — the same short-side logic.
    const sizeClasses = {
        small: 'w-[clamp(7rem,15vmin,10.5rem)] h-[clamp(7rem,15vmin,10.5rem)]',
        large: 'w-[clamp(9rem,20vmin,13.5rem)] h-[clamp(9rem,20vmin,13.5rem)]',
        xl:    'w-[clamp(12rem,26vmin,17rem)] h-[clamp(12rem,26vmin,17rem)]',
    };

    const iconSize = {
        small: 'clamp(2rem,   7vmin, 3.2rem)',
        large: 'clamp(2.8rem, 10vmin, 5rem)',
        xl:    'clamp(3.5rem, 13vmin, 6.5rem)',
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

                {/* Icon — centred inside circle */}
                <div className={`
                    absolute inset-0 flex items-center justify-center
                    group-hover:scale-110 transition-transform duration-300
                    ${iconClassName}
                `}>
                    <Icon
                        size={iconSize[size as keyof typeof iconSize]}
                        style={{ color: glowColor || 'white' }}
                        className="drop-shadow-lg"
                    />
                </div>
            </div>

            {/* Label — absolute, below the circle, NOT in layout flow.
                Clicking the label still fires the button via event bubbling. */}
            {!hideLabel && (
                <span className={`
                    absolute top-[calc(100%+0.75rem)] left-1/2 -translate-x-1/2
                    whitespace-nowrap uppercase font-bold tracking-widest
                    text-white/60 group-hover:text-white/90 transition-colors duration-300
                    ${size === 'small' ? 'text-[clamp(10px,2vmin,15px)]' : 'text-[clamp(11px,2.2vmin,16px)]'}
                `}>
                    {label}
                </span>
            )}
        </button>
    );
};
