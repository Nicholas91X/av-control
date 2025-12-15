import React, { forwardRef } from 'react';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
    label?: string;
    error?: string;
    icon?: React.ComponentType<{ className?: string }>;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
    ({ label, error, icon: Icon, className = '', ...props }, ref) => {
        return (
            <div className="w-full">
                {label && (
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                        {label}
                    </label>
                )}
                <div className="relative">
                    {Icon && (
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <Icon className="h-5 w-5 text-gray-400" />
                        </div>
                    )}
                    <input
                        ref={ref}
                        className={`
              block w-full rounded-lg border-gray-300 dark:border-gray-600 
              bg-white dark:bg-dark-surface text-gray-900 dark:text-white 
              shadow-sm focus:border-primary-500 focus:ring-primary-500 
              disabled:cursor-not-allowed disabled:opacity-50
              placeholder-gray-400 dark:placeholder-gray-500
              transition-colors duration-200
              ${Icon ? 'pl-10' : 'pl-3'} 
              ${error ? 'border-red-500 focus:border-red-500 focus:ring-red-500' : ''}
              ${className}
            `}
                        {...props}
                    />
                </div>
                {error && <p className="mt-1 text-sm text-red-600 dark:text-red-400">{error}</p>}
            </div>
        );
    }
);

Input.displayName = 'Input';
