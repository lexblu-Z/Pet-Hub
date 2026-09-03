import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Settings, Sun, Moon, Monitor, Globe, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Button, Card } from '@/components/ui';

export default function PreferencesPage() {
  const [theme, setTheme] = useState<'light' | 'dark' | 'system'>('system');
  const [language, setLanguage] = useState<'pt-BR' | 'en'>('pt-BR');
  const [loading, setLoading] = useState(false);

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchPreferences();
  }, []);

  const fetchPreferences = async () => {
    try {
      const response = await api.get('/users/me/preferences');
      if (response.data.theme) setTheme(response.data.theme);
      if (response.data.language) setLanguage(response.data.language);
      applyTheme(response.data.theme || 'system');
    } catch (error) {
      // Use localStorage as fallback
      const saved = localStorage.getItem('@PetHub:theme') as any;
      if (saved) { setTheme(saved); applyTheme(saved); }
    }
  };

  const applyTheme = (selectedTheme: string) => {
    const root = document.documentElement;
    if (selectedTheme === 'dark' || (selectedTheme === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  };

  const savePreferences = async (newTheme: typeof theme, newLang: typeof language) => {
    try {
      setLoading(true);
      await api.put('/users/me/preferences', { theme: newTheme, language: newLang });
      localStorage.setItem('@PetHub:theme', newTheme);
      localStorage.setItem('@PetHub:language', newLang);
      applyTheme(newTheme);
      toast.success('Preferências salvas!');
    } catch (error) {
      localStorage.setItem('@PetHub:theme', newTheme);
      localStorage.setItem('@PetHub:language', newLang);
      applyTheme(newTheme);
      toast.success('Preferências salvas localmente!');
    } finally {
      setLoading(false);
    }
  };

  const handleThemeChange = (t: typeof theme) => {
    setTheme(t);
    applyTheme(t);
    savePreferences(t, language);
  };

  const handleLanguageChange = (l: typeof language) => {
    setLanguage(l);
    savePreferences(theme, l);
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
      className="max-w-xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tutor/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white border border-neutral-200 hover:bg-neutral-50 transition-colors"
        >
          <ArrowLeft size={18} className="text-neutral-600" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-orange-500" />
            Preferências
          </h1>
          <p className="text-sm text-neutral-500">Tema, idioma e configurações do app</p>
        </div>
      </div>

      <Card padding="lg" className="border border-neutral-100">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">Tema</h2>
        <div className="grid grid-cols-3 gap-3">
          {themeOptions.map(({ value, label, icon: Icon }) => (
            <button
              key={value}
              onClick={() => handleThemeChange(value)}
              className={`flex flex-col items-center gap-2 p-4 rounded-xl border-2 transition-all ${
                theme === value
                  ? 'border-orange-500 bg-orange-50 text-orange-600'
                  : 'border-neutral-200 text-neutral-600 hover:border-neutral-300'
              }`}
            >
              <Icon size={22} />
              <span className="text-xs font-medium">{label}</span>
            </button>
          ))}
        </div>
      </Card>

      <Card padding="lg" className="border border-neutral-100">
        <h2 className="text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4">
          <span className="flex items-center gap-2"><Globe size={14} /> Idioma</span>
        </h2>
        <div className="space-y-2">
          {([['pt-BR', '🇧🇷  Português (Brasil)'], ['en', '🇺🇸  English']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => handleLanguageChange(val)}
              className={`w-full flex items-center justify-between p-3.5 rounded-xl border-2 text-sm font-medium transition-all ${
                language === val
                  ? 'border-orange-500 bg-orange-50 text-orange-700'
                  : 'border-neutral-200 text-neutral-700 hover:border-neutral-300'
              }`}
            >
              {label}
              {language === val && <span className="w-2 h-2 rounded-full bg-orange-500" />}
            </button>
          ))}
        </div>
      </Card>
    </motion.div>
  );
}
