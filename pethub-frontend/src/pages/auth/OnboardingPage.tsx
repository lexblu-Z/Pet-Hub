import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Check, ChevronRight, Camera, Dog, Cat, ArrowRight, ArrowLeft, X } from 'lucide-react';
import { Button, Input, Select } from '@/components/ui';
import { useAuthStore } from '@/store/authStore';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';

export default function OnboardingPage() {
  const navigate = useNavigate();
  const toast = useToast();
  
  const [step, setStep] = useState(1);
  const [hasPet, setHasPet] = useState<boolean | null>(null);
  const [petData, setPetData] = useState({
    name: '',
    species: 'dog',
    breed: '',
  });

  const handleFinish = async () => {
    if (hasPet && petData.name) {
      try {
        await api.post('/pets', {
          name: petData.name,
          species: petData.species,
          breed: petData.breed || undefined,
        });
      } catch (err) {
        console.error('Failed to create initial pet:', err);
      }
    }
    toast.success('Bem-vindo ao PetHub!');
    navigate('/tutor');
  };

  const nextStep = () => setStep(s => s + 1);

  return (
    <div className="min-h-screen relative flex items-center justify-center p-4 overflow-hidden bg-neutral-900">
      {/* Background Image & Overlay */}
      <div 
        className="absolute inset-0 z-0 opacity-40 mix-blend-overlay"
        style={{
          backgroundImage: 'url("https://images.unsplash.com/photo-1548199973-03cce0bbc87b?q=80&w=2000")',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      />
      {/* Animated Gradient Orbs */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] bg-orange-500/30 rounded-full blur-[120px] mix-blend-screen animate-pulse" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] bg-purple-600/20 rounded-full blur-[150px] mix-blend-screen" />
      
      {/* Main Glassmorphism Card */}
      <motion.div 
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative z-10 w-full max-w-lg"
      >
        <div className="backdrop-blur-2xl bg-white/10 border border-white/20 p-8 sm:p-10 rounded-[2.5rem] shadow-2xl relative overflow-hidden">
          {/* Subtle inner gradient */}
          <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
          
          <div className="relative z-10">
            <AnimatePresence mode="wait">
              {/* STEP 1: Welcome & Pet Question */}
              {step === 1 && (
                <motion.div
                  key="step1"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="text-center"
                >
                  <div className="w-20 h-20 bg-gradient-to-br from-orange-400 to-orange-600 rounded-2xl mx-auto flex items-center justify-center shadow-lg shadow-orange-500/30 mb-8 transform rotate-3">
                    <Dog size={40} className="text-white -rotate-3" />
                  </div>
                  <h1 className="text-3xl font-bold text-white mb-3 tracking-tight">Que bom ter você aqui!</h1>
                  <p className="text-white/70 mb-10 text-lg">Para personalizarmos sua experiência, conte-nos: você já tem um pet?</p>

                  <div className="space-y-4">
                    <button
                      onClick={() => { setHasPet(true); nextStep(); }}
                      className="w-full group relative overflow-hidden rounded-2xl bg-white/10 hover:bg-white/20 border border-white/10 p-5 transition-all flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-white/10 rounded-xl flex items-center justify-center shrink-0">
                        <Dog className="text-white" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-white text-lg">Sim, eu tenho!</p>
                        <p className="text-sm text-white/60">Quero cadastrar meu pet agora</p>
                      </div>
                      <ChevronRight className="text-white/40 group-hover:text-white transition-colors" />
                    </button>

                    <button
                      onClick={() => { setHasPet(false); handleFinish(); }}
                      className="w-full group relative overflow-hidden rounded-2xl bg-transparent hover:bg-white/5 border border-white/10 p-5 transition-all flex items-center gap-4"
                    >
                      <div className="w-12 h-12 bg-transparent border border-white/20 rounded-xl flex items-center justify-center shrink-0">
                        <X className="text-white/60" />
                      </div>
                      <div className="text-left flex-1">
                        <p className="font-bold text-white text-lg">Ainda não tenho</p>
                        <p className="text-sm text-white/60">Estou apenas conhecendo o app</p>
                      </div>
                      <ArrowRight className="text-white/40 group-hover:text-white transition-colors" />
                    </button>
                  </div>
                </motion.div>
              )}

              {/* STEP 2: Pet Details Form */}
              {step === 2 && (
                <motion.div
                  key="step2"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                >
                  <div className="flex items-center gap-4 mb-8">
                    <button onClick={() => setStep(1)} className="w-10 h-10 bg-white/10 hover:bg-white/20 rounded-full flex items-center justify-center text-white transition-colors">
                      <ArrowLeft className="w-5 h-5" />
                    </button>
                    <div>
                      <h2 className="text-2xl font-bold text-white">Sobre seu pet</h2>
                      <p className="text-white/60 text-sm">Preencha os dados básicos dele</p>
                    </div>
                  </div>

                  <div className="flex justify-center mb-8">
                    <div className="relative group cursor-pointer">
                      <div className="w-28 h-28 rounded-full bg-white/10 border-2 border-dashed border-white/30 flex flex-col items-center justify-center overflow-hidden transition-all group-hover:border-orange-500 group-hover:bg-white/20">
                        <Camera className="text-white/50 mb-1 group-hover:text-white" size={24} />
                        <span className="text-xs text-white/50 font-medium group-hover:text-white">Foto</span>
                      </div>
                      <div className="absolute -bottom-2 -right-2 bg-orange-500 text-white w-8 h-8 rounded-full flex items-center justify-center shadow-lg pointer-events-none">
                        +
                      </div>
                    </div>
                  </div>

                  <div className="space-y-4 mb-8">
                    <div>
                      <label className="block text-sm font-medium text-white/80 mb-1.5">Nome do pet</label>
                      <input 
                        type="text" 
                        value={petData.name}
                        onChange={(e) => setPetData({...petData, name: e.target.value})}
                        className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 placeholder-white/30 transition-all"
                        placeholder="Ex: Thor, Luna..."
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-white/80 mb-1.5">Espécie</label>
                        <select
                          value={petData.species}
                          onChange={(e) => setPetData({...petData, species: e.target.value})}
                          className="w-full bg-neutral-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none"
                        >
                          <option value="dog">🐶 Cachorro</option>
                          <option value="cat">🐱 Gato</option>
                          <option value="bird">🐦 Ave</option>
                          <option value="rodent">🐹 Roedor</option>
                          <option value="rabbit">🐰 Coelho</option>
                          <option value="reptile">🐢 Réptil</option>
                          <option value="fish">🐠 Peixe</option>
                          <option value="other">Outro</option>
                        </select>
                      </div>
                      <div className="col-span-2 sm:col-span-1">
                        <label className="block text-sm font-medium text-white/80 mb-1.5">Raça</label>
                        <input 
                          type="text" 
                          value={petData.breed}
                          onChange={(e) => setPetData({...petData, breed: e.target.value})}
                          className="w-full bg-white/5 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 placeholder-white/30 transition-all"
                          placeholder="Ex: Poodle, SRD..."
                        />
                      </div>
                    </div>
                    
                    {petData.species === 'other' && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        className="overflow-hidden"
                      >
                        <label className="block text-sm font-medium text-white/80 mb-1.5 mt-2">Selecione o tipo de pet</label>
                        <select
                          className="w-full bg-neutral-800 border border-white/10 text-white rounded-xl px-4 py-3 focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500 transition-all appearance-none"
                        >
                          <option value="">Selecione...</option>
                          <option value="furao">Furão</option>
                          <option value="porquinho">Porquinho-da-índia</option>
                          <option value="hamster">Hamster</option>
                          <option value="chinchila">Chinchila</option>
                          <option value="gerbil">Gerbil</option>
                          <option value="calopsita">Calopsita</option>
                          <option value="papagaio">Papagaio</option>
                          <option value="periquito">Periquito</option>
                          <option value="canario">Canário</option>
                          <option value="agapornis">Agapornis</option>
                          <option value="iguana">Iguana</option>
                          <option value="gecko">Gecko</option>
                          <option value="jabuti">Jabuti</option>
                          <option value="tartaruga">Tartaruga</option>
                          <option value="cobra">Cobra de estimação</option>
                          <option value="lagarto">Lagarto</option>
                          <option value="peixe">Peixe</option>
                          <option value="anfibio">Anfíbio</option>
                          <option value="artropode">Artrópode de estimação</option>
                          <option value="other_animal">Outro animal</option>
                        </select>
                      </motion.div>
                    )}
                  </div>

                  <button 
                    onClick={handleFinish}
                    disabled={!petData.name}
                    className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 rounded-xl transition-all shadow-lg shadow-orange-500/25 flex items-center justify-center gap-2"
                  >
                    Concluir e entrar
                    <ArrowRight size={18} />
                  </button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
