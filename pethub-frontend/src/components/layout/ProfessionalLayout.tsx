import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import {
  Home,
  Calendar,
  Briefcase,
  ClipboardList,
  Star,
  User,
} from 'lucide-react';
import { SharedBusinessLayout } from './SharedBusinessLayout';
import type { NavItemConfig } from './SharedBusinessLayout';

const navItems: NavItemConfig[] = [
  { path: '/profissional', icon: Home, label: 'Dashboard', end: true },
  { path: '/profissional/agenda', icon: Calendar, label: 'Minha Agenda' },
  { path: '/profissional/prestar-servicos', icon: Briefcase, label: 'Prestar Serviços' },
  { path: '/profissional/ordens', icon: ClipboardList, label: 'Ordens de Serviço' },
  { path: '/profissional/avaliacoes', icon: Star, label: 'Avaliações' },
  { path: '/profissional/perfil', icon: User, label: 'Meu Perfil' },
];

export const ProfessionalLayout = () => {
  const { currentUser, logout } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/auth/login');
  };

  const profProfile = (currentUser as any)?.professionalProfile;
  const isPendingApproval = profProfile?.status === 'PENDING_APPROVAL' || !profProfile?.status;
  const isSuspended = profProfile?.status === 'SUSPENDED';
  const userName = currentUser?.name || 'Profissional';
  const specialty = profProfile?.specialty || 'Médico Veterinário';

  return (
    <SharedBusinessLayout
      businessBadge="Área Profissional"
      homeLink="/profissional"
      navItems={navItems}
      userPhoto={currentUser?.avatar}
      userName={userName}
      userSubtitle={specialty}
      isEstablishment={false}
      isPendingApproval={isPendingApproval}
      isSuspended={isSuspended}
      pendingApprovalMessage="Seu cadastro profissional está em análise. Algumas funcionalidades da agenda estarão disponíveis após a aprovação."
      suspensionMessage="Seu cadastro profissional está temporariamente suspenso"
      suspensionReason={profProfile?.suspensionReason}
      suspendedUntil={profProfile?.suspendedUntil}
      onLogout={handleLogout}
    />
  );
};
