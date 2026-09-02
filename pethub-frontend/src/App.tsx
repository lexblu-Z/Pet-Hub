import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';

// Layouts
import { TutorLayout } from '@/components/layout/TutorLayout';
import { EstablishmentLayout } from '@/components/layout/EstablishmentLayout';
import { ProfessionalLayout, AdminLayout } from '@/components/layout/OtherLayouts';

// Public Pages
import LandingPage from '@/pages/LandingPage';
import WelcomePage from '@/pages/auth/WelcomePage';
import LoginPage from '@/pages/auth/LoginPage';
import RegisterPage from '@/pages/auth/RegisterPage';
import { ForgotPasswordPage, ResetPasswordPage } from '@/pages/auth/ForgotPasswordPage';
import OnboardingPage from '@/pages/auth/OnboardingPage';

// Tutor Pages
import TutorDashboard from '@/pages/tutor/TutorDashboard';
import MyPetsPage from '@/pages/tutor/MyPetsPage';
import PetProfilePage from '@/pages/tutor/PetProfilePage';
import AppointmentsPage from '@/pages/tutor/AppointmentsPage';
import BookingPage from '@/pages/tutor/BookingPage';
import { ExplorePage, EstablishmentProfilePage } from '@/pages/tutor/ExplorePage';
import ShopPage from '@/pages/tutor/ShopPage';
import CashbackPage from '@/pages/tutor/CashbackPage';
import ProfilePage from '@/pages/tutor/ProfilePage';
import ChatPage from '@/pages/tutor/ChatPage';
import PlansPage from '@/pages/tutor/PlansPage';
import NotificationsPage from '@/pages/tutor/NotificationsPage';

// Establishment Pages
import EstablishmentDashboard from '@/pages/establishment/EstablishmentDashboard';

// Professional Pages
import ProfessionalDashboard from '@/pages/professional/ProfessionalDashboard';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';

function ProtectedRoute({ children, allowedRoles }: { children: React.ReactNode, allowedRoles?: string[] }) {
  const { isAuthenticated, currentRole } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/auth/login" replace />;
  }

  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    return <Navigate to={`/${currentRole}`} replace />;
  }

  return <>{children}</>;
}

export default function App() {
  const checkAuth = useAuthStore((state) => state.checkAuth);

  React.useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return (
    <BrowserRouter>
      <Routes>
        {/* Public Routes */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth/welcome" element={<WelcomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/onboarding" element={<OnboardingPage />} />

        {/* Tutor Routes */}
        <Route path="/tutor" element={
          <ProtectedRoute allowedRoles={['tutor']}>
            <TutorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TutorDashboard />} />
          <Route path="pets" element={<MyPetsPage />} />
          <Route path="pets/novo" element={<div className="p-8">Formulário de novo pet</div>} />
          <Route path="pets/:id" element={<PetProfilePage />} />
          <Route path="pets/:id/editar" element={<div className="p-8">Formulário de edição</div>} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="appointments/:id" element={<div className="p-8">Detalhes do agendamento</div>} />
          <Route path="booking" element={<BookingPage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="estabelecimentos/:id" element={<EstablishmentProfilePage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="cashback" element={<CashbackPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
        </Route>

        {/* Establishment Routes */}
        <Route path="/estabelecimento" element={
          <ProtectedRoute allowedRoles={['estabelecimento']}>
            <EstablishmentLayout />
          </ProtectedRoute>
        }>
          <Route index element={<EstablishmentDashboard />} />
          <Route path="*" element={<div className="p-6 text-neutral-500">Página em construção...</div>} />
        </Route>

        {/* Professional Routes */}
        <Route path="/profissional" element={
          <ProtectedRoute allowedRoles={['profissional']}>
            <ProfessionalLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ProfessionalDashboard />} />
          <Route path="*" element={<div className="p-6 text-neutral-500">Página em construção...</div>} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="*" element={<div className="p-6 text-neutral-500">Página em construção...</div>} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
