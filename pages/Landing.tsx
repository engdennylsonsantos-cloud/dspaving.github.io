import React from 'react';
import { useNavigate } from 'react-router-dom';
import { IMAGES, LINKS } from '../constants';
import { Button } from '../components/UI';

const LandingPage: React.FC = () => {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen flex flex-col font-sans">
            {/* HERO SECTION */}
            <header className="relative min-h-screen flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 bg-hero-pattern bg-cover bg-center">
                {/* Overlay */}
                <div className="absolute inset-0 bg-black/70 z-10"></div>

                <div className="relative z-20 max-w-5xl w-full text-center text-white">
                    <div className="mb-10 animate-fade-in-down">
                        <img 
                            src={IMAGES.LOGO_VERTICAL} 
                            alt="Logotipo DSPaving" 
                            className="w-48 mx-auto" 
                        />
                    </div>
                    
                    <h1 className="font-condensed text-5xl md:text-7xl lg:text-8xl font-bold uppercase tracking-wider mb-6 leading-tight drop-shadow-lg">
                        A Revolução em <br className="hidden md:block"/> Projetos de Pavimentação
                    </h1>
                    
                    <p className="font-sans text-lg md:text-2xl text-gray-300 max-w-3xl mx-auto mb-12 font-light">
                        Projete, dimensione e otimize suas rotas com precisão e eficiência incomparáveis. 
                        O futuro da engenharia rodoviária está aqui.
                    </p>
                    
                    <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                        <Button 
                            onClick={() => navigate(LINKS.LOGIN)} 
                            className="w-full sm:w-auto text-lg py-4 px-10"
                            icon={<span className="material-icons">login</span>}
                        >
                            Login
                        </Button>
                        <Button 
                            variant="secondary"
                            onClick={() => navigate(LINKS.REGISTER)}
                            className="w-full sm:w-auto text-lg py-4 px-10 bg-gray-700 hover:bg-gray-600"
                            icon={<span className="material-icons">person_add</span>}
                        >
                            Cadastre-se
                        </Button>
                    </div>
                </div>
            </header>

            {/* FEATURES SECTION */}
            <section className="py-20 md:py-32 bg-secondary-dark relative">
                <div className="absolute inset-0 bg-asphalt-texture opacity-20 pointer-events-none"></div>
                <div className="container mx-auto px-6 lg:px-8 relative z-10">
                    <div className="grid md:grid-cols-3 gap-8 md:gap-12 text-center">
                        {/* Feature 1 */}
                        <div className="bg-secondary p-8 rounded-xl border border-gray-700 shadow-xl hover:border-primary/50 transition-colors duration-300 group">
                            <span className="material-icons text-primary text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">straighten</span>
                            <h3 className="font-condensed text-3xl font-bold mb-4 text-white uppercase">Dimensionamento Preciso</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Calcule espessuras de camadas e materiais com base nos métodos mais atualizados do DNIT, garantindo segurança e durabilidade.
                            </p>
                        </div>
                        
                        {/* Feature 2 */}
                        <div className="bg-secondary p-8 rounded-xl border border-gray-700 shadow-xl hover:border-primary/50 transition-colors duration-300 group">
                            <span className="material-icons text-primary text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">map</span>
                            <h3 className="font-condensed text-3xl font-bold mb-4 text-white uppercase">Traçado por Ortofoto</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Utilize imagens de satélite georreferenciadas para traçar rotas de forma intuitiva e visualizar seu projeto no mundo real.
                            </p>
                        </div>
                        
                        {/* Feature 3 */}
                        <div className="bg-secondary p-8 rounded-xl border border-gray-700 shadow-xl hover:border-primary/50 transition-colors duration-300 group">
                            <span className="material-icons text-primary text-6xl mb-6 group-hover:scale-110 transition-transform duration-300">terrain</span>
                            <h3 className="font-condensed text-3xl font-bold mb-4 text-white uppercase">Projetos com Altimetria</h3>
                            <p className="text-gray-400 leading-relaxed">
                                Incorpore dados de elevação para gerar perfis longitudinais e transversais detalhados, otimizando cortes e aterros.
                            </p>
                        </div>
                    </div>
                </div>
            </section>

            {/* CTA SECTION */}
            <section className="py-20 md:py-32 bg-[#1E1E1E] text-center border-t border-gray-800">
                <div className="container mx-auto px-6 lg:px-8">
                    <h2 className="font-condensed text-4xl md:text-6xl font-bold text-white uppercase mb-6">
                        Veja o poder em cada detalhe
                    </h2>
                    <p className="text-lg md:text-xl text-gray-400 max-w-3xl mx-auto mb-12">
                        Assista a uma demonstração e descubra como o DSPaving pode transformar seus projetos, economizando tempo e recursos.
                    </p>
                    <Button 
                        onClick={() => alert("Vídeo de demonstração indisponível na versão demo.")}
                        className="text-xl py-4 px-12 shadow-2xl shadow-primary/20"
                        icon={<span className="material-icons text-3xl">play_circle</span>}
                    >
                        Software DSPaving em Ação
                    </Button>
                </div>
            </section>

            {/* FOOTER */}
            <footer className="py-8 bg-black text-gray-500 text-center border-t border-gray-900">
                <div className="container mx-auto px-6">
                    <p className="font-medium">© 2024 DSPaving. Todos os direitos reservados.</p>
                </div>
            </footer>
        </div>
    );
};

export default LandingPage;