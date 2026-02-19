import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';

interface PlayerStatus {
    state: 'playing' | 'paused' | 'stopped' | 'nomedia';
    current_source?: string;
    song_title?: string;
    current_time?: number;
    total_time?: number;
    repeat_mode: 'song' | 'group' | 'none';
}

const formatTime = (seconds?: number): string => {
    if (!seconds || seconds <= 0) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const PlayerOverlay: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    // Same query key as Players.tsx so React Query deduplicates.
    // 5s interval to minimize load on the A13 board.
    // Only enabled when user is logged in AND not on the players page.
    const isOnPlayersPage = location.pathname === '/players';

    const { data: playerStatus } = useQuery<PlayerStatus>({
        queryKey: ['player', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/player/status');
            return response.data;
        },
        refetchInterval: 5000,
        enabled: !!user && !isOnPlayersPage,
    });

    if (!user) return null;

    const isActive = playerStatus?.state === 'playing' || playerStatus?.state === 'paused';
    const isPlaying = playerStatus?.state === 'playing';
    const songTitle = playerStatus?.song_title || 'Unknown';

    // Truncate long titles
    const displayTitle = songTitle.length > 28 ? songTitle.substring(0, 28) + '…' : songTitle;

    // Progress percentage
    const progress = (playerStatus?.current_time && playerStatus?.total_time)
        ? (playerStatus.current_time / playerStatus.total_time) * 100
        : 0;

    return (
        <AnimatePresence>
            {isActive && !isOnPlayersPage && (
                <motion.button
                    initial={{ y: 80, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    onClick={() => navigate('/players')}
                    className="fixed bottom-8 left-8 z-[9990] flex items-center gap-3 pl-4 pr-5 py-3 bg-blue-600/80 backdrop-blur-xl rounded-full border border-blue-400/30 shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:bg-blue-500/80 active:scale-95 transition-all cursor-pointer group overflow-hidden"
                >
                    {/* Progress bar along the bottom */}
                    <div className="absolute bottom-0 left-0 right-0 h-[3px] bg-white/10 rounded-full">
                        <div
                            className="h-full bg-white/50 rounded-full transition-all duration-[5s] ease-linear"
                            style={{ width: `${progress}%` }}
                        />
                    </div>

                    {/* Icon */}
                    {isPlaying ? (
                        <span className="flex items-end gap-[2px] h-4">
                            <span className="w-[3px] bg-white rounded-full animate-pulse" style={{ height: '12px', animationDelay: '0ms', animationDuration: '0.8s' }} />
                            <span className="w-[3px] bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '200ms', animationDuration: '0.8s' }} />
                            <span className="w-[3px] bg-white rounded-full animate-pulse" style={{ height: '14px', animationDelay: '400ms', animationDuration: '0.8s' }} />
                        </span>
                    ) : (
                        <Pause className="w-5 h-5 text-white/80" />
                    )}

                    {/* Track info */}
                    <div className="flex flex-col items-start leading-tight">
                        <span className="text-white font-bold text-xs uppercase tracking-wider truncate max-w-[180px]">
                            {displayTitle}
                        </span>
                        <span className="text-white/50 font-mono text-[10px] tracking-wider">
                            {formatTime(playerStatus?.current_time)} / {formatTime(playerStatus?.total_time)}
                        </span>
                    </div>
                </motion.button>
            )}
        </AnimatePresence>
    );
};
