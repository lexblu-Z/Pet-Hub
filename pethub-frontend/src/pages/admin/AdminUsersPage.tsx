import React, { useState, useEffect } from 'react';
import { Search, User, Mail, Phone, Calendar, Shield, Eye, Building2, Stethoscope, PawPrint } from 'lucide-react';
import { Input, Button, Badge, Modal, Avatar } from '@/components/ui';
import { api } from '@/services/api';
import { useToast } from '@/store/toastStore';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('ALL');
  const [selectedUser, setSelectedUser] = useState<any>(null);

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

  const filtered = users.filter((u) => {
    const q = search.toLowerCase().trim();
    const matchesSearch = !q || u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q) || (u.phone && u.phone.includes(q));
    const matchesRole = roleFilter === 'ALL' || u.role === roleFilter;
    return matchesSearch && matchesRole;
  });

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'ADMIN':
        return <Badge variant="brand">🛡️ Admin</Badge>;
      case 'ESTABLISHMENT':
        return <Badge variant="warning">🏬 Estabelecimento</Badge>;
      case 'PROFESSIONAL':
        return <Badge variant="info">👨‍⚕️ Profissional</Badge>;
      case 'TUTOR':
      default:
        return <Badge variant="success">🐾 Tutor</Badge>;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Usuários da Plataforma</h1>
          <p className="text-neutral-500 text-sm mt-0.5">Visualize e gerencie todos os tutores, estabelecimentos e administradores</p>
        </div>
        <div className="flex gap-2 text-xs font-semibold">
          <span className="px-3 py-1.5 bg-neutral-100 rounded-xl text-neutral-700">
            Total: {users.length} usuários
          </span>
        </div>
      </div>

      {/* Filters & Search */}
      <div className="bg-white rounded-2xl border border-neutral-100 p-4 shadow-sm flex flex-col md:flex-row gap-4 justify-between items-stretch md:items-center">
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
            { id: 'TUTOR', label: 'Tutores 🐾' },
            { id: 'ESTABLISHMENT', label: 'Estabelecimentos 🏬' },
            { id: 'PROFESSIONAL', label: 'Profissionais 👨‍⚕️' },
            { id: 'ADMIN', label: 'Admins 🛡️' },
          ].map((r) => (
            <button
              key={r.id}
              onClick={() => setRoleFilter(r.id)}
              className={`px-3.5 py-2 rounded-xl transition-all ${
                roleFilter === r.id
                  ? 'bg-neutral-900 text-white shadow-xs'
                  : 'bg-neutral-100 text-neutral-600 hover:bg-neutral-200'
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-2xl border border-neutral-100 shadow-sm overflow-hidden">
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
                <tr className="border-b border-neutral-100 bg-neutral-50/50 text-neutral-400 text-[11px] font-bold uppercase tracking-wider">
                  <th className="py-3.5 px-4">Usuário</th>
                  <th className="py-3.5 px-4">Tipo de Conta</th>
                  <th className="py-3.5 px-4">Contato</th>
                  <th className="py-3.5 px-4">Cadastro</th>
                  <th className="py-3.5 px-4 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-neutral-100">
                {filtered.map((user) => (
                  <tr key={user.id} className="hover:bg-neutral-50/60 transition-colors">
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
                          <div className="font-bold text-neutral-900">{user.name}</div>
                          <div className="text-xs text-neutral-400">{user.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      {getRoleBadge(user.role)}
                    </td>
                    <td className="py-4 px-4 text-neutral-600 text-xs">
                      {user.phone || 'Sem telefone'}
                    </td>
                    <td className="py-4 px-4 text-neutral-500 text-xs">
                      {new Date(user.createdAt).toLocaleDateString('pt-BR')}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => setSelectedUser(user)}
                        className="px-3 py-1.5 bg-neutral-100 hover:bg-neutral-200 text-neutral-700 text-xs font-semibold rounded-lg transition-colors inline-flex items-center gap-1"
                      >
                        <Eye size={14} /> Detalhes
                      </button>
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
            <div className="flex items-center gap-3 p-3 bg-neutral-50 rounded-2xl">
              <Avatar
                src={selectedUser.establishmentProfile?.photos?.[0] || selectedUser.avatar}
                name={selectedUser.name}
                size="lg"
                role={selectedUser.role}
                isEstablishment={selectedUser.role === 'ESTABLISHMENT'}
                entityType={selectedUser.role === 'PROFESSIONAL' ? 'professional' : selectedUser.role === 'ESTABLISHMENT' ? 'establishment' : 'tutor'}
              />
              <div>
                <p className="font-bold text-base text-neutral-900">{selectedUser.name}</p>
                <div className="mt-1">{getRoleBadge(selectedUser.role)}</div>
              </div>
            </div>

            <div className="space-y-2 border border-neutral-100 rounded-xl p-3">
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500 text-xs">E-mail:</span>
                <span className="font-medium text-neutral-900 text-xs">{selectedUser.email}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500 text-xs">Telefone:</span>
                <span className="font-medium text-neutral-900 text-xs">{selectedUser.phone || 'Não informado'}</span>
              </div>
              <div className="flex justify-between py-1 border-b border-neutral-50">
                <span className="text-neutral-500 text-xs">Criado em:</span>
                <span className="font-medium text-neutral-900 text-xs">{new Date(selectedUser.createdAt).toLocaleString('pt-BR')}</span>
              </div>
              {selectedUser._count?.pets !== undefined && (
                <div className="flex justify-between py-1">
                  <span className="text-neutral-500 text-xs">Pets cadastrados:</span>
                  <span className="font-bold text-orange-600 text-xs">{selectedUser._count.pets}</span>
                </div>
              )}
            </div>

            {selectedUser.establishmentProfile && (
              <div className="p-3 bg-amber-50/60 border border-amber-200/60 rounded-xl space-y-1">
                <p className="text-xs font-bold text-amber-900">Perfil de Estabelecimento</p>
                <p className="text-xs text-amber-800 font-medium">Nome: {selectedUser.establishmentProfile.businessName || selectedUser.name}</p>
                <p className="text-xs text-amber-800">Status: {selectedUser.establishmentProfile.status}</p>
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
    </div>
  );
}
