import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost';
    size?: 'sm' | 'md' | 'lg';
    fullWidth?: boolean;
    isLoading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
    children,
    variant = 'primary',
    size = 'md',
    fullWidth = false,
    isLoading = false,
    className = '',
    disabled,
    ...props
}) => {
    const baseStyles = 'inline-flex items-center justify-center font-black uppercase tracking-widest transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed active:translate-y-[2px] active:border-b-0';

    const variants = {
        primary: 'bg-primary-600 text-white border-t-2 border-t-white/30 border-b-primary-800 hover:bg-primary-500',
        secondary: 'bg-white text-gray-700 border-gray-200 border-b-gray-400 hover:bg-gray-50 dark:bg-[#2a2a2e] dark:text-white/80 dark:border-t-2 dark:border-t-white/20 dark:border-x dark:border-x-white/5 dark:border-b-black dark:hover:text-white',
        danger: 'bg-red-600 text-white border-t-2 border-t-white/30 border-b-red-800 hover:bg-red-500',
        ghost: 'text-gray-600 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-white/10 dark:hover:text-white border-transparent',
    };

    const sizes = {
        sm: 'px-4 py-2 text-[10px] rounded-xl border-b-[4px] active:translate-y-1 active:border-b-0',
        md: 'px-6 py-3 text-xs rounded-2xl border-b-[8px] active:translate-y-2 active:border-b-[2px]',
        lg: 'px-8 py-4 text-sm rounded-[1.5rem] border-b-[10px] active:translate-y-2 active:border-b-[3px]',
    };

    const widthStyle = fullWidth ? 'w-full' : '';

    return (
        <button
            className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${widthStyle} ${className}`}
            disabled={disabled || isLoading}
            {...props}
        >
            {isLoading ? (
                <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-current" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Loading...
                </>
            ) : (
                children
            )}
        </button>
    );
};
