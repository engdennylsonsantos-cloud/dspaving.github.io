import React from 'react';
import { useLicense } from '../hooks/useLicense';
import { Button } from './UI';
import { useNavigate } from 'react-router-dom';
import { LINKS } from '../constants';

export const LicenseStatus: React.FC = () => {
    const { license, loading, daysRemaining } = useLicense();
    const navigate = useNavigate();

    if (loading) {
        return <div className="animate-pulse h-12 bg-white/5 rounded-lg w-full"></div>;
    }

    if (!license) {
        return null;
    }

    const getStatusColor = () => {
        switch (license.status) {
            case 'ativo': return 'bg-green-500/20 text-green-400 border-green-500/30';
            case 'trial': return 'bg-blue-500/20 text-blue-400 border-blue-500/30';
            case 'expirado': return 'bg-red-500/20 text-red-400 border-red-500/30';
            case 'cancelado': return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
            default: return 'bg-gray-500/20 text-gray-400 border-gray-500/30';
        }
    };

    const getStatusLabel = () => {
        switch (license.status) {
            case 'ativo': return 'Ativo';
            case 'trial': return 'Período de Teste';
            case 'expirado': return 'Expirado';
            case 'cancelado': return 'Cancelado';
            default: return license.status;
        }
    };

    return (
        <div className={`flex flex-col md:flex-row items-center justify-between p-4 rounded-xl border backdrop-blur-sm ${getStatusColor()} mb-6`}>
            <div className="flex items-center gap-4 mb-4 md:mb-0">
                <div className={`p-2 rounded-full ${license.status === 'expirado' ? 'bg-red-500/20' : 'bg-white/10'}`}>
                    <span className="material-icons">
                        {license.status === 'ativo' ? 'verified' :
                            license.status === 'trial' ? 'timer' :
                                license.status === 'expirado' ? 'warning' : 'info'}
                    </span>
                </div>
                <div>
                    <h3 className="font-bold text-lg flex items-center gap-2">
                        Status da Licença: {getStatusLabel()}
                    </h3>
                    <p className="text-sm opacity-80">
                        {license.status === 'expirado'
                            ? `Sua licença expirou em ${new Date(license.data_expiracao).toLocaleDateString()}`
                            : `Válida até ${new Date(license.data_expiracao).toLocaleDateString()} (${daysRemaining} dias restantes)`
                        }
                    </p>
                    {license.status === 'trial' && (
                        <p className="text-xs mt-1 font-semibold text-blue-300">
                            Aproveite todos os recursos premium durante o período de teste!
                        </p>
                    )}
                </div>
            </div>

            {(license.status === 'expirado' || license.status === 'trial' || daysRemaining < 7) && (
                <Button
                    onClick={() => navigate(LINKS.SUBSCRIPTION)}
                    className="whitespace-nowrap bg-white/10 hover:bg-white/20 border-white/20"
                    size="sm"
                >
                    {license.status === 'expirado' ? 'Renovar Agora' : 'Assinar Plano'}
                </Button>
            )}
        </div>
    );
};
