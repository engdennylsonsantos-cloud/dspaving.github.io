import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useLicense } from '../hooks/useLicense';
import { IMAGES, LINKS } from '../constants';
import { Button, Card, Badge } from '../components/UI';
import { supabase } from '../lib/supabase';
import { initMercadoPago, Wallet } from '@mercadopago/sdk-react';

// Initialize Mercado Pago
initMercadoPago('APP_USR-d4a14374-7914-41ae-ab84-54ca93c781fe', {
    locale: 'pt-BR'
});

const SubscriptionPage: React.FC = () => {
    const navigate = useNavigate();
    const { user, signOut } = useAuth();
    const { license, refreshLicense } = useLicense();
    const [searchParams] = useSearchParams();
    const [processingPaymentReturn, setProcessingPaymentReturn] = useState(false); // For payment return processing
    const [processingPlan, setProcessingPlan] = useState<string | null>(null); // For subscription button loading state

    useEffect(() => {
        // Check for payment return
        const status = searchParams.get('status');
        const paymentId = searchParams.get('payment_id');
        const preapprovalId = searchParams.get('preapproval_id'); // ID da assinatura
        const planType = searchParams.get('plan');

        console.log('URL Params:', { status, paymentId, preapprovalId, planType });

        // Suporte tanto para pagamento único quanto assinatura
        if ((status === 'approved' && paymentId) || preapprovalId) {
            console.log('Payment detected, processing...');
            handlePaymentSuccess(paymentId || preapprovalId || 'unknown');
        }
    }, [searchParams]);

    const handlePaymentSuccess = async (referenceId: string) => {
        console.log('Starting handlePaymentSuccess with ID:', referenceId);
        setProcessingPaymentReturn(true);
        try {
            const lastPlan = localStorage.getItem('last_selected_plan') || 'mensal';
            console.log('Plan Type:', lastPlan);

            const { data, error } = await supabase.rpc('process_payment_success', {
                p_payment_id: referenceId,
                p_plan_type: lastPlan
            });

            console.log('RPC Response:', { data, error });

            if (error) throw error;

            await refreshLicense();
            alert('Assinatura confirmada! Sua licença foi ativada com recorrência.');
            navigate(LINKS.DASHBOARD);
        } catch (error) {
            console.error('Error processing payment:', error);
            alert('Erro ao processar assinatura. Entre em contato com o suporte.');
        } finally {
            setProcessingPaymentReturn(false);
        }
    };

    const handleManualActivation = async () => {
        const confirmed = window.confirm(
            'Confirme que você JÁ REALIZOU O PAGAMENTO no Mercado Pago.\n\n' +
            'Clique OK apenas se o pagamento foi aprovado.'
        );

        if (!confirmed) return;

        await handlePaymentSuccess('manual-activation-' + Date.now());
    };

    const createSubscription = async (plan: 'mensal' | 'anual') => {
        setProcessingPlan(plan);
        localStorage.setItem('last_selected_plan', plan);

        const title = plan === 'mensal' ? 'DSPaving - Assinatura Mensal' : 'DSPaving - Assinatura Anual';
        const price = plan === 'mensal' ? 99.90 : 999.90;
        const frequency = plan === 'mensal' ? 1 : 12;
        const frequencyType = 'months'; // Ambos são meses (1 mês ou 12 meses)

        try {
            // Mercado Pago often rejects 'localhost', so we try '127.0.0.1' which is sometimes accepted
            let baseUrl = window.location.origin;
            if (baseUrl.includes('localhost')) {
                baseUrl = baseUrl.replace('localhost', '127.0.0.1');
            }

            // Chamar Backend via RPC (Postgres Function) para evitar erro de CORS
            const { data, error } = await supabase.rpc('create_mp_subscription', {
                p_plan_type: plan,
                p_back_url: `${baseUrl}/subscription?plan=${plan}`
            });

            if (error) throw error;

            // Verificar se houve erro retornado pela API (dentro do JSON)
            if (data.error) {
                console.error('MP API Error:', data);
                const err: any = new Error(data.error || 'Erro na integração com Mercado Pago');
                err.details = data.details;
                throw err;
            }

            if (data.init_point) {
                // Redirecionar para o checkout de assinatura
                window.location.href = data.init_point;
            } else {
                console.error('MP Unexpected Data:', data);
                throw new Error('Resposta inválida do Mercado Pago');
            }

        } catch (error: any) {
            console.error('Error creating subscription:', error);
            // Mostrar erro detalhado se disponível
            const errorMessage = error.message || 'Erro desconhecido';
            // Se tiver detalhes no erro (retornado pelo backend), mostrar
            let details = '';
            if (errorMessage.includes('Erro MP') && (error as any).details) {
                details = JSON.stringify((error as any).details, null, 2);
            }

            alert(`Erro ao iniciar assinatura: ${errorMessage}\n\nDetalhes: ${details}\n\nVerifique o console (F12) para mais detalhes.`);
        } finally {
            setProcessingPlan(null);
        }
    };

    return (
        <div className="font-inter bg-secondary-dark min-h-screen text-gray-200">
            <div className="fixed inset-0 bg-asphalt-texture opacity-40 z-0 pointer-events-none"></div>
            <div className="fixed inset-0 bg-black/60 z-0 pointer-events-none"></div>

            <div className="relative z-10 flex flex-col min-h-screen p-4 md:p-8">
                {/* Header */}
                <header className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-20">
                    <div className="flex items-center gap-3 cursor-pointer" onClick={() => navigate(LINKS.DASHBOARD)}>
                        <img src={IMAGES.LOGO_NAV} alt="DSPaving" className="h-10 w-10 md:h-12 md:w-12" />
                        <span className="text-xl md:text-2xl font-bold text-white tracking-wide hidden sm:inline-block">DSPaving</span>
                    </div>
                    <div className="flex items-center gap-4">
                        <button
                            onClick={() => navigate(LINKS.DASHBOARD)}
                            className="text-gray-300 hover:text-white transition-colors font-medium px-4 py-2"
                        >
                            Voltar ao Painel
                        </button>
                    </div>
                </header>

                <main className="flex-grow flex flex-col items-center justify-center mt-20 max-w-6xl mx-auto w-full">

                    <div className="text-center mb-12 animate-fade-in-down">
                        <h1 className="text-4xl md:text-5xl font-black text-white uppercase tracking-wider mb-4">
                            Escolha seu <span className="text-primary">Plano</span>
                        </h1>
                        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
                            Desbloqueie todo o potencial do DSPaving com nossos planos flexíveis.
                        </p>
                    </div>

                    {/* Current Plan Info */}
                    {license && (
                        <div className="w-full max-w-3xl mb-12 bg-white/5 border border-white/10 rounded-xl p-6 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in-up">
                            <div>
                                <h3 className="text-lg font-bold text-white">Plano Atual: <span className="text-primary capitalize">{license.tipo_plano}</span></h3>
                                <p className="text-sm text-gray-400">
                                    Status: <span className={license.status === 'ativo' ? 'text-green-400' : 'text-yellow-400'}>{license.status}</span> •
                                    Expira em: {new Date(license.data_expiracao).toLocaleDateString()}
                                </p>
                            </div>
                            {license.status === 'ativo' && (
                                <Badge variant="success">Licença Ativa</Badge>
                            )}
                        </div>
                    )}

                    {/* Pricing Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl animate-fade-in-up">

                        {/* Monthly Plan */}
                        <div className="bg-secondary/80 backdrop-blur-xl border border-gray-700 rounded-2xl p-8 flex flex-col hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1 shadow-2xl">
                            <h3 className="text-2xl font-bold text-white mb-2">Mensal</h3>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-black text-primary">R$ 99,90</span>
                                <span className="text-gray-400 ml-2">/mês</span>
                            </div>
                            <ul className="space-y-3 mb-8 flex-grow text-gray-300">
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> Acesso completo ao software</li>
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> Atualizações inclusas</li>
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> Suporte prioritário</li>
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> Cancele quando quiser</li>
                            </ul>
                            <Button
                                onClick={() => createSubscription('mensal')}
                                loading={processingPlan === 'mensal' || processingPaymentReturn}
                                disabled={!!processingPlan || processingPaymentReturn}
                                className="w-full py-4 text-lg"
                            >
                                Assinar Mensal
                            </Button>
                        </div>

                        {/* Annual Plan */}
                        <div className="relative bg-gradient-to-b from-secondary to-secondary-dark backdrop-blur-xl border border-primary/30 rounded-2xl p-8 flex flex-col hover:border-primary transition-all duration-300 transform hover:-translate-y-1 shadow-2xl shadow-primary/10">
                            <div className="absolute top-0 right-0 bg-primary text-white text-xs font-bold px-3 py-1 rounded-bl-xl rounded-tr-xl">
                                MELHOR VALOR
                            </div>
                            <h3 className="text-2xl font-bold text-white mb-2">Anual</h3>
                            <div className="flex items-baseline mb-6">
                                <span className="text-4xl font-black text-primary">R$ 999,90</span>
                                <span className="text-gray-400 ml-2">/ano</span>
                            </div>
                            <p className="text-sm text-green-400 mb-6 font-bold">Economize R$ 198,90 por ano!</p>
                            <ul className="space-y-3 mb-8 flex-grow text-gray-300">
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> Tudo do plano mensal</li>
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> 2 meses grátis</li>
                                <li className="flex items-center gap-2"><span className="material-icons text-green-400 text-sm">check</span> Acesso antecipado a recursos</li>
                            </ul>
                            <Button
                                onClick={() => createSubscription('anual')}
                                loading={processingPlan === 'anual' || processingPaymentReturn}
                                disabled={!!processingPlan || processingPaymentReturn}
                                variant="primary"
                                className="w-full py-4 text-lg shadow-lg shadow-primary/20"
                            >
                                Assinar Anual
                            </Button>
                        </div>

                    </div>

                    {/* Manual Activation Section */}
                    <div className="w-full max-w-4xl mt-12 animate-fade-in-up">
                        <div className="bg-primary/10 border border-primary/30 rounded-xl p-6">
                            <h3 className="text-lg font-bold text-white mb-2 flex items-center gap-2">
                                <span className="material-icons text-primary">verified</span>
                                Pagamento Já Realizado?
                            </h3>
                            <p className="text-gray-300 text-sm mb-4">
                                Se você já confirmou o pagamento no Mercado Pago, clique no botão abaixo para ativar sua licença imediatamente:
                            </p>
                            <Button
                                onClick={handleManualActivation}
                                loading={processingPaymentReturn}
                                disabled={processingPaymentReturn}
                                variant="primary"
                                className="bg-primary hover:bg-primary/90 border-none"
                            >
                                Ativar Minha Licença
                            </Button>
                        </div>
                    </div>

                    <p className="mt-12 text-gray-500 text-sm text-center max-w-xl">
                        Pagamentos processados de forma segura pelo Mercado Pago.
                        Sua licença será ativada automaticamente após a confirmação do pagamento.
                    </p>

                </main>
            </div>
        </div>
    );
};

export default SubscriptionPage;