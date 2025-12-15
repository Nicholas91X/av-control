import React, { useEffect, useState } from 'react';
import { useWebSocket, WebSocketMessage } from '../context/WebSocketContext';
import { X, User, Activity, UserPlus, UserMinus } from 'lucide-react';

interface Notification {
    id: string;
    message: WebSocketMessage;
    timestamp: number;
}

export const RealtimeNotifications: React.FC = () => {
    const { lastMessage } = useWebSocket();
    const [notifications, setNotifications] = useState<Notification[]>([]);

    useEffect(() => {
        if (!lastMessage) return;

        // Add new notification
        const notification: Notification = {
            id: `${Date.now()}-${Math.random()}`,
            message: lastMessage,
            timestamp: Date.now(),
        };

        setNotifications(prev => [notification, ...prev].slice(0, 5)); // Keep only last 5

        // Auto-remove after 5 seconds
        const timer = setTimeout(() => {
            setNotifications(prev => prev.filter(n => n.id !== notification.id));
        }, 5000);

        return () => clearTimeout(timer);
    }, [lastMessage]);

    const removeNotification = (id: string) => {
        setNotifications(prev => prev.filter(n => n.id !== id));
    };

    const getNotificationContent = (msg: WebSocketMessage) => {
        switch (msg.type) {
            case 'command_executed':
                return {
                    icon: Activity,
                    color: 'bg-blue-50 dark:bg-blue-900/20 border-blue-200 dark:border-blue-800',
                    iconColor: 'text-blue-600 dark:text-blue-400',
                    title: 'Command Executed',
                    description: `${msg.data.username} executed: ${msg.data.command}`,
                };
            case 'status_update':
                return {
                    icon: Activity,
                    color: 'bg-purple-50 dark:bg-purple-900/20 border-purple-200 dark:border-purple-800',
                    iconColor: 'text-purple-600 dark:text-purple-400',
                    title: 'Status Update',
                    description: 'System status updated',
                };
            case 'user_connected':
                return {
                    icon: UserPlus,
                    color: 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800',
                    iconColor: 'text-green-600 dark:text-green-400',
                    title: 'User Connected',
                    description: `${msg.data.username} joined`,
                };
            case 'user_disconnected':
                return {
                    icon: UserMinus,
                    color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
                    iconColor: 'text-gray-600 dark:text-gray-400',
                    title: 'User Disconnected',
                    description: `${msg.data.username} left`,
                };
            default:
                return {
                    icon: User,
                    color: 'bg-gray-50 dark:bg-gray-800/50 border-gray-200 dark:border-gray-700',
                    iconColor: 'text-gray-600 dark:text-gray-400',
                    title: 'Notification',
                    description: 'New event received',
                };
        }
    };

    if (notifications.length === 0) return null;

    return (
        <div className="fixed bottom-4 right-4 z-50 space-y-2 max-w-md">
            {notifications.map((notification) => {
                const content = getNotificationContent(notification.message);
                const Icon = content.icon;

                return (
                    <div
                        key={notification.id}
                        className={`${content.color} border rounded-lg shadow-lg p-4 animate-slide-in-right flex items-start space-x-3`}
                    >
                        <div className={`${content.iconColor} mt-0.5`}>
                            <Icon className="w-5 h-5" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-gray-900 dark:text-white">
                                {content.title}
                            </p>
                            <p className="text-sm text-gray-600 dark:text-gray-300 truncate">
                                {content.description}
                            </p>
                        </div>
                        <button
                            onClick={() => removeNotification(notification.id)}
                            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                );
            })}
        </div>
    );
};
