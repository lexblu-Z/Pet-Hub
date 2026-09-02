import { create } from 'zustand';
import { api } from '@/services/api';
import type { Pet } from '@/types';

interface PetState {
  pets: Pet[];
  isLoading: boolean;
  error: string | null;
  fetchPets: () => Promise<void>;
  createPet: (data: Partial<Pet>) => Promise<void>;
  updatePet: (id: string, data: Partial<Pet>) => Promise<void>;
  deletePet: (id: string) => Promise<void>;
}

export const usePetStore = create<PetState>((set, get) => ({
  pets: [],
  isLoading: false,
  error: null,

  fetchPets: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.get('/pets');
      set({ pets: response.data, isLoading: false });
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
    }
  },

  createPet: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.post('/pets', data);
      set((state) => ({ pets: [...state.pets, response.data], isLoading: false }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  updatePet: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await api.put(`/pets/${id}`, data);
      set((state) => ({
        pets: state.pets.map((p) => p.id === id ? response.data : p),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  },

  deletePet: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await api.delete(`/pets/${id}`);
      set((state) => ({
        pets: state.pets.filter((p) => p.id !== id),
        isLoading: false
      }));
    } catch (error: any) {
      set({ error: error.message, isLoading: false });
      throw error;
    }
  }
}));
