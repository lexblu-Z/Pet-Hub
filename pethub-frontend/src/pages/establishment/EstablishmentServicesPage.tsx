import React, { useEffect, useState } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Wrench, Plus, Edit2, Trash2, Clock, DollarSign, Image as ImageIcon, Users, Check } from 'lucide-react';
import { Input, Button, Modal } from '@/components/ui';

interface ServiceItem {
  id: string;
  name: string;
  description: string | null;
  price: number;
  duration: number;
  image: string | null;
  category: string | null;
  animalType: string | null;
  employees?: { employee: { id: string; name: string } }[];
}

const serviceImagePresets = [
  { label: 'Banho & Higiene', url: 'https://images.unsplash.com/photo-1516734212186-a967f81ad0d7?auto=format&fit=crop&w=600&q=80' },
  { label: 'Tosa & Estética', url: 'https://images.unsplash.com/photo-1527526029430-319f10814151?auto=format&fit=crop&w=600&q=80' },
  { label: 'Consulta Veterinária', url: 'https://images.unsplash.com/photo-1628009368231-7bb7cfcb0def?auto=format&fit=crop&w=600&q=80' },
  { label: 'Hospedagem & Creche', url: 'https://images.unsplash.com/photo-1548199973-03cce0bbc87b?auto=format&fit=crop&w=600&q=80' },
];

export default function EstablishmentServicesPage() {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [duration, setDuration] = useState('30');
  const [image, setImage] = useState('');
  const [category, setCategory] = useState('Banho e tosa');
  const [animalType, setAnimalType] = useState('all');
  const [selectedEmployeeIds, setSelectedEmployeeIds] = useState<string[]>([]);

  const toast = useToast();

  const fetchServices = async () => {
    setLoading(true);
    try {
      const res = await api.get('/establishment/services');
      setServices(res.data);
      const empRes = await api.get('/establishment/employees');
      setEmployees(empRes.data);
    } catch (err) {
      console.error('Error fetching services:', err);
      toast.error('Erro ao carregar serviços.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchServices();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setDuration('30');
    setImage(serviceImagePresets[0].url);
    setCategory('Banho e tosa');
    setAnimalType('all');
    setSelectedEmployeeIds([]);
    setModalOpen(true);
  };

  const openEditModal = (s: ServiceItem) => {
    setEditingId(s.id);
    setName(s.name);
    setDescription(s.description || '');
    setPrice(String(s.price));
    setDuration(String(s.duration));
    setImage(s.image || serviceImagePresets[0].url);
    setCategory(s.category || 'Banho e tosa');
    setAnimalType(s.animalType || 'all');
    setSelectedEmployeeIds(s.employees?.map(e => e.employee.id) || []);
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do serviço é obrigatório.');
      return;
    }
    const numPrice = parseFloat(price.replace(',', '.'));
    if (isNaN(numPrice) || numPrice < 0) {
      toast.error('Informe um preço válido.');
      return;
    }
    const numDuration = parseInt(duration, 10);
    if (isNaN(numDuration) || numDuration <= 0) {
      toast.error('Informe uma duração válida em minutos.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        description: description.trim() || undefined,
        price: numPrice,
        duration: numDuration,
        image: image || undefined,
        category,
        animalType,
        employeeIds: selectedEmployeeIds,
      };

      if (editingId) {
        await api.put(`/establishment/services/${editingId}`, payload);
        toast.success('Serviço atualizado com sucesso!');
      } else {
        await api.post('/establishment/services', payload);
        toast.success('Serviço cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchServices();
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao salvar serviço.';
      toast.error(msg);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente excluir este serviço?')) return;
    try {
      await api.delete(`/establishment/services/${id}`);
      toast.success('Serviço removido.');
      setServices(prev => prev.filter(s => s.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover serviço.');
    }
  };

  const toggleEmployee = (empId: string) => {
    setSelectedEmployeeIds(prev =>
      prev.includes(empId) ? prev.filter(id => id !== empId) : [...prev, empId]
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Serviços Oferecidos</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Cadastre e gerencie os serviços disponíveis para agendamento pelos tutores
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
          <Plus size={16} className="mr-1.5" /> Novo Serviço
        </Button>
      </div>

      {/* Services Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando serviços do PostgreSQL...</p>
        </div>
      ) : services.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
          <Wrench size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum serviço cadastrado</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
            Cadastre banhos, tosas, consultas e outros serviços para que os tutores de Ourinhos possam agendar online.
          </p>
          <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={16} className="mr-1" /> Cadastrar Primeiro Serviço
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {services.map((s) => (
            <div key={s.id} className="bg-white rounded-2xl border border-neutral-200/80 overflow-hidden shadow-xs flex flex-col group hover:shadow-sm transition-all">
              {/* Service Image */}
              <div className="h-44 bg-neutral-100 relative overflow-hidden">
                <img
                  src={s.image || serviceImagePresets[0].url}
                  alt={s.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute top-2.5 right-2.5 flex gap-1.5">
                  <span className="bg-black/70 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-lg">
                    {s.duration} min
                  </span>
                  <span className="bg-orange-500 text-white text-[11px] font-bold px-2.5 py-1 rounded-lg shadow-xs">
                    R$ {s.price.toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              {/* Service Details */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-orange-600 bg-orange-50 px-2 py-0.5 rounded">
                      {s.category || 'Geral'}
                    </span>
                    <span className="text-[11px] text-neutral-400 font-medium">
                      {s.animalType === 'dog' ? '🐶 Cães' : s.animalType === 'cat' ? '🐱 Gatos' : '🐾 Cães & Gatos'}
                    </span>
                  </div>
                  <h3 className="font-bold text-neutral-900 text-base">{s.name}</h3>
                  <p className="text-xs text-neutral-500 line-clamp-2 leading-relaxed">
                    {s.description || 'Sem descrição cadastrada.'}
                  </p>
                </div>

                {/* Assigned employees */}
                {s.employees && s.employees.length > 0 && (
                  <div className="pt-2 border-t border-neutral-50 flex items-center gap-1.5 text-[11px] text-neutral-500">
                    <Users size={12} className="text-neutral-400" />
                    <span className="truncate">
                      Profissionais: {s.employees.map(e => e.employee.name).join(', ')}
                    </span>
                  </div>
                )}

                {/* Actions */}
                <div className="pt-3 border-t border-neutral-100 flex gap-2 justify-end">
                  <button
                    onClick={() => openEditModal(s)}
                    className="p-2 hover:bg-neutral-100 text-neutral-600 rounded-lg transition-colors"
                    title="Editar serviço"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(s.id)}
                    className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                    title="Excluir serviço"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create / Edit Modal */}
      {modalOpen && (
        <Modal
          isOpen={modalOpen}
          onClose={() => setModalOpen(false)}
          title={editingId ? 'Editar Serviço' : 'Novo Serviço'}
          size="lg"
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Nome do Serviço *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Banho Completo com Hidratação"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <Input
                label="Preço (R$) *"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="60,00"
                leftIcon={<DollarSign size={14} />}
                required
              />
              <Input
                label="Duração Estimada (minutos) *"
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                placeholder="45"
                leftIcon={<Clock size={14} />}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Categoria</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="Banho e tosa">Banho e tosa</option>
                  <option value="Veterinária">Veterinária</option>
                  <option value="Hospedagem & Creche">Hospedagem & Creche</option>
                  <option value="Adestramento">Adestramento</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Tipo de Animal</label>
                <select
                  value={animalType}
                  onChange={(e) => setAnimalType(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="all">Todos (Cães e Gatos)</option>
                  <option value="dog">Apenas Cães</option>
                  <option value="cat">Apenas Gatos</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Descrição</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Descreva as etapas do serviço, produtos utilizados, etc..."
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-800 resize-none"
              />
            </div>

            {/* Image Selection / Presets */}
            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Imagem do Serviço</label>
              <Input
                value={image}
                onChange={(e) => setImage(e.target.value)}
                placeholder="URL da imagem"
                leftIcon={<ImageIcon size={14} />}
              />
              <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                {serviceImagePresets.map((preset, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setImage(preset.url)}
                    className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold whitespace-nowrap ${
                      image === preset.url
                        ? 'border-orange-500 bg-orange-50 text-orange-700'
                        : 'border-neutral-200 bg-neutral-50 text-neutral-600 hover:bg-neutral-100'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Assign Employees */}
            {employees.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Funcionários que realizam este serviço
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-28 overflow-y-auto p-1 bg-neutral-50 rounded-xl border border-neutral-200">
                  {employees.map((emp) => {
                    const selected = selectedEmployeeIds.includes(emp.id);
                    return (
                      <button
                        key={emp.id}
                        type="button"
                        onClick={() => toggleEmployee(emp.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-xs ${
                          selected ? 'bg-orange-500 text-white font-bold' : 'bg-white hover:bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selected ? 'bg-white text-orange-500 border-white' : 'border-neutral-300'
                        }`}>
                          {selected && <Check size={12} />}
                        </div>
                        <span className="truncate">{emp.name} ({emp.role})</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="pt-3 border-t border-neutral-100 flex gap-2 justify-end">
              <Button variant="ghost" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button onClick={handleSave} isLoading={saving} className="bg-orange-500 hover:bg-orange-600 text-white">
                {editingId ? 'Salvar Alterações' : 'Cadastrar Serviço'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
