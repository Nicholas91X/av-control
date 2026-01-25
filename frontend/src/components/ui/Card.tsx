import React from 'react';

interface CardProps {
    children: React.ReactNode;
    className?: string;
    title?: string;
    subtitle?: string;
}

export const Card: React.FC<CardProps> = ({ children, className = '', title, subtitle }) => {
    return (
        <div className={`bg-white dark:bg-[#1a1a1c] rounded-2xl border border-gray-200 dark:border-white/10 border-b-4 border-b-gray-300 dark:border-b-black/60 shadow-xl overflow-hidden ${className}`}>
            {(title || subtitle) && (
                <div className="px-6 py-4 border-b border-gray-100 dark:border-gray-700/50">
                    {title && <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>}
                    {subtitle && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{subtitle}</p>}
                </div>
            )}
            <div className="p-6">{children}</div>
        </div>
    );
};
