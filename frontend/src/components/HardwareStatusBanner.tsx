import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { WifiOff } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

export const HardwareStatusBanner: React.FC = () => {
    const { user } = useAuth();

    const { isError } = useQuery({
        queryKey: ['system', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/status');
            return response.data;
        },
        refetchInterval: () => 5000,
        retry: 0,
        enabled: !!user,
    });

    if (!isError) return null;

    return (
        <div className="fixed top-0 inset-x-0 z-[9999] bg-orange-500/95 backdrop-blur-sm text-white py-2.5 px-4 text-sm font-semibold flex items-center justify-center gap-2 shadow-lg">
            <WifiOff size={16} className="shrink-0 animate-pulse" />
            Hardware temporaneamente non disponibile — Riconnessione in corso...
        </div>
    );
};
