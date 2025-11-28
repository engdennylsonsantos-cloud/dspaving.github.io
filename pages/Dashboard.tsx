import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLicense } from '../hooks/useLicense';
import { IMAGES, LINKS } from '../constants';
import { Button } from '../components/UI';
import { LicenseStatus } from '../components/LicenseStatus';
import { AppVersions } from '../components/AppVersions';

const DashboardPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, profile, signOut } = useAuth(); // Profile restaurado
    const { license } = useLicense();

    const handleDownload = () => {
        alert("O download do instalador Windows foi iniciado.");
    };

    const handleLogout = async () => {
        await signOut();
        navigate(LINKS.HOME);
    };

    return (
        <div className="font-inter bg-secondary-dark min-h-screen text-gray-200">
            {/* Background with texture */}
            <div className="fixed inset-0 bg-asphalt-texture opacity-40 z-0 pointer-events-none"></div>
            <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8">
                {/* Header */}
                <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                    <div className="flex items-center gap-3">
                        <img src={IMAGES.LOGO_NAV} alt="DSPaving" className="h-10 w-10 md:h-12 md:w-12" />
                        <span className="text-xl md:text-2xl font-bold text-white tracking-wide hidden sm:inline-block">DSPaving</span>
                    </div>
                    <div className="flex items-center gap-4">
                        {user && (
                            <div className="text-right hidden md:block">
                                <div className="text-white font-bold">{profile?.nome_usuario || user.email}</div>
                                <div className="text-xs text-gray-400">{user.email}</div>
                            </div>
                        )}
                        <button
                            onClick={handleLogout}
                            className="flex items-center gap-2 text-gray-300 hover:text-white transition-colors font-medium px-4 py-2 rounded-lg hover:bg-white/10"
                        >
                            <span className="material-icons">logout</span>
                            <span className="hidden sm:inline">Sair</span>
                        </button>
                    </div>
                </header>

                <main className="flex-grow flex flex-col items-center justify-center mt-20 max-w-7xl mx-auto w-full">
                    {/* License Status Banner */}
                    <div className="w-full max-w-6xl mb-8 animate-fade-in-down">
                        {license ? (
                            <LicenseStatus license={license} />
                        ) : (
                            <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div>
                                    <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                        <span className="material-icons text-red-500">warning</span>
                                        Nenhuma Licença Ativa
                                    </h3>
                                    <p className="text-gray-400 text-sm mt-1">
                                        Você precisa de uma assinatura para utilizar o software.
                                    </p>
                                </div>
                                <Button
                                    onClick={() => navigate(LINKS.SUBSCRIPTION)}
                                    className="bg-red-600 hover:bg-red-700 text-white border-none"
                                >
                                    Assinar Agora
                                </Button>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-24 w-full">
                        {/* Welcome Text */}
                        <div className="lg:w-1/2 text-center lg:text-left animate-fade-in-left">
                            <h1 className="text-5xl md:text-6xl lg:text-7xl font-black text-white uppercase tracking-wider drop-shadow-2xl mb-6">
                                Painel do <br /><span className="text-primary">Usuário</span>
                            </h1>
                            <p className="text-lg md:text-xl text-gray-300 max-w-xl mx-auto lg:mx-0 leading-relaxed font-light">
                                Acesse as ferramentas essenciais para levar seus projetos de pavimentação ao próximo nível.
                                Gerencie sua conta e instale o software desktop.
                            </p>
                        </div>

                        {/* Cards */}
                        <div className="w-full lg:w-1/2 max-w-md lg:max-w-none flex flex-col gap-6 animate-fade-in-right">

                            {/* Download Card - Agora Dinâmico */}
                            <AppVersions />

                            {/* Subscription Card */}
                            <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 flex flex-col md:flex-row items-center md:items-start text-center md:text-left gap-6 hover:bg-white/10 transition-colors duration-300 group">
                                <div className="p-4 rounded-full bg-secondary-dark/50 text-primary border border-gray-700 group-hover:border-primary/50 transition-colors">
                                    <span className="material-symbols-outlined text-4xl">credit_card</span>
                                </div>
                                <div className="flex-grow">
                                    <h2 className="text-2xl font-bold text-white mb-2">Sua Assinatura</h2>
                                    <p className="text-gray-400 text-sm mb-6">Gerencie seu plano, atualize informações de pagamento e visualize seu histórico.</p>
                                    <Button
                                        onClick={() => navigate(LINKS.MANAGE_SUB)}
                                        className="w-full md:w-auto"
                                        icon={<span className="material-icons">settings</span>}
                                    >
                                        Gerenciar Assinatura
                                    </Button>
                                </div>
                            </div>

                        </div>
                    </div>
                </main>
            </div>
        </div>
    );
};

export default DashboardPage;