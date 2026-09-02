import { create } from 'zustand';
import type { Pet, Service, EstablishmentProfile, ProfessionalProfile, TransportType } from '@/types';

interface BookingStore {
  // Step data
  selectedPet: Pet | null;
  selectedEstablishment: EstablishmentProfile | null;
  selectedService: Service | null;
  selectedProfessional: ProfessionalProfile | null;
  selectedDate: string | null;
  selectedTime: string | null;
  transport: TransportType | null;
  pickupAddress: string | null;
  currentStep: number;

  // Actions
  setSelectedPet: (pet: Pet | null) => void;
  setSelectedEstablishment: (est: EstablishmentProfile | null) => void;
  setSelectedService: (service: Service | null) => void;
  setSelectedProfessional: (prof: ProfessionalProfile | null) => void;
  setSelectedDate: (date: string | null) => void;
  setSelectedTime: (time: string | null) => void;
  setTransport: (transport: TransportType | null) => void;
  setPickupAddress: (address: string | null) => void;
  setCurrentStep: (step: number) => void;
  nextStep: () => void;
  prevStep: () => void;
  reset: () => void;
}

export const useBookingStore = create<BookingStore>((set, get) => ({
  selectedPet: null,
  selectedEstablishment: null,
  selectedService: null,
  selectedProfessional: null,
  selectedDate: null,
  selectedTime: null,
  transport: null,
  pickupAddress: null,
  currentStep: 1,

  setSelectedPet: (pet) => set({ selectedPet: pet }),
  setSelectedEstablishment: (est) => set({ selectedEstablishment: est }),
  setSelectedService: (service) => set({ selectedService: service }),
  setSelectedProfessional: (prof) => set({ selectedProfessional: prof }),
  setSelectedDate: (date) => set({ selectedDate: date }),
  setSelectedTime: (time) => set({ selectedTime: time }),
  setTransport: (transport) => set({ transport }),
  setPickupAddress: (address) => set({ pickupAddress: address }),
  setCurrentStep: (step) => set({ currentStep: step }),
  nextStep: () => set((state) => ({ currentStep: state.currentStep + 1 })),
  prevStep: () => set((state) => ({ currentStep: Math.max(1, state.currentStep - 1) })),
  reset: () =>
    set({
      selectedPet: null,
      selectedEstablishment: null,
      selectedService: null,
      selectedProfessional: null,
      selectedDate: null,
      selectedTime: null,
      transport: null,
      pickupAddress: null,
      currentStep: 1,
    }),
}));
