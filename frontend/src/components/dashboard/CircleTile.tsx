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
    const sizeClasses = {
        small: 'w-[clamp(5rem,22vmin,7.5rem)] h-[clamp(5rem,22vmin,7.5rem)]',
        large: 'w-[clamp(7.5rem,30vmin,11rem)] h-[clamp(7.5rem,30vmin,11rem)]',
    };

    const iconSize = {
        small: 'clamp(1.5rem, 6vmin, 2.5rem)',
        large: 'clamp(2.5rem, 9vmin, 3.5rem)',
    };

    return (
        <button
            onClick={onClick}
            className={`
                relative group flex-shrink-0 active:translate-y-1 transition-transform duration-200
                ${sizeClasses[size as keyof typeof sizeClasses]}
                ${className}
            `}
        >
            {/* Circle body */}
            <div
                className="absolute inset-0 rounded-full overflow-hidden
                    bg-gradient-to-b from-[#333338] to-[#1e1e22]
                    border-t border-t-white/15
                    border-b-[6px] border-b-[#0c0c0e]
                    group-active:border-b-[2px]
                    transition-[border] duration-150"
                style={{
                    boxShadow: glowColor
                        ? `inset 0 2px 4px rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.3), 0 0 20px ${glowColor}18, 0 8px 24px rgba(0,0,0,0.7)`
                        : 'inset 0 2px 4px rgba(255,255,255,0.06), inset 0 -2px 6px rgba(0,0,0,0.3), 0 8px 24px rgba(0,0,0,0.7)',
                }}
            >
                {/* Tap colour flash */}
                <div
                    className="absolute inset-0 opacity-0 group-active:opacity-15 transition-opacity duration-200 pointer-events-none rounded-full"
                    style={{ backgroundColor: glowColor || '#3b82f6' }}
                />

                {/* Subtle glossy arc at top */}
                <div className="absolute inset-0 pointer-events-none rounded-full"
                    style={{
                        background: 'linear-gradient(175deg, rgba(255,255,255,0.08) 0%, rgba(255,255,255,0.02) 35%, transparent 50%)'
                    }}
                />

                {/* Soft radial colour tint */}
                <div
                    className="absolute inset-0 pointer-events-none rounded-full opacity-15"
                    style={{ background: `radial-gradient(circle at 50% 40%, ${glowColor || '#ffffff'}44, transparent 60%)` }}
                />

                {/* Inner ring for depth */}
                <div className="absolute inset-[3px] rounded-full border border-white/[0.04] pointer-events-none" />

                {/* Icon — centred with refined shadow */}
                <div className={`absolute inset-0 flex flex-col items-center justify-center px-2
                    group-hover:scale-105 transition-transform duration-300`}>
                    <Icon
                        size={iconSize[size as keyof typeof iconSize]}
                        style={{
                            color: glowColor || 'white',
                            filter: `
                                drop-shadow(0 1px 0 rgba(255,255,255,0.2))
                                drop-shadow(0 2px 4px rgba(0,0,0,0.5))
                            `
                        }}
                        className={`${iconClassName} ${hideLabel ? '' : 'mb-2'}`}
                    />
                </div>

                {/* Curved Label — SVG textPath */}
                {!hideLabel && (
                    <svg
                        viewBox="0 0 100 100"
                        className="absolute inset-0 w-full h-full pointer-events-none group-hover:scale-105 transition-transform duration-300"
                    >
                        <defs>
                            <path
                                id={`mc-${label.replace(/\s+/g, '-')}`}
                                d="M 8 70 A 55 55 0 0 0 92 70"
                                fill="transparent"
                            />
                        </defs>
                        <text
                            className={`
                                font-semibold tracking-[0.15em] uppercase
                                ${size === 'small' ? 'text-[10px]' : 'text-[13px]'}
                            `}
                            fill="rgba(255, 255, 255, 0.65)"
                        >
                            <textPath
                                href={`#mc-${label.replace(/\s+/g, '-')}`}
                                startOffset="50%"
                                textAnchor="middle"
                            >
                                {label}
                            </textPath>
                        </text>
                    </svg>
                )}
            </div>
        </button>
    );
};
