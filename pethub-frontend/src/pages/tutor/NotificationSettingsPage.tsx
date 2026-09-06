import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Calendar, ShoppingBag, MessageSquare, DollarSign, Tag, ArrowLeft } from 'lucide-react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Card } from '@/components/ui';

interface NotificationSettings {
  appointments: boolean;
  purchases: boolean;
  messages: boolean;
  cashback: boolean;
  promotions: boolean;
}

const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: () => void }) => (
  <button
    type="button"
    onClick={onChange}
    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none cursor-pointer ${
      checked ? 'bg-orange-500' : 'bg-neutral-200 dark:bg-[#313335]'
    }`}
  >
    <span
      className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
        checked ? 'translate-x-6' : 'translate-x-1'
      }`}
    />
  </button>
);

const notifItems = [
  { key: 'appointments' as const, icon: Calendar, label: 'Agendamentos', desc: 'Lembretes e confirmações de agendamentos' },
  { key: 'purchases' as const, icon: ShoppingBag, label: 'Compras', desc: 'Atualizações sobre seus pedidos' },
  { key: 'messages' as const, icon: MessageSquare, label: 'Mensagens', desc: 'Novas mensagens no chat' },
  { key: 'cashback' as const, icon: DollarSign, label: 'Cashback', desc: 'Pontos acumulados e recompensas' },
  { key: 'promotions' as const, icon: Tag, label: 'Promoções', desc: 'Ofertas e descontos exclusivos' },
];

export default function NotificationSettingsPage() {
  const [settings, setSettings] = useState<NotificationSettings>({
    appointments: true,
    purchases: true,
    messages: true,
    cashback: true,
    promotions: false,
  });

  const toast = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const response = await api.get('/users/me/preferences');
      if (response.data.notifications) {
        setSettings(response.data.notifications);
      }
    } catch (error) {
      console.error(error);
    }
  };

  const handleToggle = async (key: keyof NotificationSettings) => {
    const newSettings = { ...settings, [key]: !settings[key] };
    setSettings(newSettings);
    try {
      await api.put('/users/me/preferences', { notifications: newSettings });
      toast.success('Preferência salva!');
    } catch (error) {
      toast.error('Erro ao salvar preferência');
      setSettings(settings); // revert
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-xl mx-auto space-y-6"
    >
      <div className="flex items-center gap-3">
        <button
          onClick={() => navigate('/tutor/profile')}
          className="w-9 h-9 flex items-center justify-center rounded-xl bg-white dark:bg-[#1E1F20] border border-neutral-200 dark:border-[#313335] hover:bg-neutral-50 dark:hover:bg-[#282A2C] transition-colors cursor-pointer"
        >
          <ArrowLeft size={18} className="text-neutral-600 dark:text-[#E3E3E3]" />
        </button>
        <div>
          <h1 className="text-xl font-bold text-neutral-900 dark:text-[#E3E3E3] flex items-center gap-2">
            <Bell className="w-5 h-5 text-orange-500" />
            Notificações
          </h1>
          <p className="text-sm text-neutral-500 dark:text-[#8E918F]">Configure seus alertas e avisos</p>
        </div>
      </div>

      <Card padding="none" className="border border-neutral-100 dark:border-[#313335] overflow-hidden">
        {notifItems.map(({ key, icon: Icon, label, desc }, i) => (
          <div
            key={key}
            className={`flex items-center justify-between p-4 ${i < notifItems.length - 1 ? 'border-b border-neutral-100 dark:border-[#313335]' : ''}`}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-orange-50 dark:bg-orange-950/40 rounded-xl flex items-center justify-center">
                <Icon size={18} className="text-orange-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-neutral-900 dark:text-[#E3E3E3]">{label}</p>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F]">{desc}</p>
              </div>
            </div>
            <ToggleSwitch checked={settings[key]} onChange={() => handleToggle(key)} />
          </div>
        ))}
      </Card>
    </motion.div>
  );
}
