// ============================================
// PetHub - TypeScript Types & Interfaces
// ============================================

// User types
export type UserRole = 'tutor' | 'estabelecimento' | 'profissional' | 'admin';
export type ApprovalStatus = 'PENDING_APPROVAL' | 'ACTIVE' | 'REJECTED';

export interface Address {
  street: string;
  number: string;
  complement?: string;
  neighborhood: string;
  city: string;
  state: string;
  zipCode: string;
  lat?: number;
  lng?: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  phone: string;
  avatar?: string | null;
  defaultAvatar?: string | null;
  role: UserRole;
  hasPassword?: boolean;
  address?: Address | string | null;
  number?: string | null;
  complement?: string | null;
  neighborhood?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  createdAt: string;
}

export interface TutorProfile extends User {
  address?: Address;
  cashbackBalance: number;
  cashbackPending: number;
  favoriteEstablishments: string[];
  favoriteProfessionals: string[];
}

export interface WorkingHours {
  monday?: DayHours;
  tuesday?: DayHours;
  wednesday?: DayHours;
  thursday?: DayHours;
  friday?: DayHours;
  saturday?: DayHours;
  sunday?: DayHours;
}

export interface DayHours {
  open: string;
  close: string;
  isOpen: boolean;
}

export interface EstablishmentProfile extends User {
  businessName: string;
  cnpj: string;
  address: Address;
  category: string[];
  description: string;
  photos: string[];
  coverPhoto: string;
  logo?: string;
  workingHours: WorkingHours;
  rating: number;
  reviewCount: number;
  isApproved: boolean;
  isActive: boolean;
  phone: string;
  whatsapp?: string;
  website?: string;
}

export interface ProfessionalProfile extends User {
  specialty: string[];
  bio: string;
  experience: number; // years
  establishmentId?: string;
  establishmentName?: string;
  rating: number;
  reviewCount: number;
  isAvailable: boolean;
  totalServices: number;
}

export interface AdminProfile extends User {
  permissions: string[];
}

// Pet types
export type PetSpecies = 'dog' | 'cat' | 'bird' | 'rabbit' | 'other';
export type PetSex = 'male' | 'female';

export interface Pet {
  id: string;
  tutorId: string;
  name: string;
  species: string;
  breed?: string;
  gender?: string;
  sex?: PetSex;
  birthDate?: string;
  approximateAge?: string;
  vaccinationStatus?: 'UP_TO_DATE' | 'PENDING' | 'UNKNOWN' | string;
  weight?: number;
  photo?: string;
  microchip?: string;
  notes?: string;
  allergies?: string[];
  medications?: string[];
  isNeutered?: boolean;
}

// Vaccine types
export type VaccineStatus = 'up-to-date' | 'upcoming' | 'overdue';

export interface Vaccine {
  id: string;
  petId: string;
  name: string;
  date: string;
  nextDueDate?: string;
  batch?: string;
  veterinarian?: string;
  establishment?: string;
  notes?: string;
  status: VaccineStatus;
}

// Appointment/Booking types
export type AppointmentStatus =
  | 'pending'
  | 'confirmed'
  | 'in-progress'
  | 'completed'
  | 'cancelled'
  | 'rescheduled';

export type TransportType = 'owner-brings' | 'pickup';

export interface Appointment {
  id: string;
  petId: string;
  tutorId: string;
  petName: string;
  petPhoto: string;
  establishmentId: string;
  establishmentName: string;
  professionalId?: string;
  professionalName?: string;
  serviceId: string;
  serviceName: string;
  serviceCategory: ServiceCategory;
  date: string;
  time: string;
  status: AppointmentStatus;
  transport: TransportType;
  pickupAddress?: Address;
  price: number;
  notes?: string;
  rating?: number;
  review?: string;
  checkinTime?: string;
  checkoutTime?: string;
  beforePhoto?: string;
  afterPhoto?: string;
  createdAt: string;
}

// Service types
export type ServiceCategory =
  | 'banho'
  | 'tosa'
  | 'veterinario'
  | 'adestramento'
  | 'hospedagem'
  | 'creche'
  | 'passeio'
  | 'consulta'
  | 'cirurgia'
  | 'outro';

export interface Service {
  id: string;
  establishmentId: string;
  name: string;
  category: ServiceCategory;
  description: string;
  price: number;
  duration: number; // minutes
  professionals: string[];
  isActive: boolean;
}

// Product types
export interface Product {
  id: string;
  establishmentId: string;
  name: string;
  description: string;
  category: string;
  price: number;
  stock: number;
  photos: string[];
  brand?: string;
  weight?: number;
  isActive: boolean;
}

export interface CartItem {
  product: Product;
  quantity: number;
}

// Financial types
export type PaymentMethod = 'pix' | 'credit-card' | 'debit-card' | 'cash' | 'cashback';

export interface Payment {
  id: string;
  amount: number;
  method: PaymentMethod;
  cashbackUsed?: number;
  cashbackEarned: number;
  date: string;
  status: 'pending' | 'approved' | 'failed' | 'refunded';
  referenceId: string;
  referenceType: 'appointment' | 'product' | 'plan';
}

export interface CashbackTransaction {
  id: string;
  userId: string;
  amount: number;
  type: 'credit' | 'debit';
  description: string;
  date: string;
  expiresAt?: string;
  referenceId: string;
}

// Plan types
export interface PlanService {
  serviceId: string;
  serviceName: string;
  quantity: number;
  usedThisMonth: number;
}

export interface Plan {
  id: string;
  name: string;
  establishmentId: string;
  establishmentName: string;
  price: number;
  billingCycle: 'monthly' | 'quarterly' | 'yearly';
  benefits: string[];
  servicesIncluded: PlanService[];
  isActive: boolean;
  color: string;
  icon: string;
}

export interface UserPlan {
  id: string;
  userId: string;
  planId: string;
  plan: Plan;
  startDate: string;
  nextRenewal: string;
  status: 'active' | 'cancelled' | 'expired';
}

// Review types
export interface Review {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  establishmentId?: string;
  professionalId?: string;
  appointmentId: string;
  rating: number;
  comment: string;
  photos?: string[];
  date: string;
  reply?: string;
}

// Notification types
export type NotificationType =
  | 'appointment-confirmed'
  | 'appointment-reminder'
  | 'appointment-completed'
  | 'vaccine-reminder'
  | 'message'
  | 'payment-approved'
  | 'cashback-received'
  | 'plan-renewal';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  isRead: boolean;
  date: string;
  data?: Record<string, unknown>;
  actionUrl?: string;
}

// Message/Chat types
export interface Message {
  id: string;
  conversationId: string;
  senderId: string;
  senderName: string;
  content: string;
  type: 'text' | 'image' | 'file';
  timestamp: string;
  isRead: boolean;
}

export interface Conversation {
  id: string;
  participantId: string;
  participantName: string;
  participantAvatar?: string;
  participantType: 'establishment' | 'professional';
  lastMessage: Message;
  unreadCount: number;
  updatedAt: string;
}

// Order/Service Order types
export type OrderStatus = 'pending' | 'in-progress' | 'completed';

export interface ServiceOrder {
  id: string;
  appointmentId: string;
  petId: string;
  petName: string;
  petPhoto: string;
  tutorId: string;
  tutorName: string;
  tutorPhone: string;
  professionalId: string;
  professionalName: string;
  serviceId: string;
  serviceName: string;
  establishmentId: string;
  date: string;
  time: string;
  status: OrderStatus;
  petAlerts: string[];
  products: CartItem[];
  notes?: string;
  transport: TransportType;
  pickupAddress?: Address;
}

// Report types
export interface MonthlyData {
  month: string;
  value: number;
}

export interface FinancialReport {
  period: string;
  grossRevenue: number;
  discounts: number;
  cashbackUsed: number;
  netRevenue: number;
  byPaymentMethod: Partial<Record<PaymentMethod, number>>;
  byService: Array<{ service: string; revenue: number }>;
  monthlyData: MonthlyData[];
}

export interface AppointmentReport {
  period: string;
  total: number;
  byStatus: Partial<Record<AppointmentStatus, number>>;
  byService: Array<{ service: string; count: number }>;
  byProfessional: Array<{
    professional: string;
    count: number;
    rating: number;
  }>;
  monthlyData: MonthlyData[];
}

// Invoice type
export interface InvoiceItem {
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface Invoice {
  id: string;
  number: string;
  establishmentId: string;
  tutorId?: string;
  tutorName?: string;
  date: string;
  dueDate: string;
  items: InvoiceItem[];
  total: number;
  status: 'pending' | 'paid' | 'cancelled';
  pdfUrl?: string;
}

// Establishment approval (admin)
export interface EstablishmentApproval {
  id: string;
  establishment: EstablishmentProfile;
  submittedAt: string;
  status: 'pending' | 'approved' | 'rejected';
  rejectionReason?: string;
  reviewedAt?: string;
  reviewedBy?: string;
  documents: Array<{ name: string; url: string; type: string }>;
}
