import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight, ArrowLeft, Calendar as CalendarIcon, Clock, MapPin, CheckCircle2 } from 'lucide-react';
import { useBookingStore } from '@/store/bookingStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';
import { pets } from '@/data/pets';
import { establishments } from '@/data/users';
import { services } from '@/data/services';
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
  const toast = useToast();
  const { currentStep, setCurrentStep, reset, ...store } = useBookingStore();
  const [isLoading, setIsLoading] = useState(false);

  // Derived data
  const myPets = pets.filter((p) => p.tutorId === 'tutor-1');
  const availableEsts = establishments.filter((e) => e.isApproved);
  const estServices = store.selectedEstablishment ? services.filter((s) => s.establishmentId === store.selectedEstablishment?.id) : [];

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
        establishmentId: store.selectedEstablishment.userId,
        professionalId: store.selectedProfessional?.userId,
        date: `${store.selectedDate}T${store.selectedTime || '00:00'}:00Z`,
        // Note: Transport logic needs to be handled if added to schema
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
        <button onClick={handlePrev} className="p-2 hover:bg-neutral-100 rounded-full transition-colors">
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-xl font-bold">Novo Agendamento</h1>
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
              <h2 className="text-xl font-bold mb-4">Qual pet será atendido?</h2>
              <div className="space-y-3">
                {myPets.map((pet) => (
                  <button
                    key={pet.id}
                    onClick={() => selectPet(pet)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      store.selectedPet?.id === pet.id ? 'border-orange-500 bg-orange-50' : 'border-neutral-100 bg-white hover:border-orange-200'
                    }`}
                  >
                    <img src={pet.photo || '/fallback-dog.png'} alt={pet.name} className="w-14 h-14 rounded-full object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-bold text-neutral-900">{pet.name}</p>
                      <p className="text-sm text-neutral-500">{pet.breed}</p>
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
              <h2 className="text-xl font-bold mb-4">Onde deseja agendar?</h2>
              <div className="space-y-3">
                {availableEsts.map((est) => (
                  <button
                    key={est.id}
                    onClick={() => selectEst(est)}
                    className={`w-full flex items-center gap-4 p-4 rounded-2xl border-2 transition-all ${
                      store.selectedEstablishment?.id === est.id ? 'border-orange-500 bg-orange-50' : 'border-neutral-100 bg-white hover:border-orange-200'
                    }`}
                  >
                    <img src={est.coverPhoto} alt={est.businessName} className="w-14 h-14 rounded-xl object-cover" />
                    <div className="flex-1 text-left">
                      <p className="font-bold text-neutral-900">{est.businessName}</p>
                      <p className="text-sm text-neutral-500 truncate">{est.address.neighborhood}</p>
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
              <h2 className="text-xl font-bold mb-4">Escolha o serviço</h2>
              {estServices.length === 0 ? (
                <p className="text-neutral-500">Nenhum serviço disponível neste local.</p>
              ) : (
                <div className="space-y-3">
                  {estServices.map((svc) => (
                    <button
                      key={svc.id}
                      onClick={() => selectSvc(svc)}
                      className={`w-full flex items-center justify-between p-4 rounded-2xl border-2 transition-all ${
                        store.selectedService?.id === svc.id ? 'border-orange-500 bg-orange-50' : 'border-neutral-100 bg-white hover:border-orange-200'
                      }`}
                    >
                      <div className="flex-1 text-left pr-4">
                        <p className="font-bold text-neutral-900">{svc.name}</p>
                        <p className="text-sm text-neutral-500 mt-1 line-clamp-2">{svc.description}</p>
                        <p className="text-xs text-neutral-400 mt-2">⏱ {svc.duration} min</p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-orange-600">R${svc.price.toFixed(2)}</p>
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
              <h2 className="text-xl font-bold mb-4">Quando?</h2>
              
              <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-6">
                <p className="font-semibold text-sm mb-3">Escolha uma data (Simulação)</p>
                <div className="grid grid-cols-4 gap-2">
                  {['10/09', '11/09', '12/09', '13/09', '14/09', '15/09'].map((date) => (
                    <button
                      key={date}
                      onClick={() => store.setSelectedDate(date)}
                      className={`p-3 rounded-xl border-2 text-sm font-medium transition-colors ${
                        store.selectedDate === date ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-neutral-100 bg-white text-neutral-700 hover:border-orange-200'
                      }`}
                    >
                      {date}
                    </button>
                  ))}
                </div>
              </div>

              {store.selectedDate && (
                <div className="bg-white rounded-2xl border border-neutral-100 p-4 mb-6">
                  <p className="font-semibold text-sm mb-3">Horários disponíveis</p>
                  <div className="grid grid-cols-4 gap-2">
                    {['09:00', '10:00', '11:00', '14:00', '15:00', '16:00'].map((time) => (
                      <button
                        key={time}
                        onClick={() => store.setSelectedTime(time)}
                        className={`p-2.5 rounded-xl border-2 text-sm font-medium transition-colors ${
                          store.selectedTime === time ? 'border-orange-500 bg-orange-50 text-orange-600' : 'border-neutral-100 bg-white text-neutral-700 hover:border-orange-200'
                        }`}
                      >
                        {time}
                      </button>
                    ))}
                  </div>
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
              <h2 className="text-xl font-bold mb-4">Revisar agendamento</h2>
              
              <div className="bg-white rounded-2xl border border-neutral-100 overflow-hidden mb-6">
                <div className="p-4 border-b border-neutral-100 flex items-center gap-4">
                  <img src={store.selectedPet?.photo || '/fallback-dog.png'} alt="" className="w-12 h-12 rounded-full object-cover" />
                  <div>
                    <p className="font-bold text-neutral-900">{store.selectedPet?.name}</p>
                    <p className="text-sm text-neutral-500">{store.selectedPet?.breed}</p>
                  </div>
                </div>
                <div className="p-4 border-b border-neutral-100">
                  <div className="flex items-start justify-between mb-1">
                    <p className="font-bold text-neutral-900">{store.selectedService?.name}</p>
                    <p className="font-bold text-orange-600">R${store.selectedService?.price.toFixed(2)}</p>
                  </div>
                  <p className="text-sm text-neutral-500 mb-4">{store.selectedEstablishment?.businessName}</p>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-neutral-50 p-3 rounded-xl flex items-center gap-2">
                      <CalendarIcon size={16} className="text-neutral-400" />
                      <span className="text-sm font-medium">{store.selectedDate}</span>
                    </div>
                    <div className="bg-neutral-50 p-3 rounded-xl flex items-center gap-2">
                      <Clock size={16} className="text-neutral-400" />
                      <span className="text-sm font-medium">{store.selectedTime}</span>
                    </div>
                  </div>
                </div>
                <div className="p-4 bg-orange-50">
                  <div className="flex items-center justify-between font-bold text-neutral-900">
                    <span>Total a pagar no local</span>
                    <span className="text-lg">R${store.selectedService?.price.toFixed(2)}</span>
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
