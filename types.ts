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
  WAITING_PARTS = 'WAITING_PARTS', // Adicionado para Kanban
  COMPLETED = 'COMPLETED',
  CANCELED = 'CANCELED'
}

export enum TransactionType {
  INCOME = 'INCOME',
  EXPENSE = 'EXPENSE'
}

export enum ChecklistStatus {
  OK = 'OK',
  DAMAGED = 'DAMAGED', // Avariado
  MISSING = 'MISSING', // Ausente
  NA = 'NA' // Não se aplica
}

export enum AppointmentStatus {
  SCHEDULED = 'SCHEDULED',
  CONFIRMED = 'CONFIRMED',
  COMPLETED = 'COMPLETED', // Virou OS
  CANCELED = 'CANCELED'
}

export interface Appointment {
  id: string;
  companyId: string;
  customerId: string;
  customerName: string;
  vehicle: string;
  date: number; // Timestamp
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
  fuelLevel: number; // 0 to 4 (0, 1/4, 1/2, 3/4, Full)
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
  category: string; // Ex: Aluguel, Peças, Luz, Venda Avulsa
  date: number;
}

export interface TeamMember {
  id: string;
  companyId: string;
  name: string;
  role: string; // Ex: Mecânico, Eletricista, Ajudante
  commissionRate: number; // Porcentagem (0-100)
  active: boolean;
}

export interface Company {
  id: string;
  name: string;
  document: string; // CNPJ
  email: string;
  phone: string;
  address?: string; // Novo
  warrantyTerms?: string; // Novo
  monthlyGoal?: number; // Novo
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
  companyId: string | null; // Null for MASTER
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
  mechanicId?: string; // Novo: ID do mecânico responsável
  mechanicName?: string; // Novo: Nome para facilitar exibição
  laborValue: number; // Valor da Mao de Obra
  items: OSItem[];    // Lista de pecas
  totalValue: number; // Soma total
  createdAt: number;
  updatedAt: number;
}

export interface AuthState {
  user: User | null;
  company: Company | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}