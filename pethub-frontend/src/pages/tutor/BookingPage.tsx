import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2, AlertTriangle, AlertCircle } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Button, Stepper } from '@/components/ui';
import type { Pet, EstablishmentProfile, Service } from '@/types';
import { getBrasiliaToday, addDaysToDate, formatBrasiliaDate } from '@/utils/date';
import { 
  isPetCompatibleWithService, 
  isPetCompatibleWithProvider, 
  getSpeciesInfo, 
  getAnimalTypeLabel, 
  formatAcceptedSpeciesBadges 
} from '@/utils/species';
import { ServiceLogo } from '@/components/shared/ServiceLogo';
import { PaymentLogo } from '@/components/shared/PaymentLogo';
import { PaymentMethodSelector } from '@/components/shared/PaymentMethodSelector';

const steps = [
  { id: 1, label: 'Pet' },
  { id: 2, label: 'Local' },
  { id: 3, label: 'Serviço' },
  { id: 4, label: 'Data & Hora' },
  { id: 5, label: 'Revisão' },
];

export default function BookingPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const { currentStep, setCurrentStep, reset, ...store } = useBookingStore();
  const [isLoading, setIsLoading] = useState(false);

  // Payment & Cashback state
  const [paymentMethod, setPaymentMethod] = useState<string>('Cartão de Débito');
  const [needsChange, setNeedsChange] = useState<boolean>(false);
  const [changeFor, setChangeFor] = useState<string>('');
  const [appliedCashbackCode, setAppliedCashbackCode] = useState<string | null>(null);
  const [cashbackDiscount, setCashbackDiscount] = useState<number>(0);
  const [petTransport, setPetTransport] = useState<'PICKUP_BY_TUTOR' | 'PICKUP_BY_PROVIDER'>('PICKUP_BY_TUTOR');

  const [myPets, setMyPets] = useState<any[]>([]);
  const [availableEsts, setAvailableEsts] = useState<any[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [isFetchingData, setIsFetchingData] = useState(true);

  // Real Slots state
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [isFetchingSlots, setIsFetchingSlots] = useState(false);
  const [slotsMessage, setSlotsMessage] = useState<string | null>(null);

  // Generate 14 upcoming dates (YYYY-MM-DD)
  const upcomingDates = React.useMemo(() => {
    const todayStr = getBrasiliaToday();
    return Array.from({ length: 14 }, (_, i) => {
      const iso = addDaysToDate(todayStr, i);
      const [year, month, day] = iso.split('-');
      const d = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 12, 0, 0));
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short', timeZone: 'UTC' }).replace('.', '');
      const dayMonth = `${day}/${month}`;
      return { iso, dayName, dayMonth };
    });
  }, []);

  // Fetch real available slots when date changes
  useEffect(() => {
    if (!store.selectedDate) return;
    const fetchSlots = async () => {
      try {
        setIsFetchingSlots(true);
        setSlotsMessage(null);
        const params: Record<string, string> = { date: store.selectedDate! };
        if (store.selectedEstablishment) {
          params.establishmentId = (store.selectedEstablishment as any).userId || store.selectedEstablishment.id;
        }
        if (store.selectedService) {
          params.serviceId = store.selectedService.id;
        }
        if (store.selectedProfessional) {
          params.professionalId = (store.selectedProfessional as any).userId || store.selectedProfessional.id;
        }

        const res = await api.get('/appointments/available-slots', { params });
        if (res.data.isClosed) {
          setAvailableSlots([]);
          setSlotsMessage(res.data.message || 'Fechado neste dia.');
        } else {
          setAvailableSlots(res.data.availableSlots || []);
          if ((res.data.availableSlots || []).length === 0) {
            setSlotsMessage('Nenhum horário disponível para esta data.');
          }
        }
      } catch (err) {
        console.error('Erro ao buscar horários:', err);
        setAvailableSlots([]);
        setSlotsMessage('Não foi possível carregar os horários.');
      } finally {
        setIsFetchingSlots(false);
      }
    };
    fetchSlots();
  }, [store.selectedDate, store.selectedEstablishment, store.selectedService, store.selectedProfessional]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [petsRes, estsRes, srvsRes] = await Promise.all([
          api.get('/pets'),
          api.get('/establishments'),
          api.get('/services')
        ]);
        
        setMyPets(petsRes.data);
        
        const mappedEsts = estsRes.data.map((e: any) => ({
          id: e.id,
          userId: e.id,
          businessName: e.businessName || e.name,
          role: e.role,
          type: e.type,
          category: ['banho', 'tosa'],
          logo: e.logo || e.avatar || '/salsicha_borzoi_1788367580508.jpg',
          cover: e.cover || '/jorginho_derpy_shepherd_1788367498390.jpg',
          address: e.address || { neighborhood: 'Endereço não informado' },
          rating: e.rating || 4.5,
          reviewCount: e.reviewCount || 10,
          isApproved: true,
          acceptedSpecies: e.acceptedSpecies || (e.establishmentProfile?.acceptedSpecies) || [],
        }));
        setAvailableEsts(mappedEsts);
        
        setAllServices(srvsRes.data);

        // Check if prefill was passed
        if (location.state?.prefillEstablishment) {
          store.setSelectedEstablishment(location.state.prefillEstablishment);
        }
        if (location.state?.prefillService) {
          store.setSelectedService(location.state.prefillService);
        }
        if (location.state?.prefillPet) {
          store.setSelectedPet(location.state.prefillPet);
        }
        if (location.state?.prefillPet && location.state?.prefillEstablishment && location.state?.prefillService) {
          setCurrentStep(4);
        } else if (location.state?.prefillPet && location.state?.prefillEstablishment) {
          setCurrentStep(3);
        }
      } catch (error) {
        toast.error('Erro ao buscar dados para agendamento.');
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchData();
  }, [toast, location.state]);

  const selectedId = (store.selectedEstablishment as any)?.userId || store.selectedEstablishment?.id;
  const availableServices = store.selectedEstablishment 
    ? allServices.filter((s) => s.establishmentId === selectedId || s.professionalId === selectedId) 
    : [];

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else navigate(-1);
  };

  const handleConfirm = async () => {
    if (isLoading) return;

    if (!store.selectedPet || !store.selectedService || !store.selectedEstablishment || !store.selectedDate || !store.selectedTime) {
      toast.error('Dados incompletos para agendamento. Verifique pet, serviço, data e horário.');
      return;
    }

    // Strict Compatibility Check
    const estSpecies = (store.selectedEstablishment as any).acceptedSpecies || [];
    if (!isPetCompatibleWithProvider(store.selectedPet.species, estSpecies)) {
      toast.error(`Incompatibilidade: o estabelecimento "${store.selectedEstablishment.businessName}" não atende a espécie ${getSpeciesInfo(store.selectedPet.species).label}.`);
      return;
    }

    if (!isPetCompatibleWithService(store.selectedPet.species, (store.selectedService as any).animalType)) {
      toast.error(`Incompatibilidade: este serviço é exclusivo para ${getAnimalTypeLabel((store.selectedService as any).animalType)}.`);
      return;
    }

    const servicePrice = store.selectedService.price || 0;
    const finalAmount = Math.max(0, Math.round((servicePrice - cashbackDiscount) * 100) / 100);

    const isCash = paymentMethod.toLowerCase().includes('dinheiro') || paymentMethod.toUpperCase() === 'CASH';
    let parsedChangeFor: number | null = null;
    if (isCash && needsChange) {
      const cleanChange = changeFor.replace('R$', '').trim().replace(/\./g, '').replace(',', '.');
      parsedChangeFor = parseFloat(cleanChange);
      if (isNaN(parsedChangeFor) || parsedChangeFor < finalAmount) {
        toast.error(`O valor para troco deve ser maior ou igual ao total a pagar (R$ ${finalAmount.toFixed(2).replace('.', ',')}).`);
        return;
      }
    }

    setIsLoading(true);
    try {
      const provider = store.selectedEstablishment as any;
      const isProf = provider?.role === 'PROFESSIONAL' || !!store.selectedProfessional;
      const profId = (store.selectedProfessional as any)?.userId || store.selectedProfessional?.id || (isProf ? (provider?.userId || provider?.id) : undefined);

      const payload = {
        petId: store.selectedPet.id,
        serviceId: store.selectedService.id,
        establishmentId: provider?.userId || provider?.id,
        professionalId: profId,
        date: `${store.selectedDate}T${store.selectedTime || '09:00'}:00.000Z`,
        paymentMethod,
        needsChange: isCash ? needsChange : false,
        changeFor: parsedChangeFor,
        cashbackCode: appliedCashbackCode || null,
        petTransport,
      };

      await api.post('/appointments', payload);
      
      toast.success('Agendamento confirmado com sucesso!');
      reset();
      navigate('/tutor/appointments');
    } catch (error: any) {
      console.error('Erro ao confirmar agendamento:', error);
      const status = error.response?.status;
      const backendError = error.response?.data?.error;

      if (status === 409) {
        toast.error(backendError || 'Este horário acabou de ser ocupado. Por favor, selecione outro horário.');
      } else if (status === 403) {
        toast.error(backendError || 'Prestador indisponível para agendamentos no momento.');
      } else {
        toast.error(backendError || 'Não foi possível confirmar o agendamento. Tente novamente.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Selectors with strict compatibility handling
  const selectPet = (pet: Pet) => {
    store.setSelectedPet(pet);
    // If establishment was previously chosen and is incompatible, reset it
    if (store.selectedEstablishment) {
      const estSpecies = (store.selectedEstablishment as any).acceptedSpecies || [];
      if (!isPetCompatibleWithProvider(pet.species, estSpecies)) {
        store.setSelectedEstablishment(null as any);
        store.setSelectedService(null as any);
        toast.error(`O local selecionado anteriormente não atende ${getSpeciesInfo(pet.species).label}. Escolha um local compatível.`);
      }
    }
    // If service was previously chosen and is incompatible, reset it
    if (store.selectedService) {
      if (!isPetCompatibleWithService(pet.species, (store.selectedService as any).animalType)) {
        store.setSelectedService(null as any);
        toast.error(`O serviço selecionado anteriormente não é compatível com ${getSpeciesInfo(pet.species).label}.`);
      }
    }
    handleNext();
  };

  const selectEst = (est: EstablishmentProfile) => {
    if (store.selectedPet) {
      const isCompat = isPetCompatibleWithProvider(store.selectedPet.species, (est as any).acceptedSpecies);
      if (!isCompat) {
        toast.error(`Este estabelecimento não realiza atendimentos para ${getSpeciesInfo(store.selectedPet.species).label}.`);
        return;
      }
    }
    store.setSelectedEstablishment(est);
    // Reset service if it doesn't belong to the newly selected establishment
    if (store.selectedService && (store.selectedService as any).establishmentId !== est.id && (store.selectedService as any).professionalId !== est.id) {
      store.setSelectedService(null as any);
    }
    handleNext();
  };

  const selectSvc = (svc: Service) => {
    if (store.selectedPet) {
      const isCompat = isPetCompatibleWithService(store.selectedPet.species, (svc as any).animalType);
      if (!isCompat) {
        toast.error(`Este serviço é exclusivo para ${getAnimalTypeLabel((svc as any).animalType)}.`);
        return;
      }
    }
    store.setSelectedService(svc);
    handleNext();
  };

  // Validation
  const canProceedDate = !!store.selectedDate && !!store.selectedTime;

  return (
    <div className="max-w-2xl mx-auto px-4 py-6 min-h-screen flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <button onClick={handlePrev} className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] rounded-full transition-colors text-neutral-800 dark:text-[#E3E3E3] cursor-pointer">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Novo Agendamento</h1>
        <div className="w-9" /> {/* Spacer */}
      </div>

      <div className="mb-8 hidden sm:block">
        <Stepper steps={steps} currentStep={currentStep} />
      </div>
      <div className="mb-8 sm:hidden">
        <Stepper steps={steps} currentStep={currentStep} variant="compact" />
      </div>

      <div className="flex-1 relative">
        <AnimatePresence mode="wait">
          {/* STEP 1: PET */}
          {currentStep === 1 && (
            <motion.div key="step1" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Qual pet será atendido?</h2>
              <div className="space-y-3">
                {myPets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => selectPet(pet)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      store.selectedPet?.id === pet.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-orange-200 dark:hover:border-orange-500/50'
                    }`}
                  >
                    <img src={pet.photo || '/fallback-dog.png'} alt={pet.name} className="w-14 h-14 rounded-full object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{pet.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-[#8E918F]">{pet.breed}</p>
                    </div>
                    {store.selectedPet?.id === pet.id && <CheckCircle2 className="text-orange-500" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 2: ESTABLISHMENT */}
          {currentStep === 2 && (
            <motion.div key="step2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Onde deseja agendar?</h2>
              {store.selectedPet && (
                <p className="text-xs text-neutral-500 dark:text-[#8E918F] mb-4">
                  Mostrando locais compatíveis com seu pet: <strong className="text-orange-600 dark:text-orange-400">{store.selectedPet.name} ({getSpeciesInfo(store.selectedPet.species).label})</strong>
                </p>
              )}
              <div className="space-y-3">
                {availableEsts.map((est) => {
                  const isCompatible = !store.selectedPet || isPetCompatibleWithProvider(store.selectedPet.species, est.acceptedSpecies);
                  const petInfo = store.selectedPet ? getSpeciesInfo(store.selectedPet.species) : null;

                  return (
                    <button
                      key={est.id}
                      onClick={() => isCompatible && selectEst(est)}
                      disabled={!isCompatible}
                      className={`w-full flex items-start gap-4 p-4 rounded-2xl border-2 transition-all ${
                        !isCompatible
                          ? 'opacity-60 bg-neutral-50 dark:bg-[#1E1F20]/40 border-neutral-200 dark:border-[#313335] cursor-not-allowed text-left'
                          : store.selectedEstablishment?.id === est.id
                            ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 cursor-pointer text-left'
                            : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-orange-200 dark:hover:border-orange-500/50 cursor-pointer text-left'
                      }`}
                    >
                      <img src={est.cover} alt={est.businessName} className="w-14 h-14 rounded-xl object-cover shrink-0" />
                      <div className="flex-1 text-left min-w-0">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-bold text-neutral-900 dark:text-[#E3E3E3] truncate">{est.businessName}</p>
                          {store.selectedEstablishment?.id === est.id && isCompatible && <CheckCircle2 className="text-orange-500 shrink-0" />}
                        </div>
                        <p className="text-sm text-neutral-500 dark:text-[#8E918F] truncate">{est.address.neighborhood}</p>
                        <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1 truncate">
                          Atende: {formatAcceptedSpeciesBadges(est.acceptedSpecies)}
                        </p>
                        {!isCompatible && petInfo && (
                          <div className="mt-2 p-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1.5">
                            <AlertTriangle size={13} className="shrink-0 text-red-500" />
                            <span>Este estabelecimento não realiza atendimentos para {petInfo.label.toLowerCase()}s</span>
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* STEP 3: SERVICE */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-1">Escolha o serviço</h2>
              {store.selectedPet && (
                <p className="text-xs text-neutral-500 dark:text-[#8E918F] mb-4">
                  Atendimento para: <strong className="text-orange-600 dark:text-orange-400">{store.selectedPet.name} ({getSpeciesInfo(store.selectedPet.species).label})</strong>
                </p>
              )}
              {availableServices.length === 0 ? (
                <div className="bg-neutral-50 dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-2xl p-6 text-center">
                  <p className="text-neutral-500 dark:text-[#8E918F] font-medium">Este estabelecimento ainda não possui serviços cadastrados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableServices.map((svc) => {
                    const isCompatible = !store.selectedPet || isPetCompatibleWithService(store.selectedPet.species, svc.animalType);
                    const petInfo = store.selectedPet ? getSpeciesInfo(store.selectedPet.species) : null;
                    const typeLabel = getAnimalTypeLabel(svc.animalType);

                    return (
                      <button
                        key={svc.id}
                        onClick={() => isCompatible && selectSvc(svc)}
                        disabled={!isCompatible}
                        className={`w-full flex items-start justify-between p-4 rounded-2xl border-2 transition-all ${
                          !isCompatible
                            ? 'opacity-60 bg-neutral-50 dark:bg-[#1E1F20]/40 border-neutral-200 dark:border-[#313335] cursor-not-allowed text-left'
                            : store.selectedService?.id === svc.id
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 cursor-pointer text-left'
                              : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-orange-200 dark:hover:border-orange-500/50 cursor-pointer text-left'
                        }`}
                      >
                        <div className="flex-1 text-left pr-4">
                          <div className="flex items-center gap-2.5 mb-1">
                            <ServiceLogo category={svc.category} name={svc.name} size="sm" showBadge={true} />
                            <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{svc.name}</p>
                          </div>
                          <p className="text-sm text-neutral-500 dark:text-[#8E918F] mt-1 line-clamp-2">{svc.description}</p>
                          <div className="flex items-center gap-3 mt-2">
                            <span className="text-xs text-neutral-400 dark:text-[#8E918F] flex items-center gap-1">
                              <Clock size={12} /> {svc.duration} min
                            </span>
                            <span className="text-xs font-medium text-neutral-600 dark:text-[#C4C7C5] bg-neutral-100 dark:bg-[#282A2C] px-2 py-0.5 rounded-full">
                              Para: {typeLabel}
                            </span>
                          </div>
                          {!isCompatible && petInfo && (
                            <div className="mt-2 p-1.5 px-2.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-lg text-red-600 dark:text-red-400 text-xs font-semibold flex items-center gap-1.5">
                              <AlertTriangle size={13} className="shrink-0 text-red-500" />
                              <span>Este serviço é exclusivo para {typeLabel} (incompatível com {petInfo.label})</span>
                            </div>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="font-bold text-orange-600 dark:text-orange-400">R${svc.price.toFixed(2)}</p>
                          {store.selectedService?.id === svc.id && isCompatible && <CheckCircle2 className="inline-block mt-2 text-orange-500" />}
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </motion.div>
          )}

          {/* STEP 4: DATE & TIME */}
          {currentStep === 4 && (
            <motion.div key="step4" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Quando?</h2>
              
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 mb-6">
                <p className="font-semibold text-sm text-neutral-900 dark:text-[#E3E3E3] mb-3">Escolha uma data</p>
                <div className="grid grid-cols-4 sm:grid-cols-7 gap-2">
                  {upcomingDates.map(({ iso, dayName, dayMonth }) => (
                    <button
                      key={iso}
                      type="button"
                      onClick={() => {
                        store.setSelectedDate(iso);
                        store.setSelectedTime('');
                      }}
                      className={`p-2.5 rounded-xl border-2 text-center transition-all cursor-pointer ${
                        store.selectedDate === iso
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                          : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] hover:border-orange-200 dark:hover:border-orange-500/50'
                      }`}
                    >
                      <span className="block text-[10px] uppercase font-bold text-neutral-400 dark:text-[#8E918F]">{dayName}</span>
                      <span className="text-sm font-semibold">{dayMonth}</span>
                    </button>
                  ))}
                </div>
              </div>

              {store.selectedDate && (
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 mb-6">
                  <p className="font-semibold text-sm text-neutral-900 dark:text-[#E3E3E3] mb-3">Horários disponíveis</p>
                  {isFetchingSlots ? (
                    <div className="grid grid-cols-4 gap-2">
                      {[1, 2, 3, 4, 5, 6, 7, 8].map((n) => (
                        <div key={n} className="h-10 rounded-xl bg-neutral-100 dark:bg-[#282A2C] animate-pulse" />
                      ))}
                    </div>
                  ) : slotsMessage ? (
                    <div className="p-4 text-center text-xs text-neutral-500 dark:text-[#8E918F] bg-neutral-50 dark:bg-[#282A2C] rounded-xl">
                      {slotsMessage}
                    </div>
                  ) : (
                    <div className="grid grid-cols-4 gap-2">
                      {availableSlots.map((time) => (
                        <button
                          key={time}
                          type="button"
                          onClick={() => store.setSelectedTime(time)}
                          className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-colors cursor-pointer ${
                            store.selectedTime === time
                              ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                              : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] hover:border-orange-200 dark:hover:border-orange-500/50'
                          }`}
                        >
                          {time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              <Button fullWidth size="lg" disabled={!canProceedDate} onClick={handleNext}>
                Continuar
              </Button>
            </motion.div>
          )}

          {/* STEP 5: REVIEW */}
          {currentStep === 5 && (() => {
            const isEstCompat = !store.selectedPet || !store.selectedEstablishment || isPetCompatibleWithProvider(store.selectedPet.species, (store.selectedEstablishment as any).acceptedSpecies);
            const isSvcCompat = !store.selectedPet || !store.selectedService || isPetCompatibleWithService(store.selectedPet.species, (store.selectedService as any).animalType);
            const canConfirm = isEstCompat && isSvcCompat && !isLoading;

            return (
              <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
                <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Revisar agendamento</h2>

                {!isEstCompat && store.selectedPet && store.selectedEstablishment && (
                  <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                    <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Incompatibilidade de espécie com o estabelecimento:</strong>
                      <span>O estabelecimento "{store.selectedEstablishment.businessName}" não atende a espécie {getSpeciesInfo(store.selectedPet.species).label}. Volte ao passo anterior e selecione um local compatível.</span>
                    </div>
                  </div>
                )}

                {!isSvcCompat && store.selectedPet && store.selectedService && (
                  <div className="mb-4 p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/40 rounded-2xl text-red-700 dark:text-red-300 text-xs flex items-start gap-2.5">
                    <AlertCircle size={18} className="shrink-0 text-red-500 mt-0.5" />
                    <div>
                      <strong className="block font-bold">Incompatibilidade com o serviço selecionado:</strong>
                      <span>O serviço "{store.selectedService.name}" é exclusivo para {getAnimalTypeLabel((store.selectedService as any).animalType)} e não pode ser realizado para seu pet ({getSpeciesInfo(store.selectedPet.species).label}).</span>
                    </div>
                  </div>
                )}
                
                <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden mb-6">
                  <div className="p-4 border-b border-neutral-100 dark:border-[#313335] flex items-center gap-4">
                    <img src={store.selectedPet?.photo || '/fallback-dog.png'} alt="" className="w-12 h-12 rounded-full object-cover" />
                    <div>
                      <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{store.selectedPet?.name}</p>
                      <p className="text-sm text-neutral-500 dark:text-[#8E918F]">{store.selectedPet?.breed} ({getSpeciesInfo(store.selectedPet?.species).label})</p>
                    </div>
                  </div>
                  <div className="p-4 border-b border-neutral-100 dark:border-[#313335]">
                    <div className="flex items-start justify-between mb-1">
                      <div className="flex items-center gap-2.5">
                        <ServiceLogo 
                          category={store.selectedService?.category} 
                          name={store.selectedService?.name} 
                          size="sm" 
                          showBadge={true} 
                        />
                        <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{store.selectedService?.name}</p>
                      </div>
                      <p className="font-bold text-orange-600 dark:text-orange-400">R${store.selectedService?.price.toFixed(2)}</p>
                    </div>
                    <p className="text-sm text-neutral-500 dark:text-[#8E918F] mb-4">{store.selectedEstablishment?.businessName}</p>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] p-3 rounded-xl flex items-center gap-2">
                        <CalendarIcon size={16} className="text-neutral-400 dark:text-[#8E918F]" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-[#E3E3E3]">
                          {formatBrasiliaDate(store.selectedDate)}
                        </span>
                      </div>
                      <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] p-3 rounded-xl flex items-center gap-2">
                        <Clock size={16} className="text-neutral-400 dark:text-[#8E918F]" />
                        <span className="text-sm font-medium text-neutral-900 dark:text-[#E3E3E3]">{store.selectedTime}</span>
                      </div>
                    </div>
                  </div>
                  <div className="p-4 bg-orange-50 dark:bg-orange-950/30 border-t border-transparent dark:border-orange-900/40">
                    <div className="flex items-center justify-between font-bold text-neutral-900 dark:text-[#E3E3E3]">
                      <span className="flex items-center gap-2">
                        <PaymentLogo method={paymentMethod} size="xs" />
                        <span>Valor do Serviço</span>
                      </span>
                      <span className="text-lg text-orange-600 dark:text-orange-400">R${store.selectedService?.price.toFixed(2)}</span>
                    </div>
                  </div>
                </div>

                {/* Opção de Transporte do Pet */}
                <div className="mb-6 bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4">
                  <label className="text-xs font-bold text-neutral-600 dark:text-[#C4C7C5] uppercase tracking-wider block mb-3">
                    Como o pet chegará ao agendamento?
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setPetTransport('PICKUP_BY_TUTOR')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        petTransport === 'PICKUP_BY_TUTOR'
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                          : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                      }`}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                        petTransport === 'PICKUP_BY_TUTOR' ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'
                      }`}>
                        {petTransport === 'PICKUP_BY_TUTOR' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Vou levar meu pet</p>
                        <p className="text-[11px] text-neutral-500 dark:text-[#8E918F] mt-0.5">
                          O tutor leva o pet até o local no horário agendado.
                        </p>
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setPetTransport('PICKUP_BY_PROVIDER')}
                      className={`p-3.5 rounded-xl border text-left transition-all flex items-start gap-3 cursor-pointer ${
                        petTransport === 'PICKUP_BY_PROVIDER'
                          ? 'border-orange-500 bg-orange-50/50 dark:bg-orange-950/20 text-orange-950 dark:text-orange-200 ring-2 ring-orange-500/20'
                          : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#C4C7C5] hover:border-neutral-300'
                      }`}
                    >
                      <div className={`w-4 h-4 mt-0.5 rounded-full border flex items-center justify-center shrink-0 ${
                        petTransport === 'PICKUP_BY_PROVIDER' ? 'border-orange-500 bg-orange-500' : 'border-neutral-300'
                      }`}>
                        {petTransport === 'PICKUP_BY_PROVIDER' && <div className="w-1.5 h-1.5 rounded-full bg-white" />}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-neutral-900 dark:text-[#E3E3E3]">Quero solicitar busca do pet</p>
                        <p className="text-[11px] text-neutral-500 dark:text-[#8E918F] mt-0.5">
                          O estabelecimento ou profissional buscará o pet no endereço.
                        </p>
                      </div>
                    </button>
                  </div>
                </div>

                {/* Unified Payment Method & Cashback Selector */}
                <div className="mb-6">
                  <PaymentMethodSelector
                    type="SERVICE"
                    subtotal={store.selectedService?.price || 0}
                    selectedMethod={paymentMethod}
                    onSelectMethod={setPaymentMethod}
                    needsChange={needsChange}
                    onToggleNeedsChange={setNeedsChange}
                    changeFor={changeFor}
                    onChangeForChange={setChangeFor}
                    appliedCashbackCode={appliedCashbackCode}
                    cashbackDiscount={cashbackDiscount}
                    onApplyCashback={(code, discount) => {
                      setAppliedCashbackCode(code);
                      setCashbackDiscount(discount);
                    }}
                    showBreakdown={true}
                  />
                </div>

                <Button fullWidth size="lg" isLoading={isLoading} disabled={!canConfirm} onClick={handleConfirm}>
                  {isLoading ? 'Confirmando Agendamento...' : 'Confirmar Agendamento'}
                </Button>
              </motion.div>
            );
          })()}
        </AnimatePresence>
      </div>
    </div>
  );
}
