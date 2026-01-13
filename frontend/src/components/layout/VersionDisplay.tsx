import { useQuery } from '@tanstack/react-query';
import { Info } from 'lucide-react';
import api from '../../lib/api';

interface VersionInfo {
    version: string;
    build_date: string;
    build_time: string;
    go_version: string;
    os: string;
    arch: string;
}

export const VersionDisplay: React.FC = () => {
    const { data: versionData } = useQuery<VersionInfo>({
        queryKey: ['version'],
        queryFn: async () => {
            const response = await api.get('/version', { baseURL: '/' });
            return response.data;
        },
        staleTime: Infinity, // Version non cambia durante la sessione
        retry: 1,
    });

    if (!versionData) {
        return <div className="text-gray-400">Loading version...</div>;
    }

    return (
        <div className="flex items-center space-x-2">
            <Info className="w-3 h-3" />
            <span>
                v{versionData.version} • {versionData.build_date}
            </span>
        </div>
    );
}