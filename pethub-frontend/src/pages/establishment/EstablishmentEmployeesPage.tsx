import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Users, Plus, Edit2, Trash2, Phone, CheckCircle2, XCircle, Wrench, Shield, Check, Upload } from 'lucide-react';
import { Input, Button, Modal, Badge, Avatar } from '@/components/ui';

const getFullImageUrl = (url?: string | null) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads')) return `http://localhost:3000${url}`;
  return url;
};

interface EmployeeData {
  id: string;
  name: string;
  role: string;
  phone: string | null;
  description: string | null;
  avatar: string | null;
  active: boolean;
  services: { service: { id: string; name: string } }[];
}

export default function EstablishmentEmployeesPage() {
  const [employees, setEmployees] = useState<EmployeeData[]>([]);
  const [allServices, setAllServices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Form
  const [name, setName] = useState('');
  const [role, setRole] = useState('Tosador');
  const [phone, setPhone] = useState('');
  const [description, setDescription] = useState('');
  const [avatar, setAvatar] = useState('');
  const [active, setActive] = useState(true);
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>([]);

  const toast = useToast();

  const fetchEmployeesAndServices = async () => {
    setLoading(true);
    try {
      const [empRes, srvRes] = await Promise.all([
        api.get('/establishment/employees'),
        api.get('/establishment/services'),
      ]);
      setEmployees(empRes.data);
      setAllServices(srvRes.data);
    } catch (err) {
      console.error('Error fetching employees:', err);
      toast.error('Erro ao carregar colaboradores.');
    } finally {
      setLoading(false);
    }
  };

  const empFileRef = useRef<HTMLInputElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  const handleEmpPhoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingPhoto(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await api.post('/upload/image', formData);
      if (res.data?.url) {
        setAvatar(res.data.url);
        toast.success('Foto carregada com sucesso!');
      }
    } catch (err) {
      console.error(err);
      toast.error('Erro ao enviar foto.');
    } finally {
      setIsUploadingPhoto(false);
      if (empFileRef.current) empFileRef.current.value = '';
    }
  };

  useEffect(() => {
    fetchEmployeesAndServices();
  }, []);

  const openCreateModal = () => {
    setEditingId(null);
    setName('');
    setRole('Tosador');
    setPhone('');
    setDescription('');
    setAvatar('');
    setActive(true);
    setSelectedServiceIds([]);
    setModalOpen(true);
  };

  const openEditModal = (emp: EmployeeData) => {
    setEditingId(emp.id);
    setName(emp.name);
    setRole(emp.role);
    setPhone(emp.phone || '');
    setDescription(emp.description || '');
    setAvatar(emp.avatar || '');
    setActive(emp.active);
    setSelectedServiceIds(emp.services.map(s => s.service.id));
    setModalOpen(true);
  };

  const handleSave = async () => {
    if (!name.trim()) {
      toast.error('Nome do funcionário é obrigatório.');
      return;
    }
    if (!role.trim()) {
      toast.error('Função / cargo é obrigatório.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        role: role.trim(),
        phone: phone.trim() || undefined,
        description: description.trim() || undefined,
        avatar: avatar.trim() || undefined,
        active,
        serviceIds: selectedServiceIds,
      };

      if (editingId) {
        await api.put(`/establishment/employees/${editingId}`, payload);
        toast.success('Funcionário atualizado com sucesso!');
      } else {
        await api.post('/establishment/employees', payload);
        toast.success('Funcionário cadastrado com sucesso!');
      }

      setModalOpen(false);
      fetchEmployeesAndServices();
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao salvar funcionário.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Deseja realmente remover este funcionário?')) return;
    try {
      await api.delete(`/establishment/employees/${id}`);
      toast.success('Funcionário removido.');
      setEmployees(prev => prev.filter(e => e.id !== id));
    } catch (err: any) {
      toast.error(err.response?.data?.error || 'Erro ao remover funcionário.');
    }
  };

  const toggleService = (srvId: string) => {
    setSelectedServiceIds(prev =>
      prev.includes(srvId) ? prev.filter(id => id !== srvId) : [...prev, srvId]
    );
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Equipe & Funcionários</h1>
          <p className="text-neutral-500 text-sm mt-0.5">
            Cadastre veterinários, tosadores e atendentes da sua equipe para atribuição de agendamentos
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
          <Plus size={16} className="mr-1.5" /> Novo Colaborador
        </Button>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando equipe...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-dashed border-neutral-200">
          <Users size={40} className="mx-auto text-neutral-300 mb-3" />
          <h3 className="font-bold text-neutral-800 text-base mb-1">Nenhum funcionário cadastrado</h3>
          <p className="text-xs text-neutral-400 max-w-md mx-auto mb-4">
            Cadastre sua equipe para distribuir atendimentos de banho, tosa e clínica veterinária de forma profissional.
          </p>
          <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={16} className="mr-1" /> Cadastrar Primeiro Funcionário
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {employees.map((emp) => (
            <div key={emp.id} className="bg-white rounded-2xl border border-neutral-200/80 p-5 shadow-xs flex flex-col justify-between space-y-4 hover:border-orange-200 transition-all">
              <div className="space-y-3">
                {/* Avatar & Role Header */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <Avatar src={emp.avatar ? getFullImageUrl(emp.avatar) : '/user.jpg'} name={emp.name} size="md" />
                    <div>
                      <h3 className="font-bold text-neutral-900 text-base">{emp.name}</h3>
                      <span className="text-xs font-semibold text-orange-600">{emp.role}</span>
                    </div>
                  </div>
                  <Badge variant={emp.active ? 'success' : 'default'}>
                    {emp.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>

                {emp.phone && (
                  <p className="text-xs text-neutral-500 flex items-center gap-1.5">
                    <Phone size={13} className="text-neutral-400" />
                    {emp.phone}
                  </p>
                )}

                {emp.description && (
                  <p className="text-xs text-neutral-600 line-clamp-2 leading-relaxed bg-neutral-50 p-2.5 rounded-xl">
                    {emp.description}
                  </p>
                )}

                {/* Assigned Services */}
                <div className="pt-2 border-t border-neutral-100">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 block mb-1.5">
                    Serviços Habilitados ({emp.services.length})
                  </span>
                  {emp.services.length === 0 ? (
                    <span className="text-[11px] text-neutral-400 italic">Nenhum serviço vinculado</span>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {emp.services.map(s => (
                        <span key={s.service.id} className="text-[10px] font-semibold bg-orange-50 text-orange-800 px-2 py-0.5 rounded-md border border-orange-100">
                          {s.service.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Actions */}
              <div className="pt-3 border-t border-neutral-100 flex gap-2 justify-end">
                <button
                  onClick={() => openEditModal(emp)}
                  className="p-2 hover:bg-neutral-100 text-neutral-600 rounded-lg transition-colors"
                  title="Editar funcionário"
                >
                  <Edit2 size={16} />
                </button>
                <button
                  onClick={() => handleDelete(emp.id)}
                  className="p-2 hover:bg-red-50 text-red-600 rounded-lg transition-colors"
                  title="Excluir funcionário"
                >
                  <Trash2 size={16} />
                </button>
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
          title={editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
          size="md"
        >
          <div className="space-y-4 text-xs">
            <Input
              label="Nome Completo *"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ex: Carlos Eduardo"
              required
            />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Função / Cargo *</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value)}
                  className="w-full border border-neutral-200 rounded-xl px-3 py-2 text-xs bg-white"
                >
                  <option value="Tosador">Tosador</option>
                  <option value="Banhista">Banhista</option>
                  <option value="Veterinário">Veterinário</option>
                  <option value="Adestrador">Adestrador</option>
                  <option value="Atendente / Recepção">Atendente / Recepção</option>
                  <option value="Outro">Outro</option>
                </select>
              </div>

              <Input
                label="Telefone / Celular"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="(14) 99777-1122"
              />
            </div>

            {/* Real Employee Photo Upload */}
            <div className="space-y-1.5">
              <label className="block text-xs font-bold text-neutral-700 uppercase">
                Foto do Colaborador
              </label>
              <input
                type="file"
                ref={empFileRef}
                accept="image/*"
                className="hidden"
                onChange={handleEmpPhoto}
              />
              
              <div className="flex items-center gap-3">
                <Avatar
                  src={avatar ? getFullImageUrl(avatar) : '/user.jpg'}
                  name={name || 'Colaborador'}
                  size="lg"
                />
                <div className="flex-1">
                  <button
                    type="button"
                    onClick={() => empFileRef.current?.click()}
                    disabled={isUploadingPhoto}
                    className="px-4 py-2 border border-neutral-300 hover:border-orange-500 rounded-xl text-xs font-bold text-neutral-700 hover:bg-orange-50/50 transition-all flex items-center gap-1.5 cursor-pointer"
                  >
                    <Upload size={14} className={isUploadingPhoto ? "animate-bounce" : ""} />
                    {isUploadingPhoto ? 'Enviando...' : (avatar ? 'Alterar foto do dispositivo' : 'Selecionar foto do dispositivo')}
                  </button>
                  <p className="text-[11px] text-neutral-400 mt-1">
                    Formatos aceitos: JPG, PNG, WebP do computador ou celular
                  </p>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-neutral-700 uppercase mb-1">Biografia / Observações</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
                placeholder="Especialidade em felinos, certificados, etc..."
                className="w-full border border-neutral-200 rounded-xl p-2.5 text-xs text-neutral-800 resize-none"
              />
            </div>

            {/* Status toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="emp-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="emp-active" className="text-xs font-bold text-neutral-800 cursor-pointer">
                Colaborador ativo para agendamentos
              </label>
            </div>

            {/* Assign Services */}
            {allServices.length > 0 && (
              <div>
                <label className="block text-xs font-bold text-neutral-700 uppercase mb-1.5">
                  Serviços que este colaborador realiza:
                </label>
                <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto p-1 bg-neutral-50 rounded-xl border border-neutral-200">
                  {allServices.map((srv) => {
                    const selected = selectedServiceIds.includes(srv.id);
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => toggleService(srv.id)}
                        className={`flex items-center gap-2 p-2 rounded-lg text-left transition-colors text-xs ${
                          selected ? 'bg-orange-500 text-white font-bold' : 'bg-white hover:bg-neutral-100 text-neutral-800'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                          selected ? 'bg-white text-orange-500 border-white' : 'border-neutral-300'
                        }`}>
                          {selected && <Check size={12} />}
                        </div>
                        <span className="truncate">{srv.name}</span>
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
                {editingId ? 'Salvar Alterações' : 'Cadastrar Colaborador'}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
