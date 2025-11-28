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
        // Polling automático para verificar se a licença foi ativada pelo webhook
        const interval = setInterval(() => {
            if (!license || license.status !== 'ativo') {
                console.log('Polling license status...');
                refreshLicense();
            } else {
                console.log('License active, redirecting to dashboard...');
                navigate(LINKS.DASHBOARD);
            }
        }, 5000); // Verifica a cada 5 segundos

        return () => clearInterval(interval);
    }, [license, refreshLicense, navigate]);

    useEffect(() => {
        // Detectar retorno do Mercado Pago e mostrar mensagem
        const status = searchParams.get('status');
        const paymentId = searchParams.get('payment_id');
        const preapprovalId = searchParams.get('preapproval_id');

        if ((status === 'approved' && paymentId) || preapprovalId) {
            console.log('Retorno do Mercado Pago detectado. Webhook processará o pagamento automaticamente.');
            setProcessingPaymentReturn(true);
        }
    }, [searchParams]);

    const handleManualCheck = async () => {
        if (!user) return;

        setProcessingPaymentReturn(true);
        try {
            console.log('Verificando pagamento manualmente para:', user.id);

            // Chamar a função check-payment que busca no MP
            const { data, error } = await supabase.functions.invoke('check-payment', {
                body: { user_id: user.id }
            });

            console.log('Check result:', { data, error });

            if (error) {
                alert('Erro ao verificar: ' + error.message);
                return;
            }

            if (data?.success) {
                await refreshLicense();
                alert('Pagamento confirmado! Sua licença foi ativada.');
                navigate(LINKS.DASHBOARD);
            } else {
                alert('Nenhum pagamento ou assinatura aprovada encontrada ainda.\n\nSe você acabou de pagar, aguarde 1-2 minutos e tente novamente.');
            }
        } catch (error: any) {
            console.error('Error:', error);
            alert('Erro ao verificar status: ' + (error.message || 'Tente novamente'));
        } finally {
            setProcessingPaymentReturn(false);
        }
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
            if (data && data.init_point) {
                // Redirecionar para o checkout de assinatura
                window.location.href = data.init_point;
            } else {
                throw new Error('Link de pagamento não gerado');
            }

        } catch (error: any) {
            console.error('Error creating subscription:', error);
            alert(`Erro ao criar assinatura: ${error.message || 'Tente novamente.'}`);
        } finally {
            setProcessingPlan(null);
        }
    };

    return (
        <div className="min-h-screen bg-dark text-white flex flex-col">
            <header className="p-6 flex justify-between items-center border-b border-gray-800">
                <div className="flex items-center gap-2">
                    <span className="material-icons text-primary text-3xl">layers</span>
                    <h1 className="text-2xl font-bold tracking-tighter">DSPaving</h1>
                </div>
                <Button
                    variant="secondary"
                    onClick={() => navigate(LINKS.DASHBOARD)}
                    className="flex items-center gap-2"
                >
                    <span className="material-icons text-sm">arrow_back</span>
                    Voltar para Dashboard
                </Button>
            </header>

            <main className="flex-grow flex flex-col items-center justify-center p-6 relative overflow-hidden">
                {/* Background Elements */}
                <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10">
                    <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-3xl animate-pulse"></div>
                    <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
                </div>

                <div className="text-center mb-12 animate-fade-in-up">
                    <h2 className="text-4xl md:text-5xl font-bold mb-4 bg-clip-text text-transparent bg-gradient-to-r from-white to-gray-400">
                        Escolha seu Plano
                    </h2>
                    <p className="text-xl text-gray-400 max-w-2xl mx-auto">
                        Tenha acesso ilimitado a todas as ferramentas de dimensionamento de pavimentos.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 gap-8 max-w-5xl w-full">

                    {/* Monthly Plan */}
                    <div className="bg-dark-light/50 backdrop-blur-xl border border-gray-700 rounded-2xl p-8 flex flex-col hover:border-primary/50 transition-all duration-300 transform hover:-translate-y-1">
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

                {/* Auto-Polling Activation Section */}
                <div className="w-full max-w-4xl mt-12 animate-fade-in-up">
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 text-center">
                        <h3 className="text-lg font-bold text-white mb-2 flex items-center justify-center gap-2">
                            <span className="material-icons text-blue-400 animate-spin">sync</span>
                            Aguardando Confirmação do Pagamento...
                        </h3>
                        <p className="text-gray-300 text-sm mb-4">
                            Assim que o Mercado Pago confirmar seu pagamento, sua licença será ativada automaticamente.
                            <br />
                            Você não precisa fazer nada, apenas aguarde alguns instantes.
                        </p>
                        <div className="flex justify-center gap-4">
                            <Button
                                onClick={handleManualCheck}
                                loading={processingPaymentReturn}
                                disabled={processingPaymentReturn}
                                variant="secondary"
                                className="bg-blue-600/20 hover:bg-blue-600/40 border-blue-500/50"
                            >
                                {processingPaymentReturn ? 'Verificando...' : 'Verificar Pagamento Agora'}
                            </Button>
                        </div>
                    </div>
                </div>

                <p className="mt-12 text-gray-500 text-sm text-center max-w-xl">
                    Pagamentos processados de forma segura pelo Mercado Pago.
                    Sua licença será ativada automaticamente após a confirmação do pagamento.
                </p>
            </main>
        </div>
    );
};

export default SubscriptionPage;