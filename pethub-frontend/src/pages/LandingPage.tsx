import React from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { 
  ArrowRight, 
  Check, 
  CheckCircle2, 
  Star, 
  Calendar, 
  ChevronRight, 
  PawPrint, 
  Dog, 
  Cat, 
  Heart, 
  Bone, 
  Stethoscope, 
  DollarSign, 
  ArrowDown,
  Building2,
  Sparkles,
  Clock,
  ShieldCheck,
  QrCode
} from 'lucide-react';
import { FluidText } from '../components/ui/FluidText';
import { availablePlans } from '@/data/plans';
import { useAuthStore } from '@/store/authStore';

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: 'easeOut' as any } },
};

const stagger = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const testimonials = [
  {
    name: 'Leonardo S.',
    city: 'Ourinhos, SP',
    text: 'O PetHub mudou completamente como cuido do Thor. Tudo no mesmo lugar, super fácil de usar!',
    stars: 5,
    avatar: 'https://i.pravatar.cc/100?img=11',
  },
  {
    name: 'Maria C.',
    city: 'São Paulo, SP',
    text: 'Finalmente consegui encontrar uma veterinária confiável perto de casa. Serviço incrível!',
    stars: 5,
    avatar: 'https://i.pravatar.cc/100?img=5',
  },
  {
    name: 'Roberto L.',
    city: 'Campinas, SP',
    text: 'O cashback é fantástico. Já economizei muito usando a plataforma para meus dois cachorros.',
    stars: 5,
    avatar: 'https://i.pravatar.cc/100?img=8',
  },
];

export default function LandingPage() {
  const navigate = useNavigate();
  const { isAuthenticated, currentRole } = useAuthStore();

  return (
    <div className="min-h-screen bg-neutral-900 text-white font-sans selection:bg-orange-500/30">
      
      {/* NAVBAR */}
      <nav className="fixed top-0 inset-x-0 z-50 bg-neutral-900/80 backdrop-blur-xl border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between">
          <div className="flex items-center gap-2 cursor-pointer" onClick={() => window.scrollTo(0, 0)}>
            <div className="w-10 h-10 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/20">
              <PawPrint size={20} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">Pet<span className="text-orange-400">Hub</span></span>
          </div>
          
          <div className="hidden md:flex items-center gap-8 text-sm font-medium text-neutral-400">
            <a href="#servicos" className="hover:text-white transition-colors">Serviços</a>
            <a href="#como-funciona" className="hover:text-white transition-colors">Como funciona</a>
            <a href="#planos" className="hover:text-white transition-colors">Planos</a>
          </div>

          <div className="flex items-center gap-4">
            {isAuthenticated ? (
              <button 
                onClick={() => navigate(`/${currentRole || 'tutor'}`)}
                className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 cursor-pointer flex items-center gap-2"
              >
                <span>Meu Painel</span>
                <ArrowRight size={16} />
              </button>
            ) : (
              <>
                <button 
                  onClick={() => navigate('/auth/login')}
                  className="text-sm font-medium text-neutral-300 hover:text-white transition-colors hidden sm:block cursor-pointer"
                >
                  Entrar
                </button>
                <button 
                  onClick={() => navigate('/auth/register')}
                  className="px-5 py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-orange-500/25 cursor-pointer"
                >
                  Criar conta grátis
                </button>
              </>
            )}
          </div>
        </div>
      </nav>

      {/* HERO SECTION */}
      <section className="relative min-h-screen pt-32 pb-20 md:pt-40 md:pb-28 flex flex-col items-center justify-center overflow-hidden bg-neutral-900">
        {/* Background Decorative Elements - Static/Simple for performance */}
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          <div className="absolute top-20 left-[10%] w-64 h-64 bg-orange-500/5 rounded-full blur-[80px]" />
          <div className="absolute top-40 right-[15%] w-80 h-80 bg-neutral-500/5 rounded-full blur-[100px]" />
          <div className="absolute bottom-10 left-[20%] w-96 h-96 bg-orange-600/5 rounded-full blur-[120px]" />
          
          <PawPrint className="absolute top-32 left-[15%] text-white/5 -rotate-12 w-12 h-12" />
          <Heart className="absolute top-40 right-[20%] text-white/5 rotate-12 w-8 h-8" />
          <Dog className="absolute bottom-32 left-[25%] text-white/5 -rotate-6 w-16 h-16" />
        </div>

        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full flex-1 flex flex-col justify-center">
          <div className="grid lg:grid-cols-2 gap-12 lg:gap-8 items-center">
            
            {/* Hero Text */}
            <motion.div
              initial="hidden"
              animate="visible"
              variants={stagger}
              className="text-center lg:text-left z-10"
            >
              <motion.div variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-400 text-sm font-medium mb-6">
                <Star size={14} className="fill-current" />
                Nova plataforma pet de Ourinhos-SP
              </motion.div>
              
              <motion.div variants={fadeUp} className="relative inline-block w-full">
                {/* O EFEITO DE BLUR LARANJA ATRÁS DO TEXTO - SUTIL E DIFUSO */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[120%] h-[120%] bg-orange-500/10 blur-[120px] rounded-full pointer-events-none -z-10" />
                
                <h1 className="text-5xl sm:text-6xl lg:text-7xl font-extrabold text-white tracking-tight mb-6 leading-[1.1] relative z-10">
                  <span>O universo pet</span>{' '}
                  <span className="block mt-1 sm:mt-2 h-[56px] sm:h-[76px] md:h-[88px] lg:h-[104px] w-full max-w-[620px] mx-auto lg:mx-0">
                    <FluidText
                      text="na palma da sua mão"
                      className="w-full h-full"
                      fontWeight={800}
                      fontFamily="inherit"
                      color="#F97316"
                      accentColor="#FB923C"
                      splatRadius={0.0045}
                      splatForce={6000}
                      curl={28}
                    />
                  </span>
                </h1>
              </motion.div>
              
              <motion.p variants={fadeUp} className="text-lg text-neutral-400 mb-8 max-w-2xl mx-auto lg:mx-0">
                Conecte-se com os melhores pet shops, clínicas veterinárias e profissionais da sua região. Agende serviços, gerencie a saúde do seu pet e aproveite benefícios exclusivos.
              </motion.p>
              
              <motion.div variants={fadeUp} className="flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-4">
                <button 
                  onClick={() => navigate('/auth/register')}
                  className="w-full sm:w-auto px-8 py-4 bg-orange-500 text-white font-bold rounded-2xl shadow-[0_8px_32px_-8px_rgba(249,115,22,0.5)] flex items-center justify-center gap-2 hover:bg-orange-600 hover:scale-[1.02] hover:shadow-[0_12px_40px_-8px_rgba(249,115,22,0.6)] active:scale-95 transition-all duration-200"
                >
                  Criar conta grátis
                  <ArrowRight size={20} />
                </button>
                <button 
                  onClick={() => navigate('/auth/login')}
                  className="w-full sm:w-auto px-8 py-4 bg-white/5 text-white font-semibold rounded-2xl border border-white/10 flex items-center justify-center hover:bg-white/10 hover:scale-[1.02] hover:border-white/20 active:scale-95 transition-all duration-200"
                >
                  Já tenho conta
                </button>
              </motion.div>

              <motion.div variants={fadeUp} className="mt-10 flex items-center justify-center lg:justify-start gap-4">
                <div className="flex -space-x-3">
                  {[1, 2, 3, 4].map(n => (
                    <img key={n} src={`https://i.pravatar.cc/100?img=${n+10}`} alt="" className="w-10 h-10 rounded-full border-2 border-neutral-900 grayscale" />
                  ))}
                </div>
                <div className="text-sm">
                  <div className="flex gap-0.5 text-amber-400 mb-0.5">
                    {[...Array(5)].map((_, idx) => (
                      <Star key={idx} size={12} className="fill-amber-400 text-amber-400" />
                    ))}
                  </div>
                  <p className="text-neutral-500 font-medium">XxX tutores satisfeitos</p>
                </div>
              </motion.div>
            </motion.div>

            {/* Hero Visual */}
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 100, damping: 20, delay: 0.2 }}
              className="relative mx-auto w-full max-w-lg lg:max-w-none"
            >
              {/* Main Glass Card */}
              <div className="relative bg-white/5 backdrop-blur-xl border border-white/10 rounded-3xl p-6 shadow-2xl z-20 hover:-translate-y-1 transition-transform duration-300">
                <div className="flex items-center gap-4 mb-6">
                  <div className="relative">
                    {/* Imagem Premium do Golden Retriever */}
                    <img src="/premium-golden.jpg" alt="Thor" className="w-16 h-16 rounded-2xl object-cover bg-white" />
                    <div className="absolute -bottom-2 -right-2 bg-orange-500 w-6 h-6 rounded-lg flex items-center justify-center border-2 border-neutral-900">
                      <PawPrint size={12} className="text-white" />
                    </div>
                  </div>
                  <div>
                    <h3 className="text-white font-bold text-xl">Thor</h3>
                    <p className="text-neutral-400 text-sm">Golden Retriever · 3 anos</p>
                  </div>
                  <div className="ml-auto px-3 py-1 bg-green-500/20 text-green-400 rounded-full text-xs font-semibold flex items-center gap-1.5 border border-green-500/30">
                    <CheckCircle2 size={12} />
                    Vacinas em dia
                  </div>
                </div>

                <div className="bg-neutral-900/50 rounded-2xl p-4 border border-white/5 mb-4 hover:bg-neutral-800/50 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className="bg-orange-500/20 p-2 rounded-xl text-orange-400">
                      <Calendar size={18} />
                    </div>
                    <div>
                      <p className="text-orange-400 text-xs font-semibold uppercase tracking-wider mb-1">Próximo agendamento</p>
                      <p className="text-white font-medium text-sm mb-1">Banho + Tosa • PetCare Ourinhos</p>
                      <p className="text-neutral-500 text-xs">10 de setembro - 09:00</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  {['Banho', 'Vacina', 'Consulta'].map(t => (
                    <div key={t} className="bg-white/5 border border-white/5 text-neutral-300 text-xs text-center py-2 rounded-xl font-medium flex items-center justify-center gap-1 hover:bg-white/10 transition-colors cursor-pointer">
                      {t === 'Banho' ? <Check size={12} className="text-green-400" /> : <ChevronRight size={12} />} {t}
                    </div>
                  ))}
                </div>
              </div>

              {/* Floating Badge 1 - Cashback (Subtle breathing) */}
              <motion.div 
                animate={{ y: [-4, 4, -4] }}
                transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
                className="absolute -top-6 -right-6 lg:-right-12 bg-white rounded-2xl p-4 shadow-xl z-30"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-orange-100 p-2 rounded-full text-orange-600">
                    <DollarSign size={20} />
                  </div>
                  <div>
                    <p className="text-neutral-500 text-xs font-medium">Cashback</p>
                    <p className="text-neutral-900 font-bold">R$0,00</p>
                  </div>
                </div>
              </motion.div>

              {/* Floating Badge 2 - Rating 5.0 (Subtle breathing) */}
              <motion.div 
                animate={{ y: [4, -4, 4] }}
                transition={{ duration: 7, repeat: Infinity, ease: "easeInOut", delay: 1 }}
                className="absolute -bottom-6 -left-6 lg:-left-12 bg-white rounded-2xl p-4 shadow-xl z-30 hidden sm:block"
              >
                <div className="flex items-center gap-3">
                  <div className="flex flex-col text-center px-1">
                    <p className="text-neutral-400 text-[10px] font-bold uppercase tracking-widest mb-1">Avaliação</p>
                    <div className="flex items-center gap-1 font-black text-xl text-neutral-900">
                      <Star size={16} className="fill-orange-400 text-orange-400" />
                      5.0<span className="text-neutral-400 text-sm">/5.0</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          </div>
        </div>

        {/* Scroll Indicator */}
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1, duration: 1 }}
          className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-white/50 hover:text-white transition-colors cursor-pointer"
          onClick={() => document.getElementById('servicos')?.scrollIntoView({ behavior: 'smooth' })}
        >
          <span className="text-xs uppercase tracking-widest font-medium">Explore o universo PetHub</span>
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
          >
            <ArrowDown size={16} />
          </motion.div>
        </motion.div>
      </section>

      {/* ---- SERVICES SECTION ---- */}
      <section id="servicos" className="py-24 bg-white text-neutral-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">
              Tudo que seu pet precisa
            </motion.h2>
            <motion.p variants={fadeUp} className="text-lg text-neutral-500 max-w-2xl mx-auto">
              Centralizamos os melhores serviços e facilidades em um só lugar.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              { title: 'Histórico de Vacinas', desc: 'Nunca mais esqueça as datas. Receba alertas antes de vencerem.', icon: <Stethoscope size={24} /> },
              { title: 'Agendamento Simples', desc: 'Marque banho, tosa e consultas em poucos cliques, a qualquer momento.', icon: <Calendar size={24} /> },
              { title: 'Benefícios e Cashback', desc: 'Ganhe parte do valor de volta em serviços para usar como quiser.', icon: <DollarSign size={24} /> },
            ].map((s, i) => (
              <motion.div
                key={s.title}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 30 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 50 }}
                className="bg-neutral-50 rounded-3xl p-8 border border-neutral-100 hover:border-orange-200 hover:shadow-lg hover:shadow-orange-100 transition-all group"
              >
                <div className="w-14 h-14 bg-orange-100 text-orange-500 rounded-2xl flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                  {s.icon}
                </div>
                <h3 className="text-xl font-bold mb-3">{s.title}</h3>
                <p className="text-neutral-500">{s.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- COMO FUNCIONA ---- */}
      <section id="como-funciona" className="py-24 bg-neutral-900 text-white border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-500/20 bg-orange-500/10 text-orange-400 text-xs font-bold uppercase tracking-wider mb-4">
              Passo a Passo
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Como funciona o PetHub
            </motion.h2>
            <motion.p variants={fadeUp} className="text-neutral-400 text-base max-w-2xl mx-auto">
              Cuidar do seu animal de estimação em Ourinhos ficou muito mais simples, integrado e seguro.
            </motion.p>
          </motion.div>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              {
                step: '01',
                title: 'Escolha um plano de cuidados',
                desc: 'Selecione o plano ideal para a rotina de saúde, banho e tosa do seu pet com cobertura mensal.',
                icon: <PawPrint size={22} />,
              },
              {
                step: '02',
                title: 'Parceiros credenciados',
                desc: 'Conte com estabelecimentos e profissionais parceiros credenciados e avaliados em Ourinhos.',
                icon: <Building2 size={22} />,
              },
              {
                step: '03',
                title: 'Agende com antecedência',
                desc: 'Marque atendimentos e procedimentos cobertos direto pela plataforma de forma rápida e prática.',
                icon: <Calendar size={22} />,
              },
              {
                step: '04',
                title: 'Atendimento presencial',
                desc: 'Leve seu pet ou solicite o transporte, com acompanhamento dedicado por profissionais qualificados.',
                icon: <CheckCircle2 size={22} />,
              },
              {
                step: '05',
                title: 'Histórico digital e vacinas',
                desc: 'Acompanhe todo o prontuário de saúde, registros de vacinas e benefícios utilizados na palma da mão.',
                icon: <Clock size={22} />,
              },
              {
                step: '06',
                title: 'Gestão justa e segura',
                desc: 'O PetHub gerencia a cobertura dos planos e garante remuneração justa aos parceiros participantes.',
                icon: <ShieldCheck size={22} />,
              },
            ].map((item, i) => (
              <motion.div
                key={item.step}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 30 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.1, duration: 0.5 }}
                className="bg-neutral-800/60 border border-white/10 rounded-3xl p-6 hover:border-orange-500/40 hover:bg-neutral-800 transition-all flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-5">
                    <div className="w-12 h-12 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center">
                      {item.icon}
                    </div>
                    <span className="text-2xl font-black text-white/20">{item.step}</span>
                  </div>
                  <h3 className="text-lg font-bold text-white mb-2">{item.title}</h3>
                  <p className="text-xs sm:text-sm text-neutral-400 leading-relaxed">{item.desc}</p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- PLANOS ---- */}
      <section id="planos" className="py-24 bg-white text-neutral-900 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.span variants={fadeUp} className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-orange-200 bg-orange-50 text-orange-600 text-xs font-bold uppercase tracking-wider mb-4">
              Planos & Assinaturas
            </motion.span>
            <motion.h2 variants={fadeUp} className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight mb-4">
              Escolha o plano ideal para você
            </motion.h2>
            <motion.p variants={fadeUp} className="text-neutral-500 text-base max-w-2xl mx-auto">
              Cada plano possui regras e benefícios próprios para atender às necessidades do seu pet.
            </motion.p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8 items-stretch">
            {availablePlans.map((plan, i) => {
              const isPopular = plan.id === 'plan-2';
              return (
                <motion.div
                  key={plan.id}
                  whileInView={{ opacity: 1, y: 0 }}
                  initial={{ opacity: 0, y: 30 }}
                  viewport={{ once: true, margin: "-50px" }}
                  transition={{ delay: i * 0.15, duration: 0.5 }}
                  className={`relative rounded-3xl p-8 flex flex-col justify-between transition-all ${
                    isPopular
                      ? 'bg-neutral-900 text-white shadow-2xl ring-2 ring-orange-500'
                      : 'bg-neutral-50 border border-neutral-200/80 text-neutral-900 hover:shadow-lg'
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-3.5 left-1/2 -translate-x-1/2 px-4 py-1 bg-orange-500 text-white text-xs font-extrabold uppercase tracking-wider rounded-full shadow-md">
                      Mais Escolhido
                    </div>
                  )}

                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className={`text-xl font-bold ${isPopular ? 'text-white' : 'text-neutral-900'}`}>
                        {plan.name}
                      </h3>
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold bg-orange-500/10 text-orange-500 border border-orange-500/20">
                        Plano PetHub
                      </span>
                    </div>

                    <div className="flex items-baseline gap-1 mb-6">
                      <span className="text-sm font-bold opacity-60">R$</span>
                      <span className="text-4xl font-extrabold tracking-tight">
                        {plan.price}
                      </span>
                      <span className="text-xs font-semibold opacity-60">/mês</span>
                    </div>

                    {/* Benefícios */}
                    <div className="space-y-3 pt-4 border-t border-neutral-200/50 dark:border-neutral-800">
                      <p className={`text-xs font-bold uppercase tracking-wider ${isPopular ? 'text-orange-400' : 'text-neutral-500'}`}>
                        Benefícios Inclusos
                      </p>
                      {plan.benefits.map((b, bIdx) => (
                        <div key={bIdx} className="flex items-start gap-2.5 text-xs sm:text-sm">
                          <Check size={16} className="text-orange-500 shrink-0 mt-0.5" />
                          <span className={isPopular ? 'text-neutral-300' : 'text-neutral-700'}>{b}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ---- TESTIMONIALS ---- */}
      <section className="py-24 bg-neutral-50 text-neutral-900 border-t border-neutral-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <motion.div
            whileInView="visible"
            initial="hidden"
            viewport={{ once: true, margin: "-100px" }}
            variants={stagger}
            className="text-center mb-16"
          >
            <motion.h2 variants={fadeUp} className="text-4xl font-bold mb-4">
              O que dizem nossos tutores
            </motion.h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-6">
            {testimonials.map((t, i) => (
              <motion.div
                key={t.name}
                whileInView={{ opacity: 1, y: 0 }}
                initial={{ opacity: 0, y: 30 }}
                viewport={{ once: true, margin: "-50px" }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 50 }}
                className="bg-white rounded-3xl p-8 shadow-sm border border-neutral-100"
              >
                <div className="flex gap-1 text-amber-400 mb-4">
                  {[...Array(t.stars)].map((_, sIdx) => (
                    <Star key={sIdx} size={16} className="fill-amber-400 text-amber-400" />
                  ))}
                </div>
                <p className="text-neutral-600 mb-8 italic leading-relaxed">"{t.text}"</p>
                <div className="flex items-center gap-4">
                  <img src={t.avatar} alt={t.name} className="w-12 h-12 rounded-full border border-neutral-200" />
                  <div>
                    <p className="font-bold text-neutral-900">{t.name}</p>
                    <p className="text-neutral-500 text-sm">{t.city}</p>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- CTA ---- */}
      <section className="py-32 bg-neutral-900 relative overflow-hidden">
        <div className="absolute inset-0">
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-orange-600/20 rounded-full blur-[120px]" />
        </div>
        <motion.div
          whileInView={{ opacity: 1, y: 0 }}
          initial={{ opacity: 0, y: 30 }}
          viewport={{ once: true, margin: "-100px" }}
          transition={{ duration: 0.8 }}
          className="relative max-w-3xl mx-auto px-4 text-center"
        >
          <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-orange-500/30">
            <PawPrint size={40} className="text-white" />
          </div>
          <h2 className="text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white mb-6 tracking-tight">
            Pronto para cuidar melhor do seu pet?
          </h2>
          <p className="text-white/60 text-lg mb-12">
            Junte-se a tutores de todo o Brasil que já descobriram a forma mais moderna de cuidar dos seus animais.
          </p>
          <button
            onClick={() => navigate('/auth/register')}
            className="px-10 py-5 bg-orange-500 text-white font-bold text-lg rounded-2xl shadow-[0_8px_32px_-8px_rgba(249,115,22,0.5)] flex items-center gap-3 mx-auto hover:bg-orange-600 hover:scale-[1.02] hover:shadow-[0_12px_40px_-8px_rgba(249,115,22,0.7)] active:scale-95 transition-all duration-200"
          >
            Criar conta grátis
            <ArrowRight size={22} />
          </button>
        </motion.div>
      </section>

      {/* ---- FOOTER ---- */}
      <footer className="bg-neutral-950 py-12 border-t border-white/10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 bg-gradient-to-br from-orange-400 to-orange-600 rounded-xl flex items-center justify-center">
                <PawPrint size={16} className="text-white" />
              </div>
              <span className="text-lg font-bold text-white">Pet<span className="text-orange-400">Hub</span></span>
            </div>
            <div className="flex gap-6 text-sm text-white/40 font-medium">
              <a href="#" className="hover:text-white/90 transition-colors">Termos de Uso</a>
              <a href="#" className="hover:text-white/90 transition-colors">Privacidade</a>
              <a href="#" className="hover:text-white/90 transition-colors">Suporte</a>
              <a href="#" className="hover:text-white/90 transition-colors">Blog</a>
            </div>
            <p className="text-white/30 text-sm">© 2026 PetHub. Todos os direitos reservados.</p>
          </div>
        </div>
      </footer>

    </div>
  );
}
