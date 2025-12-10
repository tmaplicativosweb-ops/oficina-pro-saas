export enum UserRole {
  MASTER = 'MASTER', // tmdev
  ADMIN = 'ADMIN',   // Company Owner
  MECHANIC = 'MECHANIC'
}

export enum PlanType {
  DEMO = 'DEMO',
  MONTHLY = 'MONTHLY',
  SEMIANNUAL = 'SEMIANNUAL',
  ANNUAL = 'ANNUAL'
}

export enum CompanyStatus {
  ACTIVE = 'ACTIVE',
  BLOCKED = 'BLOCKED',
  EXPIRED = 'EXPIRED'
}

export enum OSStatus {
  PENDING = 'PENDING',
  IN_PROGRESS = 'IN_PROGRESS',
  WAITING_PARTS = 'WAITING_PARTS',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum ChecklistStatus {
  OK = 'OK',
  DAMAGED = 'DAMAGED',
  MISSING = 'MISSING',
  NA = 'NA'
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export interface ChatMessage {
  id: string;
  companyId: string;
  senderRole: 'MASTER' | 'CLIENT';
  senderName: string;
  text: string;
  createdAt: number;
  read: boolean;
}

export interface Appointment {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  vehicle: string;
  date: number;
  description: string;
  status: AppointmentStatus;
}

export interface ChecklistItem {
  name: string;
  status: ChecklistStatus;
  notes?: string;
}

export interface Checklist {
  id: string;
  osId: string;
  companyId: string;
  fuelLevel: number;
  items: ChecklistItem[];
  notes: string;
  updatedAt: number;
}

export interface Transaction {
  id: string;
  companyId: string;
  description: string;
  amount: number;
  type: TransactionType;
  category: string;
  date: number;
}

export interface TeamMember {
  id: string;
  companyId: string;
  name: string;
  role: string;
  commissionRate: number;
  active: boolean;
}

export interface Company {
  id: string;
  name: string;
  document: string;
  email: string;
  phone: string;
  address?: string;
  warrantyTerms?: string;
  monthlyGoal?: number;
  plan: PlanType;
  status: CompanyStatus;
  createdAt: number;
  expiresAt: number;
}

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  companyId: string | null;
}

export interface Customer {
  id: string;
  companyId: string;
  name: string;
  phone: string;
  vehicleModel: string;
  vehiclePlate: string;
  createdAt: number;
}

export interface Product {
  id: string;
  companyId: string;
  name: string;
  costPrice: number;
  sellPrice: number;
  quantity: number;
}

export interface OSItem {
  productId: string;
  name: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

export interface ServiceOrder {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  vehicle: string;
  description: string;
  status: OSStatus;
  mechanicId?: string;
  mechanicName?: string;
  laborValue: number;
  items: OSItem[];
  totalValue: number;
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}