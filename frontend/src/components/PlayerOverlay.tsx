import React, { useState, useEffect, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Pause, X } from 'lucide-react';
import api from '../lib/api';
import { useAuth } from '../context/AuthContext';
import { useIsTablet } from '../hooks/useIsTablet';

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
    const total = Math.floor(seconds);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
};

export const PlayerOverlay: React.FC = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [dismissed, setDismissed] = useState(false);
    const [noTransition, setNoTransition] = useState(false);
    const prevProgressRef = useRef(0);
    const isTablet = useIsTablet();

    const isOnPlayersPage = location.pathname === '/players';

    const { data: playerStatus } = useQuery<PlayerStatus>({
        queryKey: ['player', 'status'],
        queryFn: async () => {
            const response = await api.get('/device/player/status');
            return response.data;
        },
        refetchInterval: () => 5000,
        enabled: !!user && !isOnPlayersPage,
    });

    // Re-show pill when track or playback state changes
    const currentSongKey = `${playerStatus?.song_title}-${playerStatus?.state}`;
    useEffect(() => {
        setDismissed(false);
    }, [currentSongKey]);

    // Skip CSS transition when progress jumps backward (repeat/new song) to avoid
    // the bar visually sliding from 100% back to 0% over 5 seconds.
    const progress = (playerStatus?.current_time && playerStatus?.total_time)
        ? Math.min(100, Math.max(0, (playerStatus.current_time / playerStatus.total_time) * 100))
        : 0;
    useEffect(() => {
        if (progress < prevProgressRef.current - 10) {
            setNoTransition(true);
            const t = setTimeout(() => setNoTransition(false), 100);
            prevProgressRef.current = progress;
            return () => clearTimeout(t);
        }
        prevProgressRef.current = progress;
    }, [progress]);

    // ALL hooks are above — safe to return early now
    if (!user) return null;

    const isActive = playerStatus?.state === 'playing' || playerStatus?.state === 'paused';
    const isPlaying = playerStatus?.state === 'playing';
    const songTitle = playerStatus?.song_title || 'Unknown';
    const displayTitle = songTitle.length > 28 ? songTitle.substring(0, 28) + '…' : songTitle;

    return (
        <AnimatePresence>
            {isActive && !isOnPlayersPage && !dismissed && (
                <motion.div
                    initial={{ y: 80, opacity: 0, scale: 0.8 }}
                    animate={{ y: 0, opacity: 1, scale: 1 }}
                    exit={{ y: 80, opacity: 0, scale: 0.8 }}
                    transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                    className={isTablet
                        ? "fixed bottom-8 left-8 z-[9990] flex items-center gap-1"
                        : "fixed bottom-3 left-3 z-[9990] flex items-center gap-0.5"
                    }
                >
                    {/* Main pill - navigates to Players */}
                    <button
                        onClick={() => navigate('/players')}
                        className={isTablet
                            ? "flex items-center gap-3 pl-4 pr-5 py-3 bg-blue-600/80 backdrop-blur-xl rounded-l-full border border-blue-400/30 border-r-0 shadow-[0_0_30px_rgba(37,99,235,0.3)] hover:bg-blue-500/80 active:scale-95 transition-all cursor-pointer group overflow-hidden relative"
                            : "flex items-center gap-2 pl-3 pr-3 py-1.5 bg-blue-600/85 backdrop-blur-xl rounded-l-xl border border-blue-400/30 border-r-0 shadow-[0_0_15px_rgba(37,99,235,0.2)] active:scale-[0.97] transition-all cursor-pointer overflow-hidden relative"
                        }
                    >
                        {/* Progress bar */}
                        <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-white/10 rounded-full">
                            <div
                                className={`h-full bg-white/50 rounded-full ${noTransition ? '' : 'transition-all duration-[5s] ease-linear'}`}
                                style={{ width: `${progress}%` }}
                            />
                        </div>

                        {/* Icon */}
                        {isPlaying ? (
                            <span className="flex items-end gap-[2px] h-3 shrink-0">
                                <span className="w-[2px] bg-white rounded-full animate-pulse" style={{ height: '8px', animationDelay: '0ms', animationDuration: '0.8s' }} />
                                <span className="w-[2px] bg-white rounded-full animate-pulse" style={{ height: '5px', animationDelay: '200ms', animationDuration: '0.8s' }} />
                                <span className="w-[2px] bg-white rounded-full animate-pulse" style={{ height: '10px', animationDelay: '400ms', animationDuration: '0.8s' }} />
                            </span>
                        ) : (
                            <Pause className={isTablet ? "w-5 h-5 text-white/80" : "w-3.5 h-3.5 text-white/80 shrink-0"} />
                        )}

                        {/* Track info */}
                        <div className="flex flex-col items-start leading-tight min-w-0">
                            <span className={isTablet
                                ? "text-white font-bold text-xs uppercase tracking-wider truncate max-w-[180px]"
                                : "text-white font-bold text-[9px] uppercase tracking-wider truncate max-w-[40vw]"
                            }>
                                {displayTitle}
                            </span>
                            <span className={isTablet
                                ? "text-white/50 font-mono text-[10px] tracking-wider"
                                : "text-white/50 font-mono text-[8px] tracking-wider"
                            }>
                                {formatTime(playerStatus?.current_time)} / {formatTime(playerStatus?.total_time)}
                            </span>
                        </div>
                    </button>

                    {/* Dismiss button */}
                    <button
                        onClick={() => setDismissed(true)}
                        className={isTablet
                            ? "flex items-center justify-center w-10 h-full py-3 bg-blue-600/60 backdrop-blur-xl rounded-r-full border border-blue-400/30 border-l-0 hover:bg-red-500/60 active:scale-95 transition-all"
                            : "flex items-center justify-center w-7 h-full py-1.5 bg-blue-600/60 backdrop-blur-xl rounded-r-xl border border-blue-400/30 border-l-0 active:bg-red-500/60 active:scale-95 transition-all"
                        }
                    >
                        <X className={isTablet ? "w-3.5 h-3.5 text-white/50" : "w-3 h-3 text-white/50"} />
                    </button>
                </motion.div>
            )}
        </AnimatePresence>
    );
};
