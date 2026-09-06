import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Briefcase,
  Plus,
  Clock,
  Calendar,
  Check,
  X,
  Edit2,
  Trash2,
  AlertCircle,
  Coffee,
  CheckCircle2,
  DollarSign,
  CalendarClock,
  Sparkles,
  Layers,
  Settings,
  ShieldCheck,
  AlertTriangle
} from 'lucide-react';
import { Button, Input, Modal, Badge } from '@/components/ui';
import { useToast } from '@/store/toastStore';
import { api } from '@/services/api';

interface ServiceItem {
  id: string;
  name: string;
  description: string;
  price: number;
  duration: number;
  category: string;
  active: boolean;
  professionalProfileId?: string;
  establishmentId?: string;
}

interface DaySchedule {
  enabled: boolean;
  open: string;
  close: string;
  hasBreak?: boolean;
  breakStart?: string;
  breakEnd?: string;
}

type WorkingHours = Record<string, DaySchedule>;

interface BookingSettings {
  allowOnlineBooking: boolean;
  minAdvanceNoticeHours: number;
  defaultDurationMinutes: number;
}

const DAYS_OF_WEEK = [
  { key: 'segunda', label: 'Segunda-feira', short: 'Seg' },
  { key: 'terca', label: 'Terça-feira', short: 'Ter' },
  { key: 'quarta', label: 'Quarta-feira', short: 'Qua' },
  { key: 'quinta', label: 'Quinta-feira', short: 'Qui' },
  { key: 'sexta', label: 'Sexta-feira', short: 'Sex' },
  { key: 'sabado', label: 'Sábado', short: 'Sáb' },
  { key: 'domingo', label: 'Domingo', short: 'Dom' },
];

const CATEGORIES = [
  { value: 'VETERINARY', label: 'Veterinário / Consulta' },
  { value: 'GROOMING', label: 'Banho & Tosa' },
  { value: 'TRAINING', label: 'Adestramento' },
  { value: 'PET_SITTING', label: 'Pet Sitter / Cuidador' },
  { value: 'WALKING', label: 'Passeador (Dog Walker)' },
  { value: 'OTHER', label: 'Outro' },
];

const DEFAULT_SCHEDULE: WorkingHours = {
  segunda: { enabled: true, open: '08:00', close: '18:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  terca: { enabled: true, open: '08:00', close: '18:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  quarta: { enabled: true, open: '08:00', close: '18:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  quinta: { enabled: true, open: '08:00', close: '18:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  sexta: { enabled: true, open: '08:00', close: '18:00', hasBreak: true, breakStart: '12:00', breakEnd: '13:00' },
  sabado: { enabled: true, open: '08:00', close: '14:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
  domingo: { enabled: false, open: '08:00', close: '12:00', hasBreak: false, breakStart: '12:00', breakEnd: '13:00' },
};

export default function ProfessionalServicesPage() {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'services' | 'availability'>('services');

  // Services State
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [isSavingService, setIsSavingService] = useState(false);
  const [editingService, setEditingService] = useState<ServiceItem | null>(null);

  // Form State for Service
  const [serviceForm, setServiceForm] = useState({
    name: '',
    description: '',
    price: '',
    duration: '60',
    category: 'VETERINARY',
    active: true,
  });

  // Delete Confirmation Modal
  const [serviceToDelete, setServiceToDelete] = useState<ServiceItem | null>(null);
  const [isDeletingService, setIsDeletingService] = useState(false);

  // Availability State
  const [workingHours, setWorkingHours] = useState<WorkingHours>(DEFAULT_SCHEDULE);
  const [bookingSettings, setBookingSettings] = useState<BookingSettings>({
    allowOnlineBooking: true,
    minAdvanceNoticeHours: 2,
    defaultDurationMinutes: 60,
  });
  const [isLoadingAvailability, setIsLoadingAvailability] = useState(true);
  const [isSavingAvailability, setIsSavingAvailability] = useState(false);

  useEffect(() => {
    fetchServices();
    fetchAvailability();
  }, []);

  // Fetch Services from API
  const fetchServices = async () => {
    try {
      setIsLoadingServices(true);
      const res = await api.get('/professional/services');
      setServices(res.data || []);
    } catch (error: any) {
      console.error('Erro ao buscar serviços:', error);
      toast.error('Erro ao carregar serviços cadastrados.');
    } finally {
      setIsLoadingServices(false);
    }
  };

  // Fetch Availability from API
  const fetchAvailability = async () => {
    try {
      setIsLoadingAvailability(true);
      const res = await api.get('/professional/availability');
      if (res.data.workingHours) {
        setWorkingHours(res.data.workingHours);
      }
      if (res.data.bookingSettings) {
        setBookingSettings(res.data.bookingSettings);
      }
    } catch (error: any) {
      console.error('Erro ao carregar disponibilidade:', error);
      toast.error('Erro ao carregar disponibilidade.');
    } finally {
      setIsLoadingAvailability(false);
    }
  };

  // Open modal to add service
  const handleOpenAddModal = () => {
    setEditingService(null);
    setServiceForm({
      name: '',
      description: '',
      price: '',
      duration: '60',
      category: 'VETERINARY',
      active: true,
    });
    setIsServiceModalOpen(true);
  };

  // Open modal to edit service
  const handleOpenEditModal = (service: ServiceItem) => {
    setEditingService(service);
    setServiceForm({
      name: service.name,
      description: service.description || '',
      price: service.price.toString(),
      duration: service.duration.toString(),
      category: service.category || 'VETERINARY',
      active: service.active,
    });
    setIsServiceModalOpen(true);
  };

  // Save Service (Create or Update)
  const handleSaveService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!serviceForm.name.trim()) {
      toast.error('Informe o nome do serviço.');
      return;
    }

    const priceNum = parseFloat(serviceForm.price.replace(',', '.'));
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Informe um preço válido.');
      return;
    }

    const durationNum = parseInt(serviceForm.duration, 10);
    if (isNaN(durationNum) || durationNum <= 0) {
      toast.error('Informe uma duração válida em minutos.');
      return;
    }

    try {
      setIsSavingService(true);
      if (editingService) {
        // Update
        const res = await api.put(`/professional/services/${editingService.id}`, {
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim(),
          price: priceNum,
          duration: durationNum,
          category: serviceForm.category,
          active: serviceForm.active,
        });
        setServices(services.map((s) => (s.id === editingService.id ? res.data : s)));
        toast.success('Serviço atualizado com sucesso!');
      } else {
        // Create
        const res = await api.post('/professional/services', {
          name: serviceForm.name.trim(),
          description: serviceForm.description.trim(),
          price: priceNum,
          duration: durationNum,
          category: serviceForm.category,
          active: serviceForm.active,
        });
        setServices([res.data, ...services]);
        toast.success('Serviço cadastrado com sucesso!');
      }
      setIsServiceModalOpen(false);
    } catch (error: any) {
      console.error('Erro ao salvar serviço:', error);
      toast.error(error.response?.data?.error || 'Erro ao salvar serviço.');
    } finally {
      setIsSavingService(false);
    }
  };

  // Toggle active status
  const handleToggleServiceActive = async (id: string, currentActive: boolean) => {
    try {
      const res = await api.patch(`/professional/services/${id}/toggle`);
      setServices(services.map((s) => (s.id === id ? { ...s, active: res.data.active } : s)));
      toast.success(`Serviço ${res.data.active ? 'ativado' : 'pausado'}`);
    } catch (error: any) {
      toast.error('Erro ao alterar status do serviço.');
    }
  };

  // Delete service
  const handleConfirmDeleteService = async () => {
    if (!serviceToDelete) return;
    try {
      setIsDeletingService(true);
      await api.delete(`/professional/services/${serviceToDelete.id}`);
      setServices(services.filter((s) => s.id !== serviceToDelete.id));
      toast.success('Serviço excluído com sucesso.');
      setServiceToDelete(null);
    } catch (error: any) {
      toast.error(error.response?.data?.error || 'Erro ao excluir serviço.');
    } finally {
      setIsDeletingService(false);
    }
  };

  // Availability form change handlers
  const handleToggleDay = (dayKey: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        enabled: !prev[dayKey]?.enabled,
      },
    }));
  };

  const handleTimeChange = (dayKey: string, field: 'open' | 'close' | 'breakStart' | 'breakEnd', value: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        [field]: value,
      },
    }));
  };

  const handleToggleBreak = (dayKey: string) => {
    setWorkingHours((prev) => ({
      ...prev,
      [dayKey]: {
        ...prev[dayKey],
        hasBreak: !prev[dayKey]?.hasBreak,
      },
    }));
  };

  // Validate working hours
  const validateSchedule = (): string | null => {
    for (const { key, label } of DAYS_OF_WEEK) {
      const day = workingHours[key];
      if (day && day.enabled) {
        if (!day.open || !day.close) {
          return `${label}: Informe os horários de início e término.`;
        }
        if (day.open >= day.close) {
          return `${label}: Horário de abertura (${day.open}) deve ser anterior ao de encerramento (${day.close}).`;
        }
        if (day.hasBreak) {
          if (!day.breakStart || !day.breakEnd) {
            return `${label}: Informe o início e fim do intervalo/almoço.`;
          }
          if (day.breakStart >= day.breakEnd) {
            return `${label}: Início do intervalo (${day.breakStart}) deve ser anterior ao fim (${day.breakEnd}).`;
          }
          if (day.breakStart < day.open || day.breakEnd > day.close) {
            return `${label}: O intervalo deve estar dentro do horário de atendimento (${day.open} - ${day.close}).`;
          }
        }
      }
    }
    return null;
  };

  // Save Availability
  const handleSaveAvailability = async () => {
    const error = validateSchedule();
    if (error) {
      toast.error(error);
      return;
    }

    try {
      setIsSavingAvailability(true);
      const res = await api.put('/professional/availability', {
        workingHours,
        bookingSettings,
      });
      setWorkingHours(res.data.workingHours);
      setBookingSettings(res.data.bookingSettings);
      toast.success('Disponibilidade e regras salvas com sucesso!');
    } catch (err: any) {
      console.error('Erro ao salvar disponibilidade:', err);
      toast.error(err.response?.data?.error || 'Erro ao salvar disponibilidade.');
    } finally {
      setIsSavingAvailability(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <div className="p-2 bg-orange-500/10 text-orange-500 rounded-xl">
              <Briefcase size={22} />
            </div>
            <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Prestar Serviços</h1>
          </div>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm">
            Gerencie seu catálogo de serviços, horários de atendimento e regras de agendamento online.
          </p>
        </div>

        {activeTab === 'services' && (
          <Button onClick={handleOpenAddModal} className="flex items-center gap-2 shadow-sm">
            <Plus size={18} />
            <span>Adicionar Serviço</span>
          </Button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-[#313335] gap-2">
        <button
          onClick={() => setActiveTab('services')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'services'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3]'
          }`}
        >
          <Layers size={17} />
          <span>Meus Serviços</span>
          <span className="text-xs px-2 py-0.5 rounded-full bg-neutral-100 dark:bg-[#313335] text-neutral-700 dark:text-[#E3E3E3]">
            {services.length}
          </span>
        </button>

        <button
          onClick={() => setActiveTab('availability')}
          className={`pb-3 px-4 font-semibold text-sm transition-colors border-b-2 flex items-center gap-2 cursor-pointer ${
            activeTab === 'availability'
              ? 'border-orange-500 text-orange-600 dark:text-orange-400'
              : 'border-transparent text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3]'
          }`}
        >
          <CalendarClock size={17} />
          <span>Minha Disponibilidade & Regras</span>
        </button>
      </div>

      {/* TAB 1: SERVICES */}
      {activeTab === 'services' && (
        <div className="space-y-4">
          {isLoadingServices ? (
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-28 bg-neutral-100 dark:bg-[#282A2C] rounded-2xl animate-pulse" />
              ))}
            </div>
          ) : services.length === 0 ? (
            <div className="bg-white dark:bg-[#1E1F20] rounded-3xl p-10 border border-neutral-100 dark:border-[#313335] text-center shadow-sm space-y-4">
              <div className="w-16 h-16 bg-orange-50 dark:bg-orange-950/30 rounded-2xl flex items-center justify-center mx-auto text-orange-500 text-3xl">
                <Briefcase size={32} />
              </div>
              <div className="max-w-md mx-auto">
                <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-lg">Nenhum serviço cadastrado</h3>
                <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-1">
                  Cadastre os serviços que você presta para que tutores possam te encontrar e realizar agendamentos.
                </p>
              </div>
              <Button onClick={handleOpenAddModal} className="mx-auto flex items-center gap-2">
                <Plus size={18} />
                <span>Cadastrar Primeiro Serviço</span>
              </Button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {services.map((service) => {
                const categoryObj = CATEGORIES.find((c) => c.value === service.category);
                return (
                  <motion.div
                    key={service.id}
                    layout
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className={`p-5 rounded-3xl border transition-all flex flex-col justify-between ${
                      service.active
                        ? 'bg-white dark:bg-[#282A2C] border-neutral-100 dark:border-[#313335] shadow-sm'
                        : 'bg-neutral-50 dark:bg-[#1E1F20] border-neutral-200/60 dark:border-[#313335] opacity-75'
                    }`}
                  >
                    <div>
                      <div className="flex items-start justify-between gap-3 mb-2">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base truncate">
                              {service.name}
                            </h3>
                            <span
                              className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                                service.active
                                  ? 'bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50'
                                  : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300'
                              }`}
                            >
                              {service.active ? 'Ativo' : 'Pausado'}
                            </span>
                          </div>
                          {categoryObj && (
                            <span className="text-xs text-orange-600 dark:text-orange-400 font-medium mt-0.5 block">
                              {categoryObj.label}
                            </span>
                          )}
                        </div>

                        <p className="text-lg font-extrabold text-orange-600 dark:text-orange-400 shrink-0">
                          {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(service.price)}
                        </p>
                      </div>

                      {service.description && (
                        <p className="text-xs text-neutral-600 dark:text-[#8E918F] line-clamp-2 mb-3">
                          {service.description}
                        </p>
                      )}

                      <div className="flex items-center gap-3 text-xs text-neutral-500 dark:text-[#8E918F] mb-4">
                        <span className="flex items-center gap-1 bg-neutral-100 dark:bg-[#1E1F20] px-2.5 py-1 rounded-lg border border-transparent dark:border-[#313335]">
                          <Clock size={13} />
                          {service.duration} min
                        </span>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between">
                      <button
                        type="button"
                        onClick={() => handleToggleServiceActive(service.id, service.active)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-xl border transition-colors flex items-center gap-1.5 cursor-pointer ${
                          service.active
                            ? 'border-neutral-200 dark:border-[#313335] text-neutral-600 dark:text-[#E3E3E3] hover:bg-neutral-100 dark:hover:bg-[#313335]'
                            : 'border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-950/30 text-orange-600 dark:text-orange-400'
                        }`}
                      >
                        {service.active ? 'Pausar Atendimento' : 'Ativar Atendimento'}
                      </button>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(service)}
                          className="p-2 text-neutral-500 dark:text-[#8E918F] hover:text-neutral-900 dark:hover:text-[#E3E3E3] hover:bg-neutral-100 dark:hover:bg-[#313335] rounded-xl transition-colors cursor-pointer"
                          title="Editar serviço"
                        >
                          <Edit2 size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => setServiceToDelete(service)}
                          className="p-2 text-red-500 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors cursor-pointer"
                          title="Excluir serviço"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: AVAILABILITY & RULES */}
      {activeTab === 'availability' && (
        <div className="space-y-6">
          {/* Booking Settings Card */}
          <div className="bg-white dark:bg-[#282A2C] rounded-3xl p-6 border border-neutral-100 dark:border-[#313335] shadow-sm space-y-5">
            <div className="flex items-center gap-2">
              <Settings size={20} className="text-orange-500" />
              <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Regras de Agendamento Online</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
              {/* Online Booking Toggle */}
              <div className="p-4 bg-neutral-50 dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/60 dark:border-[#313335] flex flex-col justify-between">
                <div>
                  <span className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] block mb-1">
                    Agendamento Online
                  </span>
                  <p className="text-xs text-neutral-500 dark:text-[#8E918F]">
                    Permitir que clientes agendem seus horários automaticamente pelo app.
                  </p>
                </div>
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xs font-semibold text-neutral-700 dark:text-[#E3E3E3]">
                    {bookingSettings.allowOnlineBooking ? 'Habilitado' : 'Desabilitado'}
                  </span>
                  <button
                    type="button"
                    onClick={() =>
                      setBookingSettings((prev) => ({ ...prev, allowOnlineBooking: !prev.allowOnlineBooking }))
                    }
                    className={`w-12 h-6 flex items-center rounded-full p-1 transition-colors cursor-pointer ${
                      bookingSettings.allowOnlineBooking ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-[#313335]'
                    }`}
                  >
                    <div
                      className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                        bookingSettings.allowOnlineBooking ? 'translate-x-6' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              </div>

              {/* Min Advance Notice */}
              <div className="p-4 bg-neutral-50 dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/60 dark:border-[#313335]">
                <span className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] block mb-1">
                  Antecedência Mínima
                </span>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F] mb-3">
                  Tempo mínimo de antecedência para novo agendamento.
                </p>
                <select
                  value={bookingSettings.minAdvanceNoticeHours}
                  onChange={(e) =>
                    setBookingSettings((prev) => ({ ...prev, minAdvanceNoticeHours: Number(e.target.value) }))
                  }
                  className="w-full bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                >
                  <option value={1}>1 hora antes</option>
                  <option value={2}>2 horas antes</option>
                  <option value={4}>4 horas antes</option>
                  <option value={12}>12 horas antes</option>
                  <option value={24}>24 horas antes (1 dia)</option>
                  <option value={48}>48 horas antes (2 dias)</option>
                </select>
              </div>

              {/* Default Duration */}
              <div className="p-4 bg-neutral-50 dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/60 dark:border-[#313335]">
                <span className="text-sm font-bold text-neutral-900 dark:text-[#E3E3E3] block mb-1">
                  Duração Base dos Slots
                </span>
                <p className="text-xs text-neutral-500 dark:text-[#8E918F] mb-3">
                  Duração padrão dos blocos na sua agenda.
                </p>
                <select
                  value={bookingSettings.defaultDurationMinutes}
                  onChange={(e) =>
                    setBookingSettings((prev) => ({ ...prev, defaultDurationMinutes: Number(e.target.value) }))
                  }
                  className="w-full bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 cursor-pointer"
                >
                  <option value={30}>30 minutos</option>
                  <option value={45}>45 minutos</option>
                  <option value={60}>60 minutos (1h)</option>
                  <option value={90}>90 minutos (1h30)</option>
                  <option value={120}>120 minutos (2h)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Days of Week Hours */}
          <div className="bg-white dark:bg-[#282A2C] rounded-3xl p-6 border border-neutral-100 dark:border-[#313335] shadow-sm space-y-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar size={20} className="text-orange-500" />
                <h2 className="text-lg font-bold text-neutral-900 dark:text-[#E3E3E3]">Horários de Atendimento</h2>
              </div>
              <span className="text-xs text-neutral-400 dark:text-[#8E918F]">Configurado por dia da semana</span>
            </div>

            <div className="space-y-4">
              {DAYS_OF_WEEK.map(({ key, label }) => {
                const day = workingHours[key] || {
                  enabled: false,
                  open: '08:00',
                  close: '18:00',
                  hasBreak: false,
                  breakStart: '12:00',
                  breakEnd: '13:00',
                };

                const hasHoursError = day.enabled && day.open >= day.close;
                const hasBreakError =
                  day.enabled &&
                  day.hasBreak &&
                  (day.breakStart! >= day.breakEnd! || day.breakStart! < day.open || day.breakEnd! > day.close);

                return (
                  <div
                    key={key}
                    className={`p-4 rounded-2xl border transition-all ${
                      day.enabled
                        ? 'bg-neutral-50/70 dark:bg-[#1E1F20] border-neutral-200/70 dark:border-[#313335]'
                        : 'bg-neutral-50/30 dark:bg-[#1E1F20]/40 border-dashed border-neutral-200 dark:border-[#313335]/60 opacity-60'
                    }`}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
                      {/* Day toggle */}
                      <div className="flex items-center gap-3 min-w-[160px]">
                        <button
                          type="button"
                          onClick={() => handleToggleDay(key)}
                          className={`w-10 h-5 flex items-center rounded-full p-0.5 transition-colors cursor-pointer ${
                            day.enabled ? 'bg-orange-500' : 'bg-neutral-300 dark:bg-[#313335]'
                          }`}
                        >
                          <div
                            className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform ${
                              day.enabled ? 'translate-x-5' : 'translate-x-0'
                            }`}
                          />
                        </button>
                        <span
                          className={`text-sm font-bold ${
                            day.enabled ? 'text-neutral-900 dark:text-[#E3E3E3]' : 'text-neutral-400 dark:text-[#8E918F]'
                          }`}
                        >
                          {label}
                        </span>
                      </div>

                      {/* Working Hours Input */}
                      {day.enabled ? (
                        <div className="flex flex-wrap items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-neutral-500 dark:text-[#8E918F]">Das:</span>
                            <input
                              type="time"
                              value={day.open}
                              onChange={(e) => handleTimeChange(key, 'open', e.target.value)}
                              className={`bg-white dark:bg-[#282A2C] border text-xs px-2.5 py-1.5 rounded-lg text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                hasHoursError ? 'border-red-500' : 'border-neutral-200 dark:border-[#313335]'
                              }`}
                            />
                            <span className="text-xs text-neutral-500 dark:text-[#8E918F]">até:</span>
                            <input
                              type="time"
                              value={day.close}
                              onChange={(e) => handleTimeChange(key, 'close', e.target.value)}
                              className={`bg-white dark:bg-[#282A2C] border text-xs px-2.5 py-1.5 rounded-lg text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                hasHoursError ? 'border-red-500' : 'border-neutral-200 dark:border-[#313335]'
                              }`}
                            />
                          </div>

                          {/* Break Toggle */}
                          <div className="flex items-center gap-2 pl-2 border-l border-neutral-200 dark:border-[#313335]">
                            <button
                              type="button"
                              onClick={() => handleToggleBreak(key)}
                              className={`text-xs px-2.5 py-1 rounded-lg border transition-colors flex items-center gap-1 cursor-pointer ${
                                day.hasBreak
                                  ? 'bg-orange-50 dark:bg-orange-950/40 text-orange-600 dark:text-orange-400 border-orange-200 dark:border-orange-900/50 font-semibold'
                                  : 'text-neutral-500 dark:text-[#8E918F] border-neutral-200 dark:border-[#313335] hover:bg-neutral-100 dark:hover:bg-[#282A2C]'
                              }`}
                            >
                              <Coffee size={13} />
                              <span>{day.hasBreak ? 'Com Intervalo' : '+ Adicionar Intervalo'}</span>
                            </button>

                            {day.hasBreak && (
                              <div className="flex items-center gap-1.5">
                                <input
                                  type="time"
                                  value={day.breakStart || '12:00'}
                                  onChange={(e) => handleTimeChange(key, 'breakStart', e.target.value)}
                                  className={`bg-white dark:bg-[#282A2C] border text-xs px-2 py-1 rounded-lg text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                    hasBreakError ? 'border-red-500' : 'border-neutral-200 dark:border-[#313335]'
                                  }`}
                                />
                                <span className="text-xs text-neutral-400">-</span>
                                <input
                                  type="time"
                                  value={day.breakEnd || '13:00'}
                                  onChange={(e) => handleTimeChange(key, 'breakEnd', e.target.value)}
                                  className={`bg-white dark:bg-[#282A2C] border text-xs px-2 py-1 rounded-lg text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500 ${
                                    hasBreakError ? 'border-red-500' : 'border-neutral-200 dark:border-[#313335]'
                                  }`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs font-semibold text-neutral-400 dark:text-[#8E918F]">
                          Fechado / Não atende
                        </span>
                      )}
                    </div>

                    {/* Inline error feedback */}
                    {hasHoursError && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-2">
                        <AlertTriangle size={12} />
                        Horário de encerramento deve ser posterior ao início.
                      </p>
                    )}
                    {hasBreakError && (
                      <p className="text-[11px] text-red-500 flex items-center gap-1 mt-2">
                        <AlertTriangle size={12} />
                        O intervalo deve ser válido e estar dentro do horário de atendimento.
                      </p>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Save Button */}
            <div className="pt-4 flex justify-end border-t border-neutral-100 dark:border-[#313335]">
              <Button
                onClick={handleSaveAvailability}
                isLoading={isSavingAvailability}
                className="px-8 flex items-center gap-2"
              >
                <CheckCircle2 size={18} />
                <span>Salvar Disponibilidade e Regras</span>
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: ADD / EDIT SERVICE */}
      <Modal
        isOpen={isServiceModalOpen}
        onClose={() => setIsServiceModalOpen(false)}
        title={editingService ? 'Editar Serviço' : 'Novo Serviço'}
        size="md"
      >
        <form onSubmit={handleSaveService} className="space-y-4">
          <Input
            label="Nome do Serviço *"
            value={serviceForm.name}
            onChange={(e) => setServiceForm({ ...serviceForm, name: e.target.value })}
            placeholder="Ex: Consulta Domiciliar, Banho com Tosa Higiênica..."
            required
          />

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] mb-1">
              Categoria do Serviço *
            </label>
            <select
              value={serviceForm.category}
              onChange={(e) => setServiceForm({ ...serviceForm, category: e.target.value })}
              className="w-full bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Preço (R$) *"
              value={serviceForm.price}
              onChange={(e) => setServiceForm({ ...serviceForm, price: e.target.value })}
              placeholder="0,00"
              leftIcon={<DollarSign size={16} />}
              required
            />

            <div>
              <label className="block text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] mb-1">
                Duração Estimada *
              </label>
              <select
                value={serviceForm.duration}
                onChange={(e) => setServiceForm({ ...serviceForm, duration: e.target.value })}
                className="w-full bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl px-3.5 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              >
                <option value="15">15 minutos</option>
                <option value="30">30 minutos</option>
                <option value="45">45 minutos</option>
                <option value="60">60 minutos (1h)</option>
                <option value="90">90 minutos (1h30)</option>
                <option value="120">120 minutos (2h)</option>
                <option value="180">180 minutos (3h)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-neutral-700 dark:text-[#E3E3E3] mb-1">
              Descrição detalhada (opcional)
            </label>
            <textarea
              value={serviceForm.description}
              onChange={(e) => setServiceForm({ ...serviceForm, description: e.target.value })}
              rows={3}
              placeholder="Descreva o que está incluído no atendimento, recomendações e cuidados..."
              className="w-full bg-white dark:bg-[#282A2C] border border-neutral-200 dark:border-[#313335] text-neutral-900 dark:text-[#E3E3E3] rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500 placeholder-neutral-400 dark:placeholder-[#8E918F]"
            />
          </div>

          <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-[#1E1F20] rounded-xl border border-neutral-200/60 dark:border-[#313335]">
            <input
              type="checkbox"
              id="serviceActive"
              checked={serviceForm.active}
              onChange={(e) => setServiceForm({ ...serviceForm, active: e.target.checked })}
              className="w-4 h-4 text-orange-500 rounded border-neutral-300 focus:ring-orange-500"
            />
            <label htmlFor="serviceActive" className="text-xs text-neutral-700 dark:text-[#E3E3E3] cursor-pointer">
              <strong>Serviço ativo para agendamento</strong>
              <span className="block text-neutral-400 dark:text-[#8E918F]">
                Tutores poderão visualizar e agendar este serviço imediatamente.
              </span>
            </label>
          </div>

          <div className="pt-4 flex justify-end gap-2 border-t border-neutral-100 dark:border-[#313335]">
            <Button type="button" variant="ghost" onClick={() => setIsServiceModalOpen(false)}>
              Cancelar
            </Button>
            <Button type="submit" isLoading={isSavingService}>
              {editingService ? 'Salvar Alterações' : 'Cadastrar Serviço'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* MODAL: DELETE CONFIRMATION */}
      <Modal
        isOpen={!!serviceToDelete}
        onClose={() => setServiceToDelete(null)}
        title="Excluir Serviço"
        size="sm"
      >
        <div className="space-y-4">
          <p className="text-sm text-neutral-600 dark:text-[#C4C7C5]">
            Tem certeza que deseja excluir o serviço <strong>"{serviceToDelete?.name}"</strong>?
            Esta ação não poderá ser desfeita.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setServiceToDelete(null)}>
              Cancelar
            </Button>
            <Button
              variant="danger"
              isLoading={isDeletingService}
              onClick={handleConfirmDeleteService}
            >
              Excluir Serviço
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
