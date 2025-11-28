import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IMAGES, LINKS } from '../constants';
import { Button, Input } from '../components/UI';
import { supabase } from '../lib/supabase';

const LoginPage: React.FC = () => {
    const navigate = useNavigate();
    const { signIn, user } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [formData, setFormData] = useState({
        email: '',
        password: ''
    });

    // Redirect if already logged in
    useEffect(() => {
        if (user) {
            navigate(LINKS.DASHBOARD);
        }
    }, [user, navigate]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFormData({
            ...formData,
            [e.target.id]: e.target.value
        });
        setError('');
    };

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        try {
            const { error: signInError, data } = await signIn(formData.email, formData.password);

            if (signInError) {
                if (signInError.message.includes('Invalid login credentials')) {
                    setError('Email ou senha incorretos');
                } else {
                    setError(signInError.message || 'Erro ao fazer login');
                }
                setLoading(false);
                return;
            }

            if (data.user) {
                // Check license status
                const { data: license } = await supabase
                    .from('licenses')
                    .select('status')
                    .eq('user_id', data.user.id)
                    .single();

                if (license) {
                    if (license.status === 'expirado' || license.status === 'cancelado') {
                        // We could redirect to subscription page or show a warning
                        // For now, let's just go to dashboard where they will see the status
                        navigate(LINKS.DASHBOARD);
                    } else {
                        navigate(LINKS.DASHBOARD);
                    }
                } else {
                    // No license found? Should have been created on register.
                    navigate(LINKS.DASHBOARD);
                }
            }
        } catch (err) {
            setError('Erro inesperado ao fazer login');
            setLoading(false);
        }
    };

    return (
        <div className="flex min-h-screen w-full font-sans bg-secondary-dark">
            {/* Left Side - Image */}
            <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-secondary overflow-hidden">
                <img
                    src={IMAGES.LOGO_SIMPLE}
                    alt="Logo DSPaving"
                    className="absolute top-12 left-1/2 -translate-x-1/2 h-20 w-auto z-20 opacity-80"
                />

                {/* Background Image with Overlay */}
                <div className="absolute inset-0 bg-login-bg bg-cover bg-center opacity-40"></div>
                <div className="absolute inset-0 bg-gradient-to-t from-secondary-dark to-transparent opacity-90"></div>

                <div className="relative z-10 p-12 max-w-xl text-center">
                    <img
                        src={IMAGES.LOGO_ICON}
                        alt="Icone DSPaving"
                        className="h-24 w-24 mx-auto mb-8 drop-shadow-2xl"
                    />
                    <h1 className="font-montserrat text-5xl font-extrabold leading-tight mb-6 text-white">
                        <span className="text-primary">Inovação</span> que <br /> Pavimenta o Futuro.
                    </h1>
                    <p className="text-xl text-gray-300 leading-relaxed font-light">
                        Sua plataforma definitiva para projetos de pavimentação. Gerencie, dimensione e controle com precisão e eficiência.
                    </p>
                </div>
            </div>

            {/* Right Side - Form */}
            <div className="w-full lg:w-1/2 flex items-center justify-center p-6 sm:p-12 bg-white dark:bg-[#121212]">
                <div className="w-full max-w-md">
                    <div className="bg-white dark:bg-secondary p-8 md:p-12 rounded-2xl shadow-2xl border border-gray-200 dark:border-gray-800">
                        <div className="text-center mb-10">
                            <h2 className="font-montserrat text-3xl font-bold text-gray-900 dark:text-white mb-2">Bem-vindo de volta!</h2>
                            <p className="text-gray-500 dark:text-gray-400">
                                Faça login para acessar seu painel.
                            </p>
                        </div>

                        {error && (
                            <div className="mb-6 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                                <p className="text-red-400 text-sm text-center">{error}</p>
                            </div>
                        )}

                        <form onSubmit={handleLogin} className="space-y-6">
                            <Input
                                id="email"
                                type="email"
                                label="E-mail ou Usuário"
                                placeholder="seuemail@exemplo.com"
                                value={formData.email}
                                onChange={handleChange}
                                required
                            />
                            <Input
                                id="password"
                                type="password"
                                label="Senha"
                                placeholder="••••••••"
                                value={formData.password}
                                onChange={handleChange}
                                required
                            />

                            <div className="pt-4">
                                <Button
                                    type="submit"
                                    fullWidth
                                    loading={loading}
                                    disabled={loading}
                                    className="py-4 text-base shadow-orange-500/30"
                                >
                                    {loading ? 'Entrando...' : 'Entrar'}
                                </Button>
                            </div>
                        </form>

                        <div className="mt-8 text-center text-sm space-y-4">
                            <div>
                                <a href="#" className="font-medium text-gray-500 hover:text-primary transition-colors">
                                    Esqueceu a senha?
                                </a>
                            </div>
                            <div className="text-gray-500">
                                Não tem uma conta?{' '}
                                <Link to={LINKS.REGISTER} className="font-bold text-primary hover:text-orange-400">
                                    Cadastre-se
                                </Link>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default LoginPage;