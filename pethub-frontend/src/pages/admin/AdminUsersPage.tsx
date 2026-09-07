import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Calendar, Shield, Eye, Building2, Stethoscope, PawPrint, Trash2, AlertTriangle } from 'lucide-react';
import { Input, Button, Badge, Modal, Avatar } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';
import { useAuthStore } from '@/store/authStore';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userToDelete, setUserToDelete] = useState<any>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const { currentUser } = useAuthStore();
  const toast = useToast();

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await api.get('/admin/users');
      setUsers(res.data);
    } catch (err) {
      toast.error('Erro ao carregar usuários.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;
    setIsDeleting(true);
    try {
      await api.delete(`/admin/users/${userToDelete.id}`);
      toast.success('Conta excluída com sucesso.');
      setUsers((prev) => prev.filter((u) => u.id !== userToDelete.id));
      setUserToDelete(null);
    } catch (err: any) {
      const msg = err.response?.data?.error || 'Erro ao excluir conta. Tente novamente.';
      toast.error(msg);
    } finally {
      setIsDeleting(false);
    }
  };

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="brand" className="inline-flex items-center gap-1"><Shield size={11} /> Admin</Badge>;
      case 'ESTABLISHMENT':
        return <Badge variant="warning" className="inline-flex items-center gap-1"><Building2 size={11} /> Estabelecimento</Badge>;
      case 'PROFESSIONAL':
        return <Badge variant="info" className="inline-flex items-center gap-1"><Stethoscope size={11} /> Profissional</Badge>;
      case 'TUTOR':
      default:
        return <Badge variant="success" className="inline-flex items-center gap-1"><PawPrint size={11} /> Tutor</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900 dark:text-[#E3E3E3]">Usuários da Plataforma</h1>
          <p className="text-neutral-500 dark:text-[#C4C7C5] text-sm mt-0.5">Visualize e gerencie todos os tutores, estabelecimentos e administradores</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 dark:bg-[#282A2C] rounded-xl text-neutral-700 dark:text-[#C4C7C5]">
            Total: {users.length} usuários
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
        <div className="flex-1 max-w-md">
          <Input
            placeholder="Buscar por nome, e-mail ou telefone..."
            leftIcon={<Search size={16} />}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="flex flex-wrap gap-2 text-xs font-semibold">
          {[
            { id: 'ALL', label: 'Todos' },
            { id: 'TUTOR', label: 'Tutores' },
            { id: 'ESTABLISHMENT', label: 'Estabelecimentos' },
            { id: 'PROFESSIONAL', label: 'Profissionais' },
            { id: 'ADMIN', label: 'Admins' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                roleFilter === r.id
                  ? 'bg-neutral-900 text-white dark:bg-orange-500 dark:text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200 dark:bg-[#282A2C] dark:text-[#C4C7C5] dark:hover:bg-[#313335]'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white dark:bg-[#1E1F20] rounded-2xl border border-neutral-100 dark:border-[#313335] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-12 text-center text-neutral-400">
            <div className="w-8 h-8 border-2 border-orange-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            <p className="text-sm">Carregando usuários...</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-neutral-400 space-y-2">
            <User size={40} className="mx-auto opacity-30 text-neutral-500" />
            <p className="font-bold text-neutral-700">Nenhum usuário encontrado</p>
            <p className="text-xs text-neutral-400">Tente ajustar a busca ou o filtro de perfil.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-neutral-100 dark:border-[#313335] bg-neutral-50/50 dark:bg-[#282A2C]/50 text-neutral-400 dark:text-[#8E918F] text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Usuário</th>
                  <th className="py-3.5 px-4">Tipo de Conta</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100 dark:divide-[#313335]">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/60 dark:hover:bg-[#282A2C]/50 transition-colors">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <Avatar
                          src={user.establishmentProfile?.photos?.[0] || user.avatar}
                          name={user.name}
                          size="sm"
                          role={user.role}
                          isEstablishment={user.role === 'ESTABLISHMENT'}
                          entityType={user.role === 'PROFESSIONAL' ? 'professional' : user.role === 'ESTABLISHMENT' ? 'establishment' : 'tutor'}
                        />
                        <div>
                          <div className="font-bold text-neutral-900 dark:text-[#E3E3E3]">{user.name}</div>
                          <div className="text-xs text-neutral-400 dark:text-[#8E918F]">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-4 px-4 text-neutral-600 dark:text-[#C4C7C5] text-xs">
                      {user.phone || 'Sem telefone'}
                    </td>
                    <td className="py-4 px-4 text-neutral-500 dark:text-[#8E918F] text-xs">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => setSelectedUser(user)}
                          className="px-2.5 py-1.5 bg-neutral-100 dark:bg-[#282A2C] hover:bg-neutral-200 dark:hover:bg-[#313335] text-neutral-700 dark:text-[#C4C7C5] text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                        >
                          <Eye size={13} /> Detalhes
                        </button>
                        {user.id === currentUser?.id ? (
                          <span className="px-2.5 py-1.5 bg-neutral-100 dark:bg-[#282A2C] text-neutral-400 dark:text-[#8E918F] text-xs font-semibold rounded-lg select-none">
                            Você
                          </span>
                        ) : (
                          <button
                            onClick={() => setUserToDelete(user)}
                            className="px-2.5 py-1.5 bg-red-50 dark:bg-red-950/40 hover:bg-red-100 dark:hover:bg-red-900/50 text-red-600 dark:text-red-400 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1 cursor-pointer"
                            title="Excluir conta do sistema"
                          >
                            <Trash2 size={13} /> Excluir
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* User Details Modal */}
      {selectedUser && (
        <Modal
          isOpen={!!selectedUser}
          onClose={() => setSelectedUser(null)}
          title="Detalhes do Usuário"
          size="sm"
        >
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-2xl">
              <Avatar
                src={selectedUser.establishmentProfile?.photos?.[0] || selectedUser.avatar}
                name={selectedUser.name}
                size="lg"
                role={selectedUser.role}
                isEstablishment={selectedUser.role === 'ESTABLISHMENT'}
                entityType={selectedUser.role === 'PROFESSIONAL' ? 'professional' : selectedUser.role === 'ESTABLISHMENT' ? 'establishment' : 'tutor'}
              />
              <div>
                <p className="font-bold text-base text-neutral-900 dark:text-[#E3E3E3]">{selectedUser.name}</p>
                <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
              </div>
            </div>

            <div className="space-y-2 border border-neutral-100 dark:border-[#313335] rounded-xl p-3">
              <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-[#313335]">
                <span className="text-neutral-500 dark:text-[#8E918F] text-xs">E-mail:</span>
                <span className="font-medium text-neutral-900 dark:text-[#E3E3E3] text-xs">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-[#313335]">
                <span className="text-neutral-500 dark:text-[#8E918F] text-xs">Telefone:</span>
                <span className="font-medium text-neutral-900 dark:text-[#E3E3E3] text-xs">{selectedUser.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50 dark:border-[#313335]">
                <span className="text-neutral-500 dark:text-[#8E918F] text-xs">Criado em:</span>
                <span className="font-medium text-neutral-900 dark:text-[#E3E3E3] text-xs">{new Date(selectedUser.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {selectedUser._count?.pets !== undefined && (
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500 dark:text-[#8E918F] text-xs">Pets cadastrados:</span>
                  <span className="font-bold text-orange-600 dark:text-orange-400 text-xs">{selectedUser._count.pets}</span>
                </div>
              )}
            </div>

            {selectedUser.establishmentProfile && (
              <div className="p-3 bg-amber-50/60 dark:bg-amber-950/30 border border-amber-200/60 dark:border-amber-800/50 rounded-xl space-y-1">
                <p className="text-xs font-bold text-amber-900 dark:text-amber-200">Perfil de Estabelecimento</p>
                <p className="text-xs text-amber-800 dark:text-amber-300 font-medium">Nome: {selectedUser.establishmentProfile.businessName || selectedUser.name}</p>
                <p className="text-xs text-amber-800 dark:text-amber-300">Status: {selectedUser.establishmentProfile.status}</p>
              </div>
            )}

            <div className="pt-2 flex justify-end">
              <Button fullWidth variant="ghost" onClick={() => setSelectedUser(null)}>
                Fechar
              </Button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete User Confirmation Modal */}
      {userToDelete && (
        <Modal
          isOpen={!!userToDelete}
          onClose={() => !isDeleting && setUserToDelete(null)}
          title="Excluir conta?"
          size="sm"
        >
          <div className="space-y-4 text-sm">
            <div className="p-3.5 bg-red-50 dark:bg-red-950/40 border border-red-200/80 dark:border-red-900/50 rounded-2xl flex items-start gap-3">
              <AlertTriangle className="text-red-500 shrink-0 mt-0.5" size={18} />
              <div className="text-xs text-red-900 dark:text-red-200 space-y-1">
                <p className="font-bold">Esta ação removerá a conta e todos os dados associados.</p>
                <p className="text-red-700 dark:text-red-300 leading-relaxed">
                  O usuário poderá criar uma nova conta usando o mesmo e-mail posteriormente.
                </p>
              </div>
            </div>

            <div className="p-3 bg-neutral-50 dark:bg-[#282A2C] rounded-xl space-y-2 border border-neutral-100 dark:border-[#313335] text-xs">
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400 dark:text-[#8E918F] font-medium">Nome:</span>
                <span className="font-bold text-neutral-800 dark:text-[#E3E3E3]">{userToDelete.name}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400 dark:text-[#8E918F] font-medium">E-mail:</span>
                <span className="font-mono text-neutral-700 dark:text-[#C4C7C5]">{userToDelete.email}</span>
              </div>
              <div className="flex justify-between items-center py-0.5">
                <span className="text-neutral-400 dark:text-[#8E918F] font-medium">Perfil:</span>
                <span>{getRoleBadge(userToDelete.role)}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2">
              <Button
                variant="ghost"
                onClick={() => setUserToDelete(null)}
                disabled={isDeleting}
              >
                Cancelar
              </Button>
              <Button
                variant="danger"
                onClick={handleDeleteUser}
                isLoading={isDeleting}
                leftIcon={<Trash2 size={15} />}
              >
                Excluir conta
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
