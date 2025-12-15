import React from 'react';
import { useWebSocket } from '../context/WebSocketContext';
import { Wifi, WifiOff, Loader2 } from 'lucide-react';

export const WebSocketStatus: React.FC = () => {
    const { status } = useWebSocket();

    const statusConfig = {
        connected: {
            icon: Wifi,
            color: 'text-green-500 dark:text-green-400',
            bgColor: 'bg-green-50 dark:bg-green-900/20',
            text: 'Connected',
            pulse: false,
        },
        connecting: {
            icon: Loader2,
            color: 'text-yellow-500 dark:text-yellow-400',
            bgColor: 'bg-yellow-50 dark:bg-yellow-900/20',
            text: 'Connecting',
            pulse: true,
        },
        disconnected: {
            icon: WifiOff,
            color: 'text-gray-400 dark:text-gray-500',
            bgColor: 'bg-gray-50 dark:bg-gray-800/50',
            text: 'Disconnected',
            pulse: false,
        },
        error: {
            icon: WifiOff,
            color: 'text-red-500 dark:text-red-400',
            bgColor: 'bg-red-50 dark:bg-red-900/20',
            text: 'Error',
            pulse: false,
        },
    };

    const config = statusConfig[status];
    const Icon = config.icon;

    return (
        <div className={`inline-flex items-center space-x-2 px-3 py-1.5 rounded-lg ${config.bgColor}`}>
            <Icon className={`w-4 h-4 ${config.color} ${config.pulse ? 'animate-spin' : ''}`} />
            <span className={`text-xs font-medium ${config.color}`}>
                {config.text}
            </span>
        </div>
    );
};
