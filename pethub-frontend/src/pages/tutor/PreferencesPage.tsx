import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Sun, Moon, Monitor, Globe, ArrowLeft, Calendar, CheckCircle2, ChevronRight } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { useThemeStore } from '@/store/themeStore';
import { Button, Card } from '@/components/ui';
import { GoogleCalendarCard } from '@/components/shared/GoogleCalendarCard';

export default function PreferencesPage() {
  const { theme, setTheme } = useThemeStore();
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('pt-BR');
  const [googlePromptEnabled, setGooglePromptEnabled] = useState(true);
  const [googleStatus, setGoogleStatus] = useState<{ isConnected: boolean; googleEmail?: string } | null>(null);
  const [showCalendarDetails, setShowCalendarDetails] = useState(false);
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPreferences();
    fetchGoogleStatus();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/users/me/preferences');
      if (response.data.theme) setTheme(response.data.theme);
      if (response.data.language) setLanguage(response.data.language);
      if (typeof response.data.googleCalendarPrompt === 'boolean') {
        setGooglePromptEnabled(response.data.googleCalendarPrompt);
      }
    } catch (error) {
      // themeStore handles local storage fallback
    }
  };

  const fetchGoogleStatus = async () => {
    try {
      const response = await api.get('/google/status');
      setGoogleStatus(response.data);
    } catch (err) {
      console.error(err);
    }
  };

  const savePreferences = async (newTheme: typeof theme, newLang: typeof language, newGooglePrompt = googlePromptEnabled) => {
    try {
      setLoading(true);
      setTheme(newTheme);
      await api.put('/users/me/preferences', {
        theme: newTheme,
        language: newLang,
        googleCalendarPrompt: newGooglePrompt,
      });
      localStorage.setItem('@PetHub:language', newLang);
      toast.success('Preferências salvas!');
    } catch (error) {
      setTheme(newTheme);
      localStorage.setItem('@PetHub:language', newLang);
      toast.success('Preferências salvas localmente!');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (t: typeof theme) => {
    savePreferences(t, language, googlePromptEnabled);
  };

  const handleLanguageChange = (l: typeof language) => {
    setLanguage(l);
    savePreferences(theme, l, googlePromptEnabled);
  };

  const handleToggleGooglePrompt = async () => {
    const nextVal = !googlePromptEnabled;
    setGooglePromptEnabled(nextVal);
    await savePreferences(theme, language, nextVal);
    toast.success(
      nextVal
        ? 'Sugestões do Google Calendar reativadas na agenda!'
        : 'Sugestões do Google Calendar desativadas.'
    );
  };

  const themeOptions = [
    { value: 'light' as const, label: 'Claro', icon: Sun },
    { value: 'dark' as const, label: 'Escuro', icon: Moon },
    { value: 'system' as const, label: 'Seguir sistema', icon: Monitor },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6 font-sans pb-12"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tutor/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-500" />
            Preferências
          </h1>
          <p className="text-sm text-neutral-500 dark:text-[#C4C7C5]">Tema, idioma e integrações da conta</p>
        </div>
      </div>

      {/* Aparência (Tema) Section */}
      <Card padding="lg" className="border border-neutral-100 dark:border-[#313335] shadow-sm">
        <div className="mb-4">
          <h2 className="text-base font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
            <Sun className="w-4 h-4 text-orange-500" />
            Aparência
          </h2>
          <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] mt-0.5">
            Escolha como o PetHub deve aparecer.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => handleThemeChange('light')}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
              theme === 'light'
                ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] hover:border-neutral-300 dark:hover:border-[#444746]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
              theme === 'light' ? 'border-orange-500 bg-orange-500' : 'border-neutral-300 dark:border-[#444746]'
            }`}>
              {theme === 'light' && <span className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <Sun size={22} className={theme === 'light' ? 'text-orange-500 shrink-0' : 'text-neutral-500 dark:text-[#C4C7C5] shrink-0'} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold block text-neutral-900 dark:text-[#E3E3E3]">Claro</span>
              <span className="text-[11px] text-neutral-500 dark:text-[#C4C7C5]">Interface clássica e luminosa</span>
            </div>
          </button>

          <button
            type="button"
            onClick={() => handleThemeChange('dark')}
            className={`flex items-center gap-3 p-4 rounded-2xl border-2 transition-all cursor-pointer text-left ${
              theme === 'dark'
                ? 'border-orange-500 bg-orange-50/70 dark:bg-orange-950/20 text-orange-600 dark:text-orange-400 shadow-sm'
                : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] hover:border-neutral-300 dark:hover:border-[#444746]'
            }`}
          >
            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${
              theme === 'dark' ? 'border-orange-500 bg-orange-500' : 'border-neutral-300 dark:border-[#444746]'
            }`}>
              {theme === 'dark' && <span className="w-2 h-2 rounded-full bg-white" />}
            </div>
            <Moon size={22} className={theme === 'dark' ? 'text-orange-500 shrink-0' : 'text-neutral-500 dark:text-[#C4C7C5] shrink-0'} />
            <div className="flex-1 min-w-0">
              <span className="text-sm font-bold block text-neutral-900 dark:text-[#E3E3E3]">Escuro</span>
              <span className="text-[11px] text-neutral-500 dark:text-[#C4C7C5]">Confortável para baixa luminosidade</span>
            </div>
          </button>
        </div>
      </Card>

      {/* Google Calendar Section */}
      <Card padding="lg" className="border border-neutral-100 dark:border-[#313335] shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
              <Calendar size={18} className="text-orange-500" />
              Integração Google Calendar
            </h2>
            <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] mt-0.5">
              Sincronize agendamentos com a sua agenda pessoal
            </p>
          </div>
          {googleStatus?.isConnected && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-50 dark:bg-emerald-950/40 text-emerald-700 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800/40 shadow-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Conectado
            </span>
          )}
        </div>

        {/* Toggle Switch inside Sub-card */}
        <div className="flex items-center justify-between p-3.5 rounded-2xl bg-neutral-50 dark:bg-[#282A2C] border border-neutral-100/80 dark:border-[#313335] mb-4">
          <div className="pr-3">
            <p className="text-sm font-bold text-neutral-800 dark:text-[#E3E3E3]">Oferecer integração com Google Calendar</p>
            <p className="text-xs text-neutral-500 dark:text-[#C4C7C5] mt-0.5 leading-relaxed">
              Exibir sugestões opcionais na sua agenda para sincronizar consultas e procedimentos.
            </p>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={googlePromptEnabled}
            onClick={handleToggleGooglePrompt}
            className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
              googlePromptEnabled ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-[#313335]'
            }`}
          >
            <span
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                googlePromptEnabled ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {/* Expand / Manage Calendar connection */}
        <div className="border-t border-neutral-100 dark:border-[#313335] pt-3">
          <button
            onClick={() => setShowCalendarDetails(!showCalendarDetails)}
            className="w-full flex items-center justify-between text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] hover:text-orange-600 dark:hover:text-orange-400 transition-colors py-1 cursor-pointer"
          >
            <span>{googleStatus?.isConnected ? 'Gerenciar conexão e histórico' : 'Configurar conexão agora'}</span>
            <ChevronRight size={16} className={`transform transition-transform ${showCalendarDetails ? 'rotate-90' : ''}`} />
          </button>

          {showCalendarDetails && (
            <div className="mt-4 pt-3 border-t border-neutral-100 dark:border-[#313335]">
              <GoogleCalendarCard
                returnTo="/tutor/preferences"
                roleTitle="as consultas e procedimentos dos seus pets"
              />
            </div>
          )}
        </div>
      </Card>

      {/* Language Section */}
      <Card padding="lg" className="border border-neutral-100 dark:border-[#313335] shadow-sm">
        <h2 className="text-sm font-bold text-neutral-500 dark:text-[#C4C7C5] uppercase tracking-wider mb-4">
          <span className="flex items-center gap-2"><Globe size={14} /> Idioma</span>
        </h2>
        <div className="space-y-2">
          {([['pt-BR', 'Português (Brasil)', 'PT-BR'], ['en', 'English', 'EN']] as const).map(([val, label, tag]) => (
            <button
              key={val}
              onClick={() => handleLanguageChange(val)}
              className={`w-full flex items-center justify-between p-3.5 rounded-2xl border-2 text-sm font-medium transition-all cursor-pointer ${
                language === val
                  ? 'border-orange-500 bg-orange-50 dark:bg-orange-950/20 text-orange-700 dark:text-orange-400 font-bold'
                  : 'border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] text-neutral-700 dark:text-[#E3E3E3] hover:border-neutral-300 dark:hover:border-[#444746]'
              }`}
            >
              <span className="flex items-center gap-2.5">
                <span className="text-[11px] font-bold px-1.5 py-0.5 rounded bg-neutral-100 dark:bg-[#333538] text-neutral-600 dark:text-[#C4C7C5] font-mono">
                  {tag}
                </span>
                <span>{label}</span>
              </span>
              {language === val && <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />}
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
