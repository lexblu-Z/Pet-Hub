import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import {
  Bell, Calendar, ChevronRight, MapPin, Star, ArrowRight,
  PawPrint, Clock, CheckCircle2, AlertTriangle, Plus, Store,
  Package, ShoppingBag, Truck, CalendarDays, Wallet, User, Check, Sparkles, CreditCard,
  Syringe, MessageCircle
} from 'lucide-react';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import { Badge, Card, Avatar } from '@/components/ui';
import type { TutorProfile } from '@/types';
import { formatBrasiliaDate, formatAppointmentTime } from '@/utils/date';
import { ServiceLogo, ItemLogo } from '@/components/shared/ServiceLogo';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { TutorPetsSection } from '@/components/tutor/TutorPetsSection';

interface TutorOrder {
  id: string;
  orderNumber?: string;
  status: 'PENDING' | 'PAID' | 'CONFIRMED' | 'PREPARING' | 'SHIPPED' | 'READY_FOR_PICKUP' | 'DELIVERED' | 'COMPLETED' | 'CANCELLED';
  totalAmount: number;
  deliveryMethod?: 'DELIVERY' | 'PICKUP';
  paymentMethod?: string | null;
  createdAt: string;
  items: Array<{
    id: string;
    productName?: string;
    quantity: number;
    priceAtTime: number;
    product?: {
      id: string;
      name: string;
      photo?: string;
    };
    establishment?: {
      id: string;
      name: string;
      establishmentProfile?: {
        businessName?: string;
      };
    };
  }>;
}

const stagger = {
  visible: { transition: { staggerChildren: 0.08 } },
};

const fadeUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

const statusConfig: Record<string, { label: string; variant: 'success' | 'warning' | 'info' | 'brand' | 'error'; dot: boolean }> = {
  CONFIRMED: { label: 'Confirmado', variant: 'success', dot: true },
  PENDING: { label: 'Pendente', variant: 'warning', dot: true },
  IN_PROGRESS: { label: 'Em andamento', variant: 'info', dot: true },
  COMPLETED: { label: 'Concluído', variant: 'success', dot: false },
  CANCELLED: { label: 'Cancelado', variant: 'error', dot: false },
};

const orderStatusConfig: Record<string, { label: string; variant: 'warning' | 'info' | 'brand' | 'success' | 'error'; dot?: boolean }> = {
  PENDING: { label: 'Aguardando confirmação', variant: 'warning', dot: true },
  PAID: { label: 'Confirmado', variant: 'info', dot: true },
  CONFIRMED: { label: 'Confirmado pela loja', variant: 'info', dot: true },
  PREPARING: { label: 'Em separação', variant: 'brand', dot: true },
  SHIPPED: { label: 'Em transporte', variant: 'brand', dot: true },
  READY_FOR_PICKUP: { label: 'Pronto para retirada', variant: 'success', dot: true },
  DELIVERED: { label: 'Entregue • Confirmar', variant: 'warning', dot: true },
  COMPLETED: { label: 'Concluído', variant: 'success', dot: false },
  CANCELLED: { label: 'Cancelado', variant: 'error', dot: false },
};

const quickActions = [
  { icon: Calendar, label: 'Agendar', to: '/tutor/booking', color: 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-600 dark:bg-orange-950/25 dark:hover:bg-orange-950/40 dark:border-orange-900/40 dark:text-orange-400' },
  { icon: Store, label: 'Loja', to: '/tutor/shop', color: 'bg-purple-50 hover:bg-purple-100 border-purple-200 text-purple-600 dark:bg-purple-950/25 dark:hover:bg-purple-950/40 dark:border-purple-900/40 dark:text-purple-400' },
  { icon: Package, label: 'Compras', to: '/tutor/compras', color: 'bg-emerald-50 hover:bg-emerald-100 border-emerald-200 text-emerald-600 dark:bg-emerald-950/25 dark:hover:bg-emerald-950/40 dark:border-emerald-900/40 dark:text-emerald-400' },
  { icon: Syringe, label: 'Vacinas', to: '/tutor/pets', color: 'bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-600 dark:bg-blue-950/25 dark:hover:bg-blue-950/40 dark:border-blue-900/40 dark:text-blue-400' },
  { icon: MessageCircle, label: 'Chat', to: '/tutor/chat', color: 'bg-pink-50 hover:bg-pink-100 border-pink-200 text-pink-600 dark:bg-pink-950/25 dark:hover:bg-pink-950/40 dark:border-pink-900/40 dark:text-pink-400' },
  { icon: Sparkles, label: 'Planos', to: '/tutor/plans', color: 'bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-600 dark:bg-amber-950/25 dark:hover:bg-amber-950/40 dark:border-amber-900/40 dark:text-amber-400' },
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
  const [myOrders, setMyOrders] = useState<TutorOrder[]>([]);
  const [cashbackBalance, setCashbackBalance] = useState<number>(0);
  const [approvedEstablishments, setApprovedEstablishments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    async function loadDashboardData() {
      setIsLoading(true);
      try {
        const [petsRes, aptsRes, cashRes, estsRes, ordersRes] = await Promise.allSettled([
          api.get('/pets'),
          api.get('/appointments/me'),
          api.get('/cashback/balance'),
          api.get('/establishments'),
          api.get('/orders'),
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
        if (ordersRes.status === 'fulfilled' && Array.isArray(ordersRes.value.data)) {
          setMyOrders(ordersRes.value.data);
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

  // Filter orders needing urgent confirmation by tutor (DELIVERED or READY_FOR_PICKUP)
  const pendingActionOrders = myOrders.filter(
    (o) => o.status === 'DELIVERED' || o.status === 'READY_FOR_PICKUP'
  );
  const latestPendingActionOrder = pendingActionOrders[0];
  const latestOrder = myOrders[0];

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
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">
              {getGreeting()}, {firstName}!
            </h1>
          </div>
          <div className="flex items-center gap-2">
            <Link to="/tutor/notifications" className="relative p-2.5 bg-white dark:bg-[#1E1F20] rounded-xl shadow-sm border border-neutral-100 dark:border-[#313335] text-neutral-400 dark:text-[#C4C7C5] hover:text-orange-500 dark:hover:text-orange-400 dark:hover:bg-[#282A2C] transition-colors">
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

        {/* Urgent Action Banner for pending confirmation orders */}
        {pendingActionOrders.length > 0 && latestPendingActionOrder && (
          <motion.div
            variants={fadeUp}
            className="mb-8 p-4 md:p-5 rounded-2xl bg-amber-500/10 border border-amber-500/30 dark:bg-amber-500/15 dark:border-amber-500/40 relative overflow-hidden"
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3.5">
                <div className="w-11 h-11 rounded-xl bg-amber-500 text-white flex items-center justify-center shrink-0 shadow-md shadow-amber-500/20">
                  {latestPendingActionOrder.deliveryMethod === 'PICKUP' ? (
                    <Store size={22} />
                  ) : (
                    <Truck size={22} />
                  )}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm md:text-base">
                      {latestPendingActionOrder.status === 'READY_FOR_PICKUP'
                        ? 'Seu pedido está pronto para retirada!'
                        : 'Seu pedido foi entregue!'}
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 font-semibold border border-amber-300 dark:border-amber-700/50">
                      Ação Necessária
                    </span>
                  </div>
                  <p className="text-xs text-neutral-600 dark:text-[#C4C7C5] mt-1">
                    Pedido #{latestPendingActionOrder.orderNumber || latestPendingActionOrder.id.slice(0, 8).toUpperCase()}
                    {latestPendingActionOrder.items?.[0]?.establishment?.name && (
                      <> • {latestPendingActionOrder.items[0].establishment.name}</>
                    )}
                    {' '}- Confirme o recebimento para finalizar e garantir seu cashback.
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                <Link
                  to="/tutor/compras"
                  className="w-full sm:w-auto px-4 py-2.5 bg-amber-500 hover:bg-amber-600 active:scale-95 text-white rounded-xl text-xs md:text-sm font-bold transition-all shadow-md shadow-amber-500/20 flex items-center justify-center gap-2 text-center"
                >
                  <CheckCircle2 size={16} />
                  Confirmar recebimento
                </Link>
              </div>
            </div>
          </motion.div>
        )}

        {/* Quick stats */}
        <motion.div variants={fadeUp} className="flex gap-2 overflow-x-auto scrollbar-hide py-1 -mx-4 px-4">
          {[
            { label: `${myPets.length} Pet${myPets.length !== 1 ? 's' : ''}`, icon: PawPrint, to: '/tutor/pets' },
            { label: `${upcomingApts.length} Agendado${upcomingApts.length !== 1 ? 's' : ''}`, icon: CalendarDays, to: '/tutor/appointments' },
            {
              label: pendingActionOrders.length > 0
                ? `${pendingActionOrders.length} para confirmar`
                : `${myOrders.length} Pedido${myOrders.length !== 1 ? 's' : ''}`,
              icon: Package,
              to: '/tutor/compras',
              highlight: pendingActionOrders.length > 0,
            },
            { label: `R$ ${cashbackBalance.toFixed(2)} cashback`, icon: Wallet, to: '/tutor/cashback' },
            { label: 'Explorar Serviços', icon: Sparkles, to: '/tutor/explore' },
          ].map((stat) => (
            <Link
              key={stat.label}
              to={stat.to}
              className={`flex items-center gap-2 px-4 py-2 rounded-2xl shadow-sm whitespace-nowrap text-sm font-medium transition-all shrink-0 ${
                stat.highlight
                  ? 'bg-amber-50 border-2 border-amber-400 text-amber-800 dark:bg-amber-950/40 dark:border-amber-500/50 dark:text-amber-200 shadow-amber-500/10'
                  : 'bg-white dark:bg-[#282A2C] border border-neutral-100 dark:border-[#313335] text-neutral-700 dark:text-[#E3E3E3] hover:border-orange-200 dark:hover:border-orange-500/30 hover:text-orange-600 dark:hover:text-orange-400 dark:hover:bg-[#333538]'
              }`}
            >
              <stat.icon size={15} className="shrink-0 text-orange-500 dark:text-orange-400" />
              <span>{stat.label}</span>
            </Link>
          ))}
        </motion.div>
      </motion.div>

      {/* ---- Meus Pets Section (Premium Redesign) ---- */}
      <TutorPetsSection pets={myPets} isLoading={isLoading} />


      {/* ---- Next appointment (Real data only) ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Próximo agendamento</h2>
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
                  <p className="text-orange-400 text-xs font-medium uppercase tracking-wider mb-1 flex items-center gap-1">
                    <Sparkles size={12} /> Compromisso Confirmado
                  </p>
                  <div className="flex items-center gap-2 mb-1">
                    <ServiceLogo category={nextApt.service?.category} name={nextApt.service?.name} size="sm" showBadge={true} />
                    <h3 className="text-xl font-bold">{nextApt.service?.name || 'Serviço Pet'}</h3>
                  </div>
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
                  <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><PawPrint size={12} /> Pet</p>
                  <p className="font-semibold text-sm truncate">{nextApt.pet?.name || 'Seu Pet'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><User size={12} /> Profissional</p>
                  <p className="font-semibold text-sm truncate">{nextApt.professional?.name || 'Equipe do Estabelecimento'}</p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><Calendar size={12} /> Data</p>
                  <p className="font-semibold text-sm">
                    {formatBrasiliaDate(nextApt.date)}
                  </p>
                </div>
                <div className="bg-white/5 rounded-xl p-3">
                  <p className="text-white/40 text-xs mb-1 flex items-center gap-1"><Clock size={12} /> Horário</p>
                  <p className="font-semibold text-sm">
                    {formatAppointmentTime(nextApt)}
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
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-6 border border-neutral-100 dark:border-[#313335] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <Calendar size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm">Você ainda não possui próximos agendamentos</h3>
                <p className="text-xs text-neutral-400 dark:text-[#C4C7C5] mt-0.5">Agende banho, tosa, consulta ou hospedagem com estabelecimentos parceiros.</p>
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

      {/* ---- Minhas compras (Orders preview) ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.22 }}
        className="mb-8"
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Minhas compras</h2>
            {pendingActionOrders.length > 0 && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200 font-semibold border border-amber-300 dark:border-amber-700/50">
                {pendingActionOrders.length} aguardando você
              </span>
            )}
          </div>
          {myOrders.length > 0 && (
            <Link to="/tutor/compras" className="text-sm text-orange-500 hover:text-orange-600 font-medium flex items-center gap-1">
              Ver todas ({myOrders.length}) <ChevronRight size={16} />
            </Link>
          )}
        </div>

        {isLoading ? (
          <div className="bg-neutral-100 dark:bg-[#1E1F20] rounded-2xl h-36 animate-pulse" />
        ) : myOrders.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-6 border border-neutral-100 dark:border-[#313335] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-50 dark:bg-orange-950/40 rounded-2xl flex items-center justify-center text-orange-500 shrink-0">
                <ShoppingBag size={24} />
              </div>
              <div>
                <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm">Você ainda não realizou compras na loja PetHub</h3>
                <p className="text-xs text-neutral-400 dark:text-[#C4C7C5] mt-0.5">
                  Compre rações, petiscos, brinquedos e acessórios com cashback garantido.
                </p>
              </div>
            </div>
            <Link
              to="/tutor/shop"
              className="px-4 py-2 bg-orange-500 hover:bg-orange-600 text-white rounded-xl text-xs font-bold transition-colors shrink-0"
            >
              Explorar loja
            </Link>
          </div>
        ) : (
          (() => {
            const displayOrder = latestPendingActionOrder || latestOrder;
            const isPendingAction = displayOrder.status === 'DELIVERED' || displayOrder.status === 'READY_FOR_PICKUP';
            const firstItem = displayOrder.items?.[0];
            const establishmentName = firstItem?.establishment?.establishmentProfile?.businessName || firstItem?.establishment?.name || 'Loja Parceira';
            const totalItemsCount = displayOrder.items?.reduce((acc, it) => acc + (it.quantity || 1), 0) || 1;
            const firstItemPhoto = firstItem?.product?.photo;

            return (
              <div className={`bg-white dark:bg-[#1E1F20] rounded-2xl p-5 border shadow-sm transition-all ${
                isPendingAction
                  ? 'border-amber-400 dark:border-amber-500/50 shadow-amber-500/5'
                  : 'border-neutral-100 dark:border-[#313335] hover:border-orange-200 dark:hover:border-orange-500/30'
              }`}>
                <div className="flex flex-wrap items-center justify-between gap-2 pb-3 mb-3 border-b border-neutral-100 dark:border-[#313335]">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">
                      #{displayOrder.orderNumber || displayOrder.id.slice(0, 8).toUpperCase()}
                    </span>
                    <span className="text-xs text-neutral-400 dark:text-[#C4C7C5]">
                      • {formatBrasiliaDate(displayOrder.createdAt)}
                    </span>
                    <span className="text-xs text-neutral-500 dark:text-[#8E918F] flex items-center gap-1">
                      {displayOrder.deliveryMethod === 'PICKUP' ? (
                        <>• <Store size={12} /> Retirada</>
                      ) : (
                        <>• <Truck size={12} /> Entrega</>
                      )}
                    </span>
                  </div>
                  <Badge
                    variant={orderStatusConfig[displayOrder.status]?.variant || 'brand'}
                    dot={orderStatusConfig[displayOrder.status]?.dot}
                  >
                    {orderStatusConfig[displayOrder.status]?.label || displayOrder.status}
                  </Badge>
                </div>

                <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-14 h-14 rounded-xl bg-neutral-100 dark:bg-[#282A2C] overflow-hidden shrink-0 border border-neutral-200/60 dark:border-[#383A3D] flex items-center justify-center">
                      {firstItemPhoto ? (
                        <img
                          src={firstItemPhoto}
                          alt={firstItem?.productName || 'Produto'}
                          className="w-full h-full object-cover"
                          onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                        />
                      ) : (
                        <Package size={22} className="text-neutral-400 dark:text-neutral-500" />
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-neutral-400 dark:text-[#8E918F] font-medium flex items-center gap-1">
                        <Store size={12} /> {establishmentName}
                      </p>
                      <div className="flex items-center gap-1.5 mt-0.5">
                        <ItemLogo size="xs" />
                        <h4 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-sm line-clamp-1">
                          {firstItem?.productName || firstItem?.product?.name || 'Itens do pedido'}
                        </h4>
                      </div>
                      <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] mt-0.5">
                        {totalItemsCount} {totalItemsCount === 1 ? 'item' : 'itens'} • Total: <span className="font-bold text-neutral-900 dark:text-[#E3E3E3]">R$ {Number(displayOrder.totalAmount).toFixed(2)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                    <Link
                      to="/tutor/compras"
                      className={`w-full sm:w-auto px-4 py-2.5 rounded-xl text-xs md:text-sm font-bold transition-all text-center flex items-center justify-center gap-1.5 ${
                        isPendingAction
                          ? 'bg-amber-500 hover:bg-amber-600 text-white shadow-sm shadow-amber-500/20 active:scale-95'
                          : 'bg-neutral-100 hover:bg-neutral-200 dark:bg-[#282A2C] dark:hover:bg-[#333538] text-neutral-800 dark:text-[#E3E3E3]'
                      }`}
                    >
                      {isPendingAction ? (
                        <>
                          <CheckCircle2 size={16} /> Confirmar recebimento
                        </>
                      ) : (
                        <>
                          Ver detalhes da compra <ArrowRight size={14} />
                        </>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
            );
          })()
        )}
      </motion.section>

      {/* ---- Quick actions ---- */}
      <motion.section
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="mb-8"
      >
        <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Ações rápidas</h2>
        <div className="grid grid-cols-3 gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Link
                key={action.label}
                to={action.to}
                className={`flex flex-col items-center gap-2 p-4 rounded-2xl border-2 ${action.color} transition-all duration-200 text-center`}
              >
                <div className="w-10 h-10 rounded-xl flex items-center justify-center">
                  <Icon size={24} />
                </div>
                <span className="text-xs font-semibold text-neutral-700 dark:text-[#E3E3E3]">{action.label}</span>
              </Link>
            );
          })}
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
          <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Estabelecimentos parceiros</h2>
          <Link to="/tutor/explore" className="text-sm text-orange-500 font-medium flex items-center gap-1">
            Ver todos <ChevronRight size={16} />
          </Link>
        </div>

        {approvedEstablishments.length === 0 ? (
          <div className="bg-white dark:bg-[#1E1F20] rounded-2xl p-6 border border-neutral-100 dark:border-[#313335] shadow-sm text-center">
            <Store size={28} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-2" />
            <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] font-medium">Novos estabelecimentos parceiros estão sendo credenciados na sua região.</p>
          </div>
        ) : (
          <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
            {approvedEstablishments.slice(0, 4).map((est) => (
              <motion.div
                key={est.id}
                whileHover={{ y: -4 }}
                className="shrink-0 w-64 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-sm overflow-hidden cursor-pointer hover:shadow-md hover:border-orange-200 dark:hover:border-orange-500/30 transition-all duration-300"
                onClick={() => navigate(`/tutor/estabelecimentos/${est.id}`)}
              >
                <div className="h-32 overflow-hidden relative bg-neutral-100 dark:bg-[#282A2C]">
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
                  <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{est.businessName || est.name}</p>
                  <div className="flex items-center gap-1 text-xs text-neutral-400 dark:text-[#8E918F] mt-1">
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
                <p className="text-orange-100 text-sm font-medium mb-1 flex items-center gap-1.5"><Wallet size={16} /> Seu cashback</p>
                <p className="text-3xl font-bold">R$ {cashbackBalance.toFixed(2)}</p>
                <p className="text-orange-100 text-xs mt-1">
                  {cashbackBalance > 0 ? 'Saldo pronto para resgate' : 'Acumule saldo em serviços e produtos'}
                </p>
              </div>
              <div className="text-right">
                <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center text-white mb-2 shadow-inner">
                  <CreditCard size={24} />
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
