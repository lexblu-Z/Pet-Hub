import React, { useEffect, useState, useRef } from 'react';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { Users, Plus, Edit2, Trash2, Phone, Mail, CheckCircle2, XCircle, Wrench, Shield, Check, Upload } from 'lucide-react';
import { Input, Button, Modal, Badge, Avatar } from '@/components/ui';

const PREDEFINED_ROLES = [
  'Gerente',
  'Subgerente',
  'Supervisor',
  'Recepcionista',
  'Atendente',
  'Veterinário',
  'Banhista',
  'Tosador',
  'Auxiliar',
  'Outro',
];

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
  email?: string | null;
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
  const [roleSelect, setRoleSelect] = useState('Gerente');
  const [customRole, setCustomRole] = useState('');
  const [email, setEmail] = useState('');
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
  const bioTextareaRef = useRef<HTMLTextAreaElement>(null);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);

  useEffect(() => {
    if (modalOpen && bioTextareaRef.current) {
      bioTextareaRef.current.scrollTop = 0;
    }
  }, [modalOpen, editingId]);

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
    setRoleSelect('Gerente');
    setCustomRole('');
    setEmail('');
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
    const isPredefined = PREDEFINED_ROLES.filter(r => r !== 'Outro').includes(emp.role);
    if (isPredefined) {
      setRoleSelect(emp.role);
      setCustomRole('');
    } else {
      setRoleSelect('Outro');
      setCustomRole(emp.role);
    }
    setEmail(emp.email || '');
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
    const finalRole = roleSelect === 'Outro' ? customRole.trim() : roleSelect.trim();
    if (!finalRole) {
      toast.error('Cargo ou função do funcionário é obrigatório.');
      return;
    }
    if (email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        toast.error('Informe um e-mail válido para o colaborador.');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        name: name.trim(),
        role: finalRole,
        email: email.trim() || undefined,
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
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Equipe & Funcionários</h1>
          <p className="text-neutral-500 dark:text-[#8E918F] text-sm mt-0.5">
            Cadastre veterinários, tosadores e atendentes da sua equipe para atribuição de agendamentos
          </p>
        </div>
        <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white shadow-xs">
          <Plus size={16} className="mr-1.5" /> Novo Colaborador
        </Button>
      </div>

      {/* Employees Grid */}
      {loading ? (
        <div className="p-12 text-center text-neutral-400 dark:text-[#8E918F]">
          <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
          <p className="text-sm">Carregando equipe...</p>
        </div>
      ) : employees.length === 0 ? (
        <div className="p-12 text-center bg-white dark:bg-[#1E1F20] rounded-2xl border border-dashed border-neutral-200 dark:border-[#313335]">
          <Users size={40} className="mx-auto text-neutral-300 dark:text-neutral-600 mb-3" />
          <h3 className="font-bold text-neutral-800 dark:text-[#E3E3E3] text-base mb-1">Nenhum funcionário cadastrado</h3>
          <p className="text-xs text-neutral-400 dark:text-[#8E918F] max-w-md mx-auto mb-4">
            Cadastre sua equipe para distribuir atendimentos de banho, tosa e clínica veterinária de forma profissional.
          </p>
          <Button onClick={openCreateModal} className="bg-orange-500 hover:bg-orange-600 text-white">
            <Plus size={16} className="mr-1" /> Cadastrar Primeiro Funcionário
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 items-stretch">
          {employees.map((emp) => (
            <div
              key={emp.id}
              className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-200/80 dark:border-[#313335] p-5 shadow-xs flex flex-col h-full hover:border-orange-200 dark:hover:border-orange-500/40 transition-all"
            >
              {/* 1. Avatar & Role Header */}
              <div className="flex items-start justify-between gap-3 min-h-[48px]">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar src={emp.avatar ? getFullImageUrl(emp.avatar) : '/user.jpg'} name={emp.name} size="md" />
                  <div className="min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <h3 className="font-bold text-neutral-900 dark:text-[#E3E3E3] text-base truncate" title={emp.name}>
                        {emp.name}
                      </h3>
                      {emp.role === 'Gerente' && (
                        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60 shadow-2xs shrink-0">
                          <Shield size={10} className="text-amber-600 dark:text-amber-400" />
                          Gerência
                        </span>
                      )}
                    </div>
                    <span className="text-xs font-semibold text-orange-600 dark:text-orange-400 block truncate">
                      {emp.role}
                    </span>
                  </div>
                </div>
                <div className="shrink-0">
                  <Badge variant={emp.active ? 'success' : 'default'}>
                    {emp.active ? 'Ativo' : 'Inativo'}
                  </Badge>
                </div>
              </div>

              {/* 2. Contact Information Block (Email & Phone - Fixed height & identical slots in all cards) */}
              <div className="pt-3.5 space-y-1.5 border-t border-neutral-100/80 dark:border-[#313335]/60 mt-3">
                {/* Email Slot: Always rendered to prevent vertical displacement across cards */}
                <div className="flex items-center gap-2 text-xs h-5">
                  <Mail size={13} className="text-neutral-400 dark:text-[#8E918F] shrink-0" />
                  {emp.email ? (
                    <span className="truncate text-neutral-600 dark:text-[#C4C7C5]" title={emp.email}>
                      {emp.email}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-[#5F6368] italic text-[11px]">
                      E-mail não informado
                    </span>
                  )}
                </div>

                {/* Phone Slot: Always rendered to keep consistent alignment */}
                <div className="flex items-center gap-2 text-xs h-5">
                  <Phone size={13} className="text-neutral-400 dark:text-[#8E918F] shrink-0" />
                  {emp.phone ? (
                    <span className="truncate text-neutral-600 dark:text-[#C4C7C5]" title={emp.phone}>
                      {emp.phone}
                    </span>
                  ) : (
                    <span className="text-neutral-400 dark:text-[#5F6368] italic text-[11px]">
                      Telefone não informado
                    </span>
                  )}
                </div>
              </div>

              {/* 3. Biography / Observações Block (Uniform height across cards) */}
              <div className="pt-3">
                {emp.description ? (
                  <div
                    className="text-xs text-neutral-600 dark:text-[#C4C7C5] leading-relaxed bg-neutral-50 dark:bg-[#282A2C] p-2.5 rounded-xl border border-neutral-100/80 dark:border-[#313335]/60 h-[58px] flex items-center"
                    title={emp.description}
                  >
                    <p className="line-clamp-2 w-full">
                      {emp.description}
                    </p>
                  </div>
                ) : (
                  <div className="p-2.5 rounded-xl bg-neutral-50/50 dark:bg-[#282A2C]/30 border border-dashed border-neutral-200/60 dark:border-[#313335]/60 h-[58px] flex items-center justify-center text-center">
                    <span className="text-[11px] text-neutral-400 dark:text-[#5F6368] italic">
                      Sem biografia / observações
                    </span>
                  </div>
                )}
              </div>

              {/* 4. Assigned Services Section */}
              <div className="pt-3 border-t border-neutral-100 dark:border-[#313335] mt-3 flex-1 flex flex-col justify-start min-h-[72px]">
                <span className="text-[10px] font-bold uppercase tracking-wider text-neutral-400 dark:text-[#8E918F] block mb-1.5">
                  Serviços Habilitados ({emp.services.length})
                </span>
                {emp.services.length === 0 ? (
                  <span className="text-[11px] text-neutral-400 dark:text-[#8E918F] italic block py-1">
                    Nenhum serviço vinculado
                  </span>
                ) : (
                  <div className="flex flex-wrap gap-1.5 max-h-[68px] overflow-y-auto pr-0.5">
                    {emp.services.map((s) => (
                      <span
                        key={s.service.id}
                        className="text-[10px] font-semibold bg-orange-50 dark:bg-orange-950/40 text-orange-800 dark:text-orange-300 px-2 py-0.5 rounded-md border border-orange-100 dark:border-orange-800/50 truncate max-w-full"
                        title={s.service.name}
                      >
                        {s.service.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* 5. Card Footer Actions (Pinned strictly to bottom with mt-auto) */}
              <div className="mt-auto pt-3 border-t border-neutral-100 dark:border-[#313335] flex items-center justify-between">
                <span className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                  Ações
                </span>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => openEditModal(emp)}
                    className="p-2 hover:bg-neutral-100 dark:hover:bg-[#282A2C] text-neutral-600 dark:text-[#C4C7C5] hover:text-orange-600 dark:hover:text-orange-400 rounded-lg transition-colors cursor-pointer"
                    title="Editar funcionário"
                  >
                    <Edit2 size={16} />
                  </button>
                  <button
                    onClick={() => handleDelete(emp.id)}
                    className="p-2 hover:bg-red-50 dark:hover:bg-red-950/40 text-red-600 dark:text-red-400 rounded-lg transition-colors cursor-pointer"
                    title="Excluir funcionário"
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
          title={editingId ? 'Editar Funcionário' : 'Novo Funcionário'}
          size="lg"
        >
          <div className="space-y-5 text-xs max-h-[75vh] overflow-y-auto pr-1">
            {/* 1. Identificação Básica */}
            <div className="space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block border-b border-neutral-100 dark:border-[#313335] pb-1">
                Identificação & Cargo
              </span>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                <Input
                  label="Nome Completo *"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo"
                  required
                />

                <div>
                  <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase mb-1">
                    Cargo / Função *
                  </label>
                  <select
                    value={roleSelect}
                    onChange={(e) => setRoleSelect(e.target.value)}
                    className="w-full border border-neutral-200 dark:border-[#313335] rounded-xl px-3.5 py-2.5 text-xs bg-white dark:bg-[#282A2C] text-neutral-900 dark:text-[#E3E3E3] focus:outline-none focus:ring-2 focus:ring-orange-500/20 font-medium"
                  >
                    {PREDEFINED_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {roleSelect === 'Outro' && (
                <div className="pt-1">
                  <Input
                    label="Especifique o Cargo / Função *"
                    value={customRole}
                    onChange={(e) => setCustomRole(e.target.value)}
                    placeholder="Ex: Esteticista Canino, Cuidador, etc."
                    required
                  />
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                <Input
                  label="E-mail do funcionário (opcional)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="funcionario@exemplo.com"
                  leftIcon={<Mail size={14} />}
                />

                <Input
                  label="Telefone / Celular (opcional)"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="(14) 99777-1122"
                  leftIcon={<Phone size={14} />}
                />
              </div>
            </div>

            {/* 2. Foto e Biografia */}
            <div className="space-y-3 pt-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400 block border-b border-neutral-100 dark:border-[#313335] pb-1">
                Foto e Apresentação
              </span>

              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase">
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
                      className="px-4 py-2 border border-neutral-300 dark:border-[#313335] hover:border-orange-500 dark:hover:border-orange-500 rounded-xl text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] hover:bg-orange-50/50 dark:hover:bg-[#282A2C] transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <Upload size={14} className={isUploadingPhoto ? "animate-bounce" : ""} />
                      {isUploadingPhoto ? 'Enviando...' : (avatar ? 'Alterar foto do dispositivo' : 'Selecionar foto do dispositivo')}
                    </button>
                    <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
                      Formatos aceitos: JPG, PNG, WebP do computador ou celular
                    </p>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-neutral-700 dark:text-[#C4C7C5] uppercase">
                    Biografia / Observações
                  </label>
                  <span className="text-[11px] text-neutral-400 dark:text-[#8E918F]">
                    {description.length} caracteres
                  </span>
                </div>
                <textarea
                  ref={bioTextareaRef}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Especialidade em banho terapêutico, certificados, anos de experiência, observações para a equipe..."
                  className="w-full border border-neutral-200 dark:border-[#313335] bg-white dark:bg-[#282A2C] rounded-xl px-3.5 py-3 text-xs leading-relaxed text-neutral-800 dark:text-[#E3E3E3] min-h-[96px] max-h-[200px] overflow-y-auto focus:outline-none focus:ring-2 focus:ring-orange-500/20 transition-all placeholder:text-neutral-400 dark:placeholder:text-[#8E918F]"
                />
                <p className="text-[11px] text-neutral-400 dark:text-[#8E918F] mt-1">
                  Apresentação profissional visível na gestão e atribuição de serviços da equipe.
                </p>
              </div>
            </div>

            {/* 3. Atribuição de Serviços */}
            {allServices.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between border-b border-neutral-100 dark:border-[#313335] pb-1">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-orange-600 dark:text-orange-400">
                    Serviços Habilitados
                  </span>
                  <span className="text-[11px] font-medium text-neutral-500 dark:text-[#8E918F]">
                    {selectedServiceIds.length} de {allServices.length} selecionado(s)
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-40 overflow-y-auto p-1.5 bg-neutral-50 dark:bg-[#1E1F20] rounded-xl border border-neutral-200 dark:border-[#313335]">
                  {allServices.map((srv) => {
                    const selected = selectedServiceIds.includes(srv.id);
                    return (
                      <button
                        key={srv.id}
                        type="button"
                        onClick={() => toggleService(srv.id)}
                        className={`flex items-center gap-2 p-2.5 rounded-lg text-left transition-colors text-xs cursor-pointer ${
                          selected
                            ? 'bg-orange-500 text-white font-bold'
                            : 'bg-white dark:bg-[#282A2C] hover:bg-neutral-100 dark:hover:bg-[#313335] text-neutral-800 dark:text-[#E3E3E3] border border-neutral-200/50 dark:border-transparent'
                        }`}
                      >
                        <div className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${
                          selected ? 'bg-white text-orange-500 border-white' : 'border-neutral-300 dark:border-neutral-600'
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

            {/* 4. Status toggle */}
            <div className="pt-2 flex items-center gap-2.5 bg-neutral-50 dark:bg-[#282A2C] p-3 rounded-xl border border-neutral-200 dark:border-[#313335]">
              <input
                type="checkbox"
                id="emp-active"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 cursor-pointer"
              />
              <label htmlFor="emp-active" className="text-xs font-bold text-neutral-800 dark:text-[#E3E3E3] cursor-pointer">
                Colaborador ativo para novos agendamentos na plataforma
              </label>
            </div>

            {/* Modal Actions */}
            <div className="pt-4 border-t border-neutral-100 dark:border-[#313335] flex gap-2 justify-end">
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
