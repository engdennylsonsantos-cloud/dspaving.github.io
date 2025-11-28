import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Button } from './UI';

interface AppVersion {
    id: string;
    version: string;
    release_notes: string;
    download_url: string;
    release_date: string;
    is_latest: boolean;
}

export const AppVersions: React.FC = () => {
    const [versions, setVersions] = useState<AppVersion[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedVersion, setSelectedVersion] = useState<string>('');

    useEffect(() => {
        fetchVersions();
    }, []);

    const fetchVersions = async () => {
        try {
            const { data, error } = await supabase
                .from('app_versions')
                .select('*')
                .order('release_date', { ascending: false });

            if (data) {
                setVersions(data);
                const latest = data.find(v => v.is_latest);
                if (latest) setSelectedVersion(latest.id);
                else if (data.length > 0) setSelectedVersion(data[0].id);
            }
        } catch (error) {
            console.error('Error fetching versions:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        const version = versions.find(v => v.id === selectedVersion);
        if (version) {
            window.open(version.download_url, '_blank');
        }
    };

    if (loading) return <div className="animate-pulse h-32 bg-white/5 rounded-xl"></div>;

    if (versions.length === 0) {
        return (
            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 text-center">
                <p className="text-gray-400">Nenhuma versão disponível no momento.</p>
            </div>
        );
    }

    const currentVersion = versions.find(v => v.id === selectedVersion);

    return (
        <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 hover:bg-white/10 transition-colors duration-300 group">
            <div className="p-4 rounded-full bg-secondary-dark/50 text-primary border border-gray-700 group-hover:border-primary/50 transition-colors">
                <span className="material-symbols-outlined text-4xl">desktop_windows</span>
            </div>
            <div className="flex-grow w-full">
                <h2 className="text-2xl font-bold text-white mb-2">Aplicativo para Windows</h2>
                <p className="text-gray-400 text-sm mb-4">Baixe a versão mais recente do nosso software.</p>

                <div className="flex flex-col sm:flex-row gap-4 items-center">
                    <select
                        value={selectedVersion}
                        onChange={(e) => setSelectedVersion(e.target.value)}
                        className="bg-secondary-dark border border-gray-600 text-white text-sm rounded-lg focus:ring-primary focus:border-primary block w-full sm:w-auto p-2.5"
                    >
                        {versions.map((v) => (
                            <option key={v.id} value={v.id}>
                                v{v.version} {v.is_latest ? '(Mais recente)' : ''}
                            </option>
                        ))}
                    </select>

                    <Button
                        onClick={handleDownload}
                        className="w-full sm:w-auto bg-secondary hover:bg-secondary-light border border-gray-600"
                        icon={<span className="material-icons">download</span>}
                    >
                        Baixar v{currentVersion?.version}
                    </Button>
                </div>

                {currentVersion?.release_notes && (
                    <div className="mt-4 p-3 bg-black/20 rounded-lg text-left">
                        <p className="text-xs text-gray-500 font-bold mb-1">NOTAS DE LANÇAMENTO:</p>
                        <p className="text-sm text-gray-300">{currentVersion.release_notes}</p>
                    </div>
                )}
            </div>
        </div>
    );
};
