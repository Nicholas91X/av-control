import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface RecorderStatus {
    state: 'recording' | 'stopped' | 'nomedia';
    current_time?: number;
    filename?: string;
}

const formatTime = (seconds?: number): string => {
    if (!seconds) return '00:00:00';
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

export const RecordingOverlay: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    const { data: recorderStatus } = useQuery<RecorderStatus>({
        queryKey: ['recorder', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/recorder/status');
            return response.data;
        },
        refetchInterval: () => 1000,
        enabled: !!user,
    });

    // Don't render if not logged in
    if (!user) return null;

    const isRecording = recorderStatus?.state === 'recording';
    const isOnRecordersPage = location.pathname === '/recorders';

    return (
        <AnimatePresence>
            {isRecording && !isOnRecordersPage && (
                <motion.button
                    initial={{ y: 80, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={() => navigate('/recorders')}
                    className="fixed bottom-8 right-8 z-[9990] flex items-center gap-3 px-5 py-3 bg-red-600/90 backdrop-blur-xl rounded-full border border-red-400/30 shadow-[0_0_30px_rgba(220,38,38,0.4)] hover:bg-red-500/90 active:scale-95 transition-all cursor-pointer group"
                >
                    {/* Pulsing red dot */}
                    <span className="relative flex h-3 w-3">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-300 opacity-75" />
                        <span className="relative inline-flex rounded-full h-3 w-3 bg-white" />
                    </span>

                    <span className="text-white font-black text-xs uppercase tracking-widest">REC</span>

                    <span className="text-white/90 font-mono font-bold text-sm tracking-wider">
                        {formatTime(recorderStatus?.current_time)}
                    </span>
                </motion.button>
            )}
        </AnimatePresence>
    );
};
