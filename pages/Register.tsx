import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { IMAGES, LINKS } from '../constants';
import { Button, Input, Checkbox } from '../components/UI';
import { formatCPF, formatCNPJ, formatPhone, validateCPF, validateCNPJ } from '../lib/formatters';
import { supabase } from '../lib/supabase';

// Conteúdo dos Termos (Poderia vir de um arquivo separado ou CMS)
const TERMS_CONTENT = `
1. ACEITAÇÃO
Ao utilizar o software DSPaving, você concorda com estes termos.

2. LICENÇA
Concedemos uma licença limitada, não exclusiva e intransferível.

3. USO
O software é para uso profissional em projetos de pavimentação.

4. PAGAMENTOS
As assinaturas são renovadas automaticamente até o cancelamento.

5. RESPONSABILIDADE
Não nos responsabilizamos por erros de cálculo decorrentes de dados incorretos inseridos.
`;

const RegisterPage: React.FC = () => {
    const navigate = useNavigate();
    const { signUp } = useAuth();
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>('');
    const [showTerms, setShowTerms] = useState(false);

    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: '',
        document: '', // CPF or CNPJ
        phone: '',
        termsAccepted: false
    });

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        let value = e.target.value;
        const id = e.target.id;

        // Auto-format fields
        if (id === 'document') {
            // Remove non-digits
            const digits = value.replace(/\D/g, '');
            if (digits.length <= 11) {
                value = formatCPF(digits);
            } else {
                value = formatCNPJ(digits);
            }
        } else if (id === 'phone') {
            value = formatPhone(value);
        } else if (id === 'termsAccepted') {
            setFormData({
                ...formData,
                termsAccepted: e.target.checked
            });
            return;
        }

        setFormData({
            ...formData,
            [id]: value
        });
        setError('');
    };

    const handleRegister = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');

        // Validação
        if (formData.password !== formData.confirmPassword) {
            setError('As senhas não coincidem');
            return;
        }

        if (formData.password.length < 6) {
            setError('A senha deve ter pelo menos 6 caracteres');
            return;
        }

        if (!formData.termsAccepted) {
            setError('Você precisa aceitar os termos de uso');
            return;
        }

        // Validar CPF/CNPJ
        const cleanDoc = formData.document.replace(/\D/g, '');
        if (cleanDoc.length === 11) {
            if (!validateCPF(cleanDoc)) {
                setError('CPF inválido');
                return;
            }
        } else if (cleanDoc.length === 14) {
            if (!validateCNPJ(cleanDoc)) {
                setError('CNPJ inválido');
                return;
            }
        } else {
            setError('CPF ou CNPJ inválido');
            return;
        }

        setLoading(true);

        try {
            // 1. Create Auth User
            const { data: authData, error: signUpError } = await signUp(
                formData.email,
                formData.password,
                {
                    full_name: formData.name,
                    terms_accepted: true,
                    accepted_at: new Date().toISOString(),
                    terms_content: TERMS_CONTENT, // Enviar o texto completo dos termos
                    cpf: formData.document,
                    phone: formData.phone
                }
            );

            if (signUpError) {
                if (signUpError.message.includes('already registered')) {
                    setError('Este email já está cadastrado');
                } else {
                    setError(signUpError.message || 'Erro ao criar conta');
                }
                setLoading(false);
                return;
            }

            if (authData.user) {
                // 2. Update Profile with extra data
                const { error: profileError } = await supabase
                    .from('profiles')
                    .update({
                        cpf: formData.document, // We store in 'cpf' column but it can be CNPJ too based on user request context, or we should rename column. Assuming 'cpf' stores document.
                        telefone: formData.phone
                    })
                    .eq('id', authData.user.id);

                if (profileError) {
                    console.error('Error updating profile:', profileError);
                    // Continue anyway, user is created
                }

                // 3. Update License with terms acceptance (will be done via trigger or we update here if column exists)
                // Since we need to create the column first, we'll assume the trigger handles basic creation
                // and we might update it later or pass via metadata as done above.
            }

            // Sucesso - redirecionar para dashboard
            navigate(LINKS.DASHBOARD);
        } catch (err) {
            console.error(err);
            setError('Erro inesperado ao criar conta');
            setLoading(false);
        }
    };

    return (
        <div className="relative min-h-screen flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 font-sans bg-secondary-dark overflow-hidden">
            {/* Background Texture */}
            <div className="absolute inset-0 bg-asphalt-texture opacity-30 z-0"></div>
            <div className="absolute inset-0 bg-black/60 z-0"></div>

            <main className="relative z-10 w-full max-w-md space-y-8 animate-fade-in-up">
                <div className="text-center">
                    <img
                        src={IMAGES.LOGO_SIMPLE}
                        alt="Logotipo DSPaving"
                        className="mx-auto h-24 w-auto drop-shadow-lg"
                    />
                    <h2 className="mt-6 text-3xl font-bold tracking-tight text-white font-montserrat">
                        Crie sua conta
                    </h2>
                    <p className="mt-2 text-sm text-gray-400">
                        Já tem uma conta?{' '}
                        <Link to={LINKS.LOGIN} className="font-medium text-primary hover:text-orange-400 transition-colors">
                            Faça login aqui
                        </Link>
                    </p>
                </div>

                <div className="bg-secondary/90 backdrop-blur-md p-8 rounded-xl shadow-2xl border border-gray-700">
                    {error && (
                        <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 rounded-lg">
                            <p className="text-red-400 text-sm text-center">{error}</p>
                        </div>
                    )}

                    <form onSubmit={handleRegister} className="space-y-4">
                        <Input
                            id="name"
                            type="text"
                            placeholder="Nome Completo"
                            value={formData.name}
                            onChange={handleChange}
                            required
                            className="bg-secondary-dark border-gray-600 focus:border-primary"
                        />
                        <Input
                            id="document"
                            type="text"
                            placeholder="CPF ou CNPJ"
                            value={formData.document}
                            onChange={handleChange}
                            required
                            maxLength={18}
                            className="bg-secondary-dark border-gray-600 focus:border-primary"
                        />
                        <Input
                            id="phone"
                            type="text"
                            placeholder="Telefone (xx) xxxxx-xxxx"
                            value={formData.phone}
                            onChange={handleChange}
                            required
                            maxLength={15}
                            className="bg-secondary-dark border-gray-600 focus:border-primary"
                        />
                        <Input
                            id="email"
                            type="email"
                            placeholder="Endereço de e-mail"
                            value={formData.email}
                            onChange={handleChange}
                            required
                            className="bg-secondary-dark border-gray-600 focus:border-primary"
                        />
                        <Input
                            id="password"
                            type="password"
                            placeholder="Senha (mínimo 6 caracteres)"
                            value={formData.password}
                            onChange={handleChange}
                            required
                            className="bg-secondary-dark border-gray-600 focus:border-primary"
                        />
                        <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirmar Senha"
                            value={formData.confirmPassword}
                            onChange={handleChange}
                            required
                            className="bg-secondary-dark border-gray-600 focus:border-primary"
                        />

                        <div className="flex items-center pt-2">
                            <Checkbox
                                id="termsAccepted"
                                checked={formData.termsAccepted}
                                onChange={handleChange}
                                label={
                                    <span>
                                        Li e aceito os <button type="button" onClick={() => setShowTerms(true)} className="text-primary hover:underline">Termos de Uso</button> e Política de Privacidade.
                                    </span>
                                }
                            />
                        </div>

                        <div className="pt-4">
                            <Button
                                type="submit"
                                fullWidth
                                loading={loading}
                                disabled={loading}
                                className="font-bold py-3 text-white bg-primary hover:bg-orange-600 shadow-lg shadow-orange-900/50"
                            >
                                {loading ? 'Criando conta...' : 'Cadastrar'}
                            </Button>
                        </div>
                    </form>
                </div>
            </main>

            {/* Modal de Termos */}
            {showTerms && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                    <div className="bg-secondary border border-gray-700 rounded-xl max-w-2xl w-full max-h-[80vh] flex flex-col shadow-2xl">
                        <div className="p-6 border-b border-gray-700 flex justify-between items-center">
                            <h3 className="text-xl font-bold text-white">Termos de Uso</h3>
                            <button onClick={() => setShowTerms(false)} className="text-gray-400 hover:text-white">
                                <span className="material-icons">close</span>
                            </button>
                        </div>
                        <div className="p-6 overflow-y-auto text-gray-300 space-y-4 text-sm leading-relaxed">
                            <p><strong>1. Aceitação dos Termos</strong><br />Ao criar uma conta no DSPaving, você concorda com estes termos de serviço e nossa política de privacidade.</p>
                            <p><strong>2. Licença de Uso</strong><br />Concedemos a você uma licença limitada, não exclusiva e intransferível para usar nosso software de acordo com o plano escolhido.</p>
                            <p><strong>3. Responsabilidades</strong><br />Você é responsável por manter a confidencialidade de sua conta e senha. O uso do software para fins ilegais é estritamente proibido.</p>
                            <p><strong>4. Cancelamento</strong><br />Você pode cancelar sua assinatura a qualquer momento. O acesso continuará até o fim do período pago.</p>
                            <p><strong>5. Modificações</strong><br />Reservamo-nos o direito de modificar estes termos a qualquer momento, notificando os usuários sobre mudanças significativas.</p>
                        </div>
                        <div className="p-6 border-t border-gray-700 flex justify-end">
                            <Button onClick={() => setShowTerms(false)}>Fechar</Button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default RegisterPage;