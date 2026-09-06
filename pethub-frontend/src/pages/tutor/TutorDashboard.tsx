import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, Calendar, ChevronRight, MapPin, Star, ArrowRight,
  PawPrint, Clock, CheckCircle2, AlertTriangle, Plus, Store
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Badge, Card, Avatar } from '@/components/ui';
import type { TutorProfile } from '@/types';

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const speciesEmoji: Record<string, string> = {
  dog: '🐕', cat: '🐈', bird: '🦜', rabbit: '🐇', other: '🐾',
};

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'brand' | 'error'; dot: boolean }> = {
  CONFIRMED: { label: 'Confirmado', variant: 'success', dot: true },
  PENDING: { label: 'Pendente', variant: 'warning', dot: true },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info', dot: true },
  COMPLETED: { label: 'Concluído', variant: 'success', dot: false },
  CANCELLED: { label: 'Cancelado', variant: 'error', dot: false },
};

const quickActions = [
  { icon: '📅', label: 'Agendar', to: '/tutor/booking', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200' },
  { icon: '💉', label: 'Vacinas', to: '/tutor/pets', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200' },
  { icon: '🏡', label: 'Hospedagem', to: '/tutor/explore?cat=hospedagem', color: 'bg-green-50 hover:bg-green-100 border-green-200' },
  { icon: '🛍️', label: 'Loja', to: '/tutor/shop', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200' },
  { icon: '💬', label: 'Chat', to: '/tutor/chat', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200' },
  { icon: '⭐', label: 'Planos', to: '/tutor/plans', color: 'bg-amber-50 hover:bg-amber-100 border-amber-200' },
];

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bom dia';
  if (hour < 18) return 'Boa tarde';
  return 'Boa noite';
}

export default function TutorDashboard() {
  const { currentUser } = useAuthStore();
  const tutor = currentUser as TutorProfile;
  const navigate = useNavigate();
  const firstName = tutor?.name?.split(' ')[0] || 'Tutor';

  const [myPets, setMyPets] = useState<any[]>([]);
  const [appointments, setAppointments] = useState<any[]>([]);
  const [cashbackBalance, setCashbackBalance] = useState<number>(0);
  const [approvedEstablishments, setApprovedEstablishments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [petsRes, aptsRes, cashRes, estsRes] = await Promise.allSettled([
          api.get('/pets'),
          api.get('/appointments/me'),
          api.get('/cashback/balance'),
          api.get('/establishments'),
        ]);

        if (petsRes.status === 'fulfilled' && Array.isArray(petsRes.value.data)) {
          setMyPets(petsRes.value.data);
        }
        if (aptsRes.status === 'fulfilled' && Array.isArray(aptsRes.value.data)) {
          setAppointments(aptsRes.value.data);
        }
        if (cashRes.status === 'fulfilled' && cashRes.value.data) {
          setCashbackBalance(cashRes.value.data.balance || 0);
        }
        if (estsRes.status === 'fulfilled' && Array.isArray(estsRes.value.data)) {
          setApprovedEstablishments(estsRes.value.data);
        }
      } catch (error) {
        console.error('Erro ao carregar dados do dashboard:', error);
      } finally {
        setIsLoading(false);
      }
    }

    loadDashboardData();
  }, []);

  // Filter real upcoming appointments
  const now = new Date();
  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();

  const upcomingApts = appointments
    .filter((a) => {
      const aptDate = new Date(a.date).getTime();
      const isActive = ['CONFIRMED', 'PENDING', 'IN_PROGRESS'].includes(a.status);
      return aptDate >= todayStart && isActive;
    })
    .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());

  const nextApt = upcomingApts[0];

  const today = new Date().toLocaleDateString('pt-BR', { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 lg:py-8">
      {/* ---- Header ---- */}
      <motion.div
        initial="hidden"
        animate="visible"
        variants={stagger}
        className="mb-8"
      >
        <motion.div variants={fadeUp} className="flex items-start justify-between mb-6">
          <div>
            <p className="text-neutral-400 text-sm capitalize">{today}</p>
            <h1 className="text-2xl font-bold text-neutral-900">
              {getGreeting()}, {firstName}! 👋
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tutor/notifications" className="relative p-2.5 bg-white rounded-xl shadow-sm border border-neutral-100 text-neutral-400 hover:text-orange-500 transition-colors">
              <Bell size={20} />
            </Link>
          </div>
        </motion.div>

        {/* Welcome Banner */}
        <motion.div variants={fadeUp} className="relative overflow-hidden bg-gradient-to-r from-orange-400 to-orange-500 rounded-3xl p-6 text-white shadow-lg shadow-orange-500/20 mb-8 flex items-center justify-between">
          <div className="relative z-10 max-w-sm">
            <h2 className="text-xl font-bold mb-2">
              {myPets.length > 0 ? `Cuidando com carinho de ${myPets[0].name}` : 'Tudo pronto para cuidar do seu pet?'}
            </h2>
            <p className="text-white/80 text-sm mb-4">
              {myPets.length > 0
                ? 'Agendamentos inteligentes, vacinas em dia e serviços de confiança em um só lugar.'
                : 'Cadastre seu pet para gerenciar vacinas, agendar banhos, consultas e receber cashback.'}
            </p>
            <button
              onClick={() => navigate(myPets.length > 0 ? '/tutor/booking' : '/tutor/pets/novo')}
              className="bg-white text-orange-500 px-5 py-2.5 rounded-xl font-bold text-sm shadow-sm hover:scale-105 transition-transform active:scale-95"
            >
              {myPets.length > 0 ? 'Agendar Serviço' : 'Cadastrar Pet'}
            </button>
          </div>
          <div className="hidden sm:block absolute -right-6 -bottom-6 w-44 h-44 md:w-52 md:h-52 transform rotate-[-5deg]">
            <img 
              src={myPets[0]?.photo || '/premium-golden.jpg'} 
              alt="Mascote PetHub" 
              className="w-full h-full object-cover rounded-full border-4 border-white/20 shadow-xl"
              onError={(e) => { (e.target as HTMLImageElement).src = '/premium-golden.jpg'; }}
            />
          </div>
        </motion.div>

        {/* Quick stats */}
        <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4">
          {[
            { label: `${myPets.length} Pet${myPets.length !== 1 ? 's' : ''}`, icon: '🐾', to: '/tutor/pets' },
            { label: `${upcomingApts.length} Agendado${upcomingApts.length !== 1 ? 's' : ''}`, icon: '📅', to: '/tutor/appointments' },
            { label: `R$ ${cashbackBalance.toFixed(2)} cashback`, icon: '💰', to: '/tutor/cashback' },
            { label: 'Explorar Serviços', icon: '⭐', to: '/tutor/explore' },
          ].map((stat) => (
            <Link key={stat.label} to={stat.to} className="flex items-center gap-2 px-4 py-2 bg-white rounded-2xl shadow-sm border border-neutral-100 whitespace-nowrap text-sm font-medium text-neutral-700 hover:border-orange-200 hover:text-orange-600 transition-all shrink-0">
              <span>{stat.icon}</span>
              {stat.label}
            </Link>
          ))}
        </motion.div>
      </motion.div>

      {/* ---- Pets carousel ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">Meus pets</h2>
          {myPets.length > 0 && (
            <Link to="/tutor/pets" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              Ver todos <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="flex gap-4">
            {[1, 2].map((i) => (
              <div key={i} className="w-40 h-44 bg-neutral-100 rounded-2xl animate-pulse shrink-0" />
            ))}
          </div>
        ) : myPets.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 text-center shadow-sm">
            <div className="w-12 h-12 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-3 text-orange-500 text-xl font-bold">
              🐾
            </div>
            <h3 className="font-bold text-neutral-900 text-sm mb-1">Você ainda não possui pets cadastrados</h3>
            <p className="text-neutral-400 text-xs max-w-sm mx-auto mb-4">
              Cadastre seu pet para agendar consultas, banhos e controlar o histórico de saúde com facilidade.
            </p>
            <button
              onClick={() => navigate('/tutor/pets/novo')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shadow-sm"
            >
              <Plus size={14} /> Cadastrar primeiro pet
            </button>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {myPets.map((pet) => (
              <motion.div
                key={pet.id}
                whileHover={{ y: -4 }}
                whileTap={{ scale: 0.97 }}
                className="shrink-0 w-40 bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-200 transition-all duration-300"
                onClick={() => navigate(`/tutor/pets/${pet.id}`)}
              >
                <div className="h-28 overflow-hidden bg-neutral-100">
                  <img
                    src={pet.photo || '/user.jpg'}
                    alt={pet.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/user.jpg'; }}
                  />
                </div>
                <div className="p-3">
                  <p className="font-semibold text-neutral-900 text-sm truncate">
                    {speciesEmoji[pet.species?.toLowerCase()] || '🐾'} {pet.name}
                  </p>
                  <p className="text-xs text-neutral-400 truncate">{pet.breed || pet.species || 'PetHub'}</p>
                  <div className="mt-2">
                    <span className="text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700 font-medium">
                      ✓ Ativo
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}

            {/* Add pet card */}
            <motion.div
              whileHover={{ y: -4 }}
              whileTap={{ scale: 0.97 }}
              className="shrink-0 w-40 bg-neutral-50 border-2 border-dashed border-neutral-200 rounded-2xl flex flex-col items-center justify-center gap-2 p-4 cursor-pointer hover:border-orange-300 hover:bg-orange-50 transition-all duration-300"
              onClick={() => navigate('/tutor/pets/novo')}
            >
              <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center text-orange-500 text-xl font-bold">
                +
              </div>
              <p className="text-xs text-neutral-500 text-center font-medium">Adicionar pet</p>
            </motion.div>
          </div>
        )}
      </motion.section>

      {/* ---- Next appointment (Real data only) ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">Próximo agendamento</h2>
          {upcomingApts.length > 0 && (
            <Link to="/tutor/appointments" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              Ver agenda <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {nextApt ? (
          <div className="bg-gradient-to-br from-neutral-900 to-neutral-800 rounded-2xl p-5 text-white relative overflow-hidden shadow-lg">
            <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/10 rounded-full -translate-y-8 translate-x-8 pointer-events-none" />
            <div className="relative">
              <div className="flex items-start justify-between mb-4">
                <div>
                  <p className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1">
                    ✦ Compromisso Confirmado
                  </p>
                  <h3 className="text-xl font-bold">{nextApt.service?.name || 'Serviço Pet'}</h3>
                  <p className="text-white/60 text-sm">{nextApt.establishment?.name || 'Estabelecimento Parceiro'}</p>
                </div>
                <Badge
                  variant={statusConfig[nextApt.status]?.variant || 'default'}
                  dot={statusConfig[nextApt.status]?.dot}
                >
                  {statusConfig[nextApt.status]?.label || nextApt.status}
                </Badge>
              </div>

              <div className="grid grid-cols-2 gap-3 mb-4">
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1">🐾 Pet</p>
                  <p className="font-semibold text-sm truncate">{nextApt.pet?.name || 'Seu Pet'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1">👤 Profissional</p>
                  <p className="font-semibold text-sm truncate">{nextApt.professional?.name || 'Equipe do Estabelecimento'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1">📅 Data</p>
                  <p className="font-semibold text-sm">
                    {new Date(nextApt.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1">⏰ Horário</p>
                  <p className="font-semibold text-sm">
                    {new Date(nextApt.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <Link
                  to={`/tutor/appointments`}
                  className="flex-1 py-2.5 bg-orange-500 hover:bg-orange-600 rounded-xl text-center text-sm font-semibold transition-colors"
                >
                  Ver detalhes na agenda
                </Link>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 text-sm">Você ainda não possui próximos agendamentos</h3>
                <p className="text-xs text-neutral-400 mt-0.5">Agende banho, tosa, consulta ou hospedagem com estabelecimentos parceiros.</p>
              </div>
            </div>
            <Link
              to="/tutor/booking"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Agendar serviço
            </Link>
          </div>
        )}
      </motion.section>

      {/* ---- Quick actions ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold text-neutral-900 mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              to={action.to}
              className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 ${action.color} transition-all duration-200 text-center`}
            >
              <span className="text-3xl">{action.icon}</span>
              <span className="text-xs font-semibold text-neutral-700">{action.label}</span>
            </Link>
          ))}
        </div>
      </motion.section>

      {/* ---- Recommended establishments (Real data only) ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900">Estabelecimentos parceiros</h2>
          <Link to="/tutor/explore" className="text-sm text-orange-500 font-medium flex items-center gap-1">
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        {approvedEstablishments.length === 0 ? (
          <div className="bg-white rounded-2xl p-6 border border-neutral-100 shadow-sm text-center">
            <Store size={28} className="mx-auto text-neutral-300 mb-2" />
            <p className="text-xs text-neutral-500 font-medium">Novos estabelecimentos parceiros estão sendo credenciados na sua região.</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {approvedEstablishments.slice(0, 4).map((est) => (
              <motion.div
                key={est.id}
                whileHover={{ y: -4 }}
                className="shrink-0 w-64 bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-200 transition-all duration-300"
                onClick={() => navigate(`/tutor/estabelecimentos/${est.id}`)}
              >
                <div className="h-32 overflow-hidden relative bg-neutral-100">
                  <img
                    src={est.photos?.[0] || est.avatar || '/user.jpg'}
                    alt={est.businessName || est.name}
                    className="w-full h-full object-cover"
                    onError={(e) => { (e.target as HTMLImageElement).src = '/user.jpg'; }}
                  />
                  <div className="absolute top-2 right-2">
                    <span className="px-2 py-1 bg-black/60 text-white text-xs rounded-lg backdrop-blur-sm">
                      {est.type || 'Pet Shop'}
                    </span>
                  </div>
                </div>
                <div className="p-4">
                  <p className="font-bold text-neutral-900 truncate">{est.businessName || est.name}</p>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 mt-1">
                    <MapPin size={12} />
                    <span className="truncate">{est.city ? `${est.city}, ${est.state || 'SP'}` : est.address || 'Brasil'}</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </motion.section>

      {/* ---- Cashback banner ---- */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="mb-6"
      >
        <Link to="/tutor/cashback">
          <div className="bg-gradient-to-r from-orange-500 to-orange-600 rounded-2xl p-5 text-white relative overflow-hidden hover:shadow-lg hover:shadow-orange-200 transition-all duration-300">
            <div className="absolute -top-8 -right-8 w-40 h-40 bg-white/10 rounded-full pointer-events-none" />
            <div className="absolute -bottom-4 -left-4 w-24 h-24 bg-white/5 rounded-full pointer-events-none" />
            <div className="relative flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium mb-1">💰 Seu cashback</p>
                <p className="text-3xl font-bold">R$ {cashbackBalance.toFixed(2)}</p>
                <p className="text-orange-100 text-xs mt-1">
                  {cashbackBalance > 0 ? 'Saldo pronto para resgate' : 'Acumule saldo em serviços e produtos'}
                </p>
              </div>
              <div className="text-right">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-2xl mb-2">
                  💳
                </div>
                <div className="flex items-center gap-1 text-orange-200 text-sm font-semibold">
                  Ver detalhes <ArrowRight size={14} />
                </div>
              </div>
            </div>
          </div>
        </Link>
      </motion.div>
    </div>
  );
}
