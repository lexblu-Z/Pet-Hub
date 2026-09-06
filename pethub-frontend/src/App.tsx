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
import GoogleAuthCallbackPage from '@/pages/auth/GoogleAuthCallbackPage';
import SelectRolePage from '@/pages/auth/SelectRolePage';

// Tutor Pages
import TutorDashboard from '@/pages/tutor/TutorDashboard';
import MyPetsPage from '@/pages/tutor/MyPetsPage';
import PetProfilePage from '@/pages/tutor/PetProfilePage';
import PetFormPage from '@/pages/tutor/PetFormPage';
import FavoritesPage from '@/pages/tutor/FavoritesPage';
import AppointmentsPage from '@/pages/tutor/AppointmentsPage';
import BookingPage from '@/pages/tutor/BookingPage';
import { ExplorePage, EstablishmentProfilePage as TutorEstablishmentViewPage } from '@/pages/tutor/ExplorePage';
import ShopPage from '@/pages/tutor/ShopPage';
import CashbackPage from '@/pages/tutor/CashbackPage';
import ProfilePage from '@/pages/tutor/ProfilePage';
import ChatPage from '@/pages/tutor/ChatPage';
import PlansPage from '@/pages/tutor/PlansPage';
import NotificationsPage from '@/pages/tutor/NotificationsPage';
import MyPurchasesPage from '@/pages/tutor/MyPurchasesPage';
import PaymentMethodsPage from '@/pages/tutor/PaymentMethodsPage';
import SecurityPage from '@/pages/tutor/SecurityPage';
import PreferencesPage from '@/pages/tutor/PreferencesPage';
import NotificationSettingsPage from '@/pages/tutor/NotificationSettingsPage';

// Establishment Pages
import EstablishmentDashboard from '@/pages/establishment/EstablishmentDashboard';
import EstablishmentProfilePage from '@/pages/establishment/EstablishmentProfilePage';
import EstablishmentServicesPage from '@/pages/establishment/EstablishmentServicesPage';
import EstablishmentProductsPage from '@/pages/establishment/EstablishmentProductsPage';
import EstablishmentOrdersPage from '@/pages/establishment/EstablishmentOrdersPage';
import EstablishmentAppointmentsPage from '@/pages/establishment/EstablishmentAppointmentsPage';
import EstablishmentEmployeesPage from '@/pages/establishment/EstablishmentEmployeesPage';
import EstablishmentSettingsPage from '@/pages/establishment/EstablishmentSettingsPage';

// Professional Pages
import ProfessionalDashboard from '@/pages/professional/ProfessionalDashboard';
import ProfessionalSchedulePage from '@/pages/professional/ProfessionalSchedulePage';
import ProfessionalWorkOrdersPage from '@/pages/professional/ProfessionalWorkOrdersPage';
import ProfessionalReviewsPage from '@/pages/professional/ProfessionalReviewsPage';
import ProfessionalProfilePage from '@/pages/professional/ProfessionalProfilePage';

// Admin Pages
import AdminDashboard from '@/pages/admin/AdminDashboard';
import AdminEstablishmentsPage from '@/pages/admin/AdminEstablishmentsPage';
import AdminProfessionalsPage from '@/pages/admin/AdminProfessionalsPage';
import AdminUsersPage from '@/pages/admin/AdminUsersPage';

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
        <Route path="/welcome" element={<WelcomePage />} />
        <Route path="/auth/login" element={<LoginPage />} />
        <Route path="/auth/register" element={<RegisterPage />} />
        <Route path="/auth/forgot-password" element={<ForgotPasswordPage />} />
        <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
        <Route path="/auth/onboarding" element={<OnboardingPage />} />
        <Route path="/auth/callback" element={<GoogleAuthCallbackPage />} />
        <Route path="/auth/select-role" element={<SelectRolePage />} />

        {/* Tutor Routes */}
        <Route path="/tutor" element={
          <ProtectedRoute allowedRoles={['tutor']}>
            <TutorLayout />
          </ProtectedRoute>
        }>
          <Route index element={<TutorDashboard />} />
          <Route path="pets" element={<MyPetsPage />} />
          <Route path="pets/novo" element={<PetFormPage />} />
          <Route path="pets/:id" element={<PetProfilePage />} />
          <Route path="pets/:id/editar" element={<PetFormPage isEditing />} />
          <Route path="appointments" element={<AppointmentsPage />} />
          <Route path="agendamentos" element={<AppointmentsPage />} />
          <Route path="booking/:id" element={<BookingPage />} />
          <Route path="explore" element={<ExplorePage />} />
          <Route path="explorar" element={<ExplorePage />} />
          <Route path="establishment/:id" element={<TutorEstablishmentViewPage />} />
          <Route path="estabelecimentos/:id" element={<TutorEstablishmentViewPage />} />
          <Route path="shop" element={<ShopPage />} />
          <Route path="loja" element={<ShopPage />} />
          <Route path="cashback" element={<CashbackPage />} />
          <Route path="chat" element={<ChatPage />} />
          <Route path="favorites" element={<FavoritesPage />} />
          <Route path="favoritos" element={<FavoritesPage />} />
          <Route path="profile" element={<ProfilePage />} />
          <Route path="plans" element={<PlansPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="compras" element={<MyPurchasesPage />} />
          <Route path="pagamento" element={<PaymentMethodsPage />} />
          <Route path="seguranca" element={<SecurityPage />} />
          <Route path="preferencias" element={<PreferencesPage />} />
          <Route path="notificacoes-config" element={<NotificationSettingsPage />} />
        </Route>

        {/* Establishment Routes */}
        <Route path="/estabelecimento" element={
          <ProtectedRoute allowedRoles={['estabelecimento']}>
            <EstablishmentLayout />
          </ProtectedRoute>
        }>
          <Route index element={<EstablishmentDashboard />} />
          <Route path="perfil" element={<EstablishmentProfilePage />} />
          <Route path="servicos" element={<EstablishmentServicesPage />} />
          <Route path="produtos" element={<EstablishmentProductsPage />} />
          <Route path="pedidos" element={<EstablishmentOrdersPage />} />
          <Route path="agendamentos" element={<EstablishmentAppointmentsPage />} />
          <Route path="funcionarios" element={<EstablishmentEmployeesPage />} />
          <Route path="configuracoes" element={<EstablishmentSettingsPage />} />
          <Route path="*" element={<Navigate to="/estabelecimento" replace />} />
        </Route>

        {/* Professional Routes */}
        <Route path="/profissional" element={
          <ProtectedRoute allowedRoles={['profissional']}>
            <ProfessionalLayout />
          </ProtectedRoute>
        }>
          <Route index element={<ProfessionalDashboard />} />
          <Route path="agenda" element={<ProfessionalSchedulePage />} />
          <Route path="ordens" element={<ProfessionalWorkOrdersPage />} />
          <Route path="avaliacoes" element={<ProfessionalReviewsPage />} />
          <Route path="perfil" element={<ProfessionalProfilePage />} />
          <Route path="*" element={<Navigate to="/profissional" replace />} />
        </Route>

        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedRoles={['admin']}>
            <AdminLayout />
          </ProtectedRoute>
        }>
          <Route index element={<AdminDashboard />} />
          <Route path="estabelecimentos" element={<AdminEstablishmentsPage />} />
          <Route path="profissionais" element={<AdminProfessionalsPage />} />
          <Route path="usuarios" element={<AdminUsersPage />} />
          <Route path="users" element={<Navigate to="/admin/usuarios" replace />} />
          <Route path="*" element={<Navigate to="/admin" replace />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
