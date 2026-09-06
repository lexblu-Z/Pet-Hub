import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { Button, Stepper } from '@/components/ui';
import type { Pet, EstablishmentProfile, Service } from '@/types';

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
    return Array.from({ length: 14 }, (_, i) => {
      const d = new Date();
      d.setDate(d.getDate() + i);
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      const iso = `${year}-${month}-${day}`;
      const dayName = d.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '');
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
          businessName: e.name,
          category: ['banho', 'tosa'],
          logo: e.logo || '/salsicha_borzoi_1788367580508.jpg',
          cover: e.cover || '/jorginho_derpy_shepherd_1788367498390.jpg',
          address: e.address || { neighborhood: 'Endereço não informado' },
          rating: e.rating || 4.5,
          reviewCount: e.reviewCount || 10,
          isApproved: true,
        }));
        setAvailableEsts(mappedEsts);
        
        setAllServices(srvsRes.data);

        // Check if prefill was passed
        if (location.state?.prefillEstablishment) {
          store.setSelectedEstablishment(location.state.prefillEstablishment);
        }
      } catch (error) {
        toast.error('Erro ao buscar dados para agendamento.');
      } finally {
        setIsFetchingData(false);
      }
    };
    fetchData();
  }, [toast, location.state]);

  const availableServices = store.selectedEstablishment 
    ? allServices.filter((s) => s.establishmentId === store.selectedEstablishment?.id) 
    : [];

  const handleNext = () => {
    if (currentStep < 5) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
    else navigate(-1);
  };

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      if (!store.selectedPet || !store.selectedService || !store.selectedEstablishment || !store.selectedDate) {
        toast.error('Dados incompletos para agendamento.');
        return;
      }
      
      const payload = {
        petId: store.selectedPet.id,
        serviceId: store.selectedService.id,
        establishmentId: (store.selectedEstablishment as any)?.userId || store.selectedEstablishment?.id,
        professionalId: (store.selectedProfessional as any)?.userId || store.selectedProfessional?.id,
        date: `${store.selectedDate}T${store.selectedTime || '09:00'}:00.000Z`,
      };

      await api.post('/appointments', payload);
      
      toast.success('Agendamento confirmado com sucesso!');
      reset();
      navigate('/tutor/appointments');
    } catch (error: any) {
      console.error(error);
      toast.error(error.response?.data?.error || 'Erro ao criar agendamento.');
    } finally {
      setIsLoading(false);
    }
  };

  // Selectors
  const selectPet = (pet: Pet) => { store.setSelectedPet(pet); handleNext(); };
  const selectEst = (est: EstablishmentProfile) => { store.setSelectedEstablishment(est); handleNext(); };
  const selectSvc = (svc: Service) => { store.setSelectedService(svc); handleNext(); };

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
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Onde deseja agendar?</h2>
              <div className="space-y-3">
                {availableEsts.map((est) => (
                  <button
                    key={est.id}
                    onClick={() => selectEst(est)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                      store.selectedEstablishment?.id === est.id
                        ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                        : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-orange-200 dark:hover:border-orange-500/50'
                    }`}
                  >
                    <img src={est.cover} alt={est.businessName} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{est.businessName}</p>
                      <p className="text-sm text-neutral-500 dark:text-[#8E918F] truncate">{est.address.neighborhood}</p>
                    </div>
                    {store.selectedEstablishment?.id === est.id && <CheckCircle2 className="text-orange-500" />}
                  </button>
                ))}
              </div>
            </motion.div>
          )}

          {/* STEP 3: SERVICE */}
          {currentStep === 3 && (
            <motion.div key="step3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Escolha o serviço</h2>
              {availableServices.length === 0 ? (
                <div className="bg-neutral-50 dark:bg-[#1E1F20] border border-neutral-100 dark:border-[#313335] rounded-2xl p-6 text-center">
                  <p className="text-neutral-500 dark:text-[#8E918F] font-medium">Este estabelecimento ainda não possui serviços cadastrados.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {availableServices.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => selectSvc(svc)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all cursor-pointer ${
                        store.selectedService?.id === svc.id
                          ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/30'
                          : 'border-neutral-100 dark:border-[#313335] bg-white dark:bg-[#1E1F20] hover:border-orange-200 dark:hover:border-orange-500/50'
                      }`}
                    >
                      <div className="flex-1 text-left pr-4">
                        <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{svc.name}</p>
                        <p className="text-sm text-neutral-500 dark:text-[#8E918F] mt-1 line-clamp-2">{svc.description}</p>
                        <p className="text-xs text-neutral-400 dark:text-[#8E918F] mt-2">⏱ {svc.duration} min</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600 dark:text-orange-400">R${svc.price.toFixed(2)}</p>
                        {store.selectedService?.id === svc.id && <CheckCircle2 className="inline-block mt-2 text-orange-500" />}
                      </div>
                    </button>
                  ))}
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
          {currentStep === 5 && (
            <motion.div key="step5" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: -20 }}>
              <h2 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] mb-4">Revisar agendamento</h2>
              
              <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] overflow-hidden mb-6">
                <div className="p-4 border-b border-neutral-100 dark:border-[#313335] flex items-center gap-4">
                  <img src={store.selectedPet?.photo || '/fallback-dog.png'} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{store.selectedPet?.name}</p>
                    <p className="text-sm text-neutral-500 dark:text-[#8E918F]">{store.selectedPet?.breed}</p>
                  </div>
                </div>
                <div className="p-4 border-b border-neutral-100 dark:border-[#313335]">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{store.selectedService?.name}</p>
                    <p className="font-bold text-orange-600 dark:text-orange-400">R${store.selectedService?.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-neutral-500 dark:text-[#8E918F] mb-4">{store.selectedEstablishment?.businessName}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 dark:bg-[#282A2C] border border-transparent dark:border-[#313335] p-3 rounded-xl flex items-center gap-2">
                      <CalendarIcon size={16} className="text-neutral-400 dark:text-[#8E918F]" />
                      <span className="text-sm font-medium text-neutral-900 dark:text-[#E3E3E3]">
                        {store.selectedDate ? new Date(store.selectedDate + 'T12:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }) : ''}
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
                    <span>Total a pagar no local</span>
                    <span className="text-lg text-orange-600 dark:text-orange-400">R${store.selectedService?.price.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <Button fullWidth size="lg" isLoading={isLoading} onClick={handleConfirm}>
                Confirmar Agendamento
              </Button>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
