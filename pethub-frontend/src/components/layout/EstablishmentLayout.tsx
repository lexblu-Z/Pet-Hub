import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { api } from '@/services/api';
import {
  Home,
  Building2,
  Wrench,
  Package,
  ClipboardList,
  Calendar,
  Users,
  BarChart3,
  MessageSquare,
  Settings,
} from 'lucide-react';
import { SharedBusinessLayout } from './SharedBusinessLayout';
import type { NavItemConfig } from './SharedBusinessLayout';

export const EstablishmentLayout = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();
  const [unreadMessages, setUnreadMessages] = useState<number>(0);

  useEffect(() => {
    const fetchUnreadCount = async () => {
      try {
        const res = await api.get('/messages/unread-count');
        setUnreadMessages(res.data?.unreadCount || 0);
      } catch {
        // Silently ignore if not logged in or backend unavailable
      }
    };

    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const establishmentProfile = (currentUser as any)?.establishmentProfile;
  const isPendingApproval = establishmentProfile?.status === 'PENDING_APPROVAL';
  const isSuspended = establishmentProfile?.status === 'SUSPENDED';
  const businessName = establishmentProfile?.businessName || currentUser?.name || 'Estabelecimento';
  const establishmentPhoto = establishmentProfile?.photos?.[0] || currentUser?.avatar;

  const navItems: NavItemConfig[] = [
    { path: '/estabelecimento', icon: Home, label: 'Dashboard', end: true },
    { path: '/estabelecimento/agendamentos', icon: Calendar, label: 'Agendamentos' },
    { path: '/estabelecimento/pedidos', icon: ClipboardList, label: 'Pedidos' },
    { path: '/estabelecimento/servicos', icon: Wrench, label: 'Serviços' },
    { path: '/estabelecimento/produtos', icon: Package, label: 'Produtos' },
    { path: '/estabelecimento/funcionarios', icon: Users, label: 'Funcionários' },
    { path: '/estabelecimento/relatorios', icon: BarChart3, label: 'Relatórios' },
    {
      path: '/estabelecimento/mensagens',
      icon: MessageSquare,
      label: 'Mensagens',
      badge: unreadMessages > 0 ? unreadMessages : undefined,
    },
    { path: '/estabelecimento/perfil', icon: Building2, label: 'Meu Estabelecimento' },
    { path: '/estabelecimento/configuracoes', icon: Settings, label: 'Configurações' },
  ];

  return (
    <SharedBusinessLayout
      businessBadge="Área do Estabelecimento"
      homeLink="/estabelecimento"
      navItems={navItems}
      userPhoto={establishmentPhoto}
      userName={businessName}
      userSubtitle={currentUser?.email}
      isEstablishment={true}
      isPendingApproval={isPendingApproval}
      isSuspended={isSuspended}
      pendingApprovalMessage="Seu estabelecimento está em análise. Algumas funcionalidades estarão disponíveis após a aprovação."
      suspensionMessage="Seu estabelecimento está temporariamente suspenso"
      suspensionReason={establishmentProfile?.suspensionReason}
      suspendedUntil={establishmentProfile?.suspendedUntil}
      onLogout={handleLogout}
    />
  );
};
