
import { initializeApp } from "firebase/app";
import { 
  getAuth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile
} from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy,
  onSnapshot
} from "firebase/firestore";
import { 
  Company, 
  User, 
  UserRole, 
  PlanType, 
  CompanyStatus, 
  Customer, 
  ServiceOrder, 
  OSStatus, 
  Product, 
  Transaction, 
  TeamMember, 
  Checklist, 
  Appointment,
  ChatMessage
} from './types';

const firebaseConfig = {
  apiKey: "AIzaSyDDm2keXQhi5wH3BVCdgQiMFnu6DTrUzvk",
  authDomain: "oficina-pro-saas.firebaseapp.com",
  projectId: "oficina-pro-saas",
  storageBucket: "oficina-pro-saas.firebasestorage.app",
  messagingSenderId: "233156915440",
  appId: "1:233156915440:web:127b7ef64bce7d82291235"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const mapDoc = <T>(doc: any): T => {
  return { id: doc.id, ...doc.data() } as T;
};

export const authService = {
  login: async (email: string, pass: string): Promise<{ user: User, company: Company | null }> => {
    const userCred = await signInWithEmailAndPassword(auth, email, pass);
    const fbUser = userCred.user;
    const userDoc = await getDoc(doc(db, "users", fbUser.uid));
    
    if (!userDoc.exists()) throw new Error("Usuário não encontrado.");
    
    const userData = userDoc.data() as User;
    const cleanUser: User = { ...userData, id: fbUser.uid };

    let company: Company | null = null;
    if (cleanUser.companyId) {
      const companyDoc = await getDoc(doc(db, "companies", cleanUser.companyId));
      if (companyDoc.exists()) {
        company = mapDoc<Company>(companyDoc);
        if (company.status === CompanyStatus.BLOCKED) throw new Error("Acesso bloqueado pelo administrador.");
      }
    }
    return { user: cleanUser, company };
  },

  registerCompany: async (companyName: string, documentNo: string, ownerName: string, email: string, pass: string) => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const fbUser = userCred.user;
    await updateProfile(fbUser, { displayName: ownerName });

    const newCompany: Omit<Company, 'id'> = {
      name: companyName, document: documentNo, email, phone: '', address: '',
      warrantyTerms: 'Garantia de 90 dias.', monthlyGoal: 10000,
      plan: PlanType.DEMO, status: CompanyStatus.ACTIVE,
      createdAt: Date.now(), expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };

    const companyRef = await addDoc(collection(db, "companies"), newCompany);
    const newUser: User = { id: fbUser.uid, name: ownerName, email, role: UserRole.ADMIN, companyId: companyRef.id };
    await setDoc(doc(db, "users", fbUser.uid), newUser);
    return { user: newUser, company: { id: companyRef.id, ...newCompany } };
  },

  impersonate: async (companyId: string): Promise<{ user: User, company: Company }> => {
    const companyDoc = await getDoc(doc(db, "companies", companyId));
    if (!companyDoc.exists()) throw new Error("Empresa não encontrada.");
    const company = mapDoc<Company>(companyDoc);
    const q = query(collection(db, "users"), where("companyId", "==", companyId), where("role", "==", UserRole.ADMIN));
    const querySnapshot = await getDocs(q);
    if (querySnapshot.empty) throw new Error("Admin não encontrado.");
    const adminUser = mapDoc<User>(querySnapshot.docs[0]);
    return { user: adminUser, company };
  }
};

export const dbService = {
  getCompanies: async (): Promise<Company[]> => {
    const q = query(collection(db, "companies"), orderBy("createdAt", "desc"));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Company>(d));
  },

  updateCompanyStatus: async (companyId: string, status: CompanyStatus) => {
    await updateDoc(doc(db, "companies", companyId), { status });
  },

  extendLicense: async (companyId: string, plan: PlanType, daysToAdd: number) => {
    const ref = doc(db, "companies", companyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;
    const currentData = snap.data() as Company;
    
    const now = Date.now();
    const baseDate = (currentData.expiresAt && currentData.expiresAt > now) ? currentData.expiresAt : now;
    const newExpiry = baseDate + (daysToAdd * 24 * 60 * 60 * 1000);
    
    await updateDoc(ref, { 
        expiresAt: newExpiry, 
        plan, 
        status: CompanyStatus.ACTIVE 
    });
  },

  updateCompany: async (companyId: string, data: Partial<Company>): Promise<Company> => {
     const ref = doc(db, "companies", companyId);
     await updateDoc(ref, data);
     const snap = await getDoc(ref);
     return mapDoc<Company>(snap);
  },

  // Suporte Chat
  sendChatMessage: async (msg: Omit<ChatMessage, 'id'>) => {
    const ref = await addDoc(collection(db, "support_messages"), msg);
    return { id: ref.id, ...msg };
  },

  getChatMessages: async (companyId: string): Promise<ChatMessage[]> => {
    // Para evitar erro de índice composto, removemos o orderBy da query e fazemos no cliente
    const q = query(collection(db, "support_messages"), where("companyId", "==", companyId));
    const snap = await getDocs(q);
    const messages = snap.docs.map(d => mapDoc<ChatMessage>(d));
    // Ordenação no cliente (Crescente)
    return messages.sort((a, b) => a.createdAt - b.createdAt);
  },

  // Negócio
  getCustomers: async (companyId: string) => {
    const q = query(collection(db, "customers"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Customer>(d));
  },
  createCustomer: async (customer: Omit<Customer, 'id' | 'createdAt'>) => {
    const data = { ...customer, createdAt: Date.now() };
    const ref = await addDoc(collection(db, "customers"), data);
    return { id: ref.id, ...data };
  },
  updateCustomer: async (id: string, data: Partial<Customer>) => {
    await updateDoc(doc(db, "customers", id), data);
  },
  getProducts: async (companyId: string) => {
    const q = query(collection(db, "products"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Product>(d));
  },
  createProduct: async (product: Omit<Product, 'id'>) => {
    const ref = await addDoc(collection(db, "products"), product);
    return { id: ref.id, ...product };
  },
  updateProduct: async (id: string, data: Partial<Product>) => {
    await updateDoc(doc(db, "products", id), data);
  },
  deleteProduct: async (id: string) => {
    await deleteDoc(doc(db, "products", id));
  },
  getServiceOrders: async (companyId: string) => {
    const q = query(collection(db, "service_orders"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<ServiceOrder>(d));
  },
  createServiceOrder: async (os: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>) => {
    const data = { ...os, createdAt: Date.now(), updatedAt: Date.now() };
    const ref = await addDoc(collection(db, "service_orders"), data);
    return { id: ref.id, ...data };
  },
  updateServiceOrder: async (id: string, updates: Partial<ServiceOrder>) => {
    await updateDoc(doc(db, "service_orders", id), { ...updates, updatedAt: Date.now() });
  },
  getTransactions: async (companyId: string) => {
    // Para evitar erro de índice composto, removemos o orderBy da query e fazemos no cliente
    const q = query(collection(db, "transactions"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const transactions = snapshot.docs.map(d => mapDoc<Transaction>(d));
    // Ordenação no cliente (Decrescente por data)
    return transactions.sort((a, b) => b.date - a.date);
  },
  createTransaction: async (data: Omit<Transaction, 'id'>) => {
    const ref = await addDoc(collection(db, "transactions"), data);
    return { id: ref.id, ...data };
  },
  deleteTransaction: async (id: string) => {
    await deleteDoc(doc(db, "transactions", id));
  },
  getTeamMembers: async (companyId: string) => {
    const q = query(collection(db, "team"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<TeamMember>(d));
  },
  saveTeamMember: async (data: Omit<TeamMember, 'id'>) => {
    const ref = await addDoc(collection(db, "team"), data);
    return { id: ref.id, ...data };
  },
  deleteTeamMember: async (id: string) => {
    await deleteDoc(doc(db, "team", id));
  },
  getAppointments: async (companyId: string) => {
    const q = query(collection(db, "appointments"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Appointment>(d));
  },
  createAppointment: async (data: Omit<Appointment, 'id'>) => {
    const ref = await addDoc(collection(db, "appointments"), data);
    return { id: ref.id, ...data };
  },
  updateAppointmentStatus: async (id: string, status: any) => {
    await updateDoc(doc(db, "appointments", id), { status });
  },
  updateAppointment: async (id: string, data: Partial<Appointment>) => {
    await updateDoc(doc(db, "appointments", id), data);
  },
  deleteAppointment: async (id: string) => {
    await deleteDoc(doc(db, "appointments", id));
  },
  getChecklist: async (osId: string) => {
    const q = query(collection(db, "checklists"), where("osId", "==", osId));
    const snapshot = await getDocs(q);
    return snapshot.empty ? null : mapDoc<Checklist>(snapshot.docs[0]);
  },
  saveChecklist: async (data: Omit<Checklist, 'id' | 'updatedAt'>) => {
    const q = query(collection(db, "checklists"), where("osId", "==", data.osId));
    const snapshot = await getDocs(q);
    if (!snapshot.empty) {
      await updateDoc(doc(db, "checklists", snapshot.docs[0].id), { ...data, updatedAt: Date.now() });
      return { id: snapshot.docs[0].id, ...data, updatedAt: Date.now() } as Checklist;
    }
    const ref = await addDoc(collection(db, "checklists"), { ...data, updatedAt: Date.now() });
    return { id: ref.id, ...data, updatedAt: Date.now() } as Checklist;
  },
  getFullBackup: async (companyId: string) => {
    const collections = ["customers", "products", "service_orders", "transactions", "team", "appointments", "checklists"];
    const backup: any = {};
    for (const col of collections) {
      const q = query(collection(db, col), where("companyId", "==", companyId));
      const snap = await getDocs(q);
      backup[col] = snap.docs.map(d => mapDoc(d));
    }
    return backup;
  },
  clearCompanyData: async (companyId: string, keys: string[]) => {
    const keyMap: Record<string, string> = { customers: "customers", products: "products", os: "service_orders", financial: "transactions", team: "team", agenda: "appointments" };
    for (const key of keys) {
      const col = keyMap[key];
      if (!col) continue;
      const q = query(collection(db, col), where("companyId", "==", companyId));
      const snap = await getDocs(q);
      await Promise.all(snap.docs.map(d => deleteDoc(doc(db, col, d.id))));
    }
  },
  getStats: async (companyId: string) => {
    const osSnap = await getDocs(query(collection(db, "service_orders"), where("companyId", "==", companyId)));
    const custSnap = await getDocs(query(collection(db, "customers"), where("companyId", "==", companyId)));
    const teamSnap = await getDocs(query(collection(db, "team"), where("companyId", "==", companyId)));
    const allOS = osSnap.docs.map(d => mapDoc<ServiceOrder>(d));
    const allCust = custSnap.docs.map(d => mapDoc<Customer>(d));
    const team = teamSnap.docs.map(d => mapDoc<TeamMember>(d));
    const completed = allOS.filter(o => o.status === OSStatus.COMPLETED);
    const revenue = completed.reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0);
    const avgTicket = completed.length > 0 ? revenue / completed.length : 0;
    const history = [ {label: 'Mensal', value: revenue} ];
    let totalLabor = completed.reduce((acc, o) => acc + (Number(o.laborValue) || 0), 0);
    let totalParts = revenue - totalLabor;
    const ranking = team.map(t => ({ name: t.name, value: allOS.filter(o => o.status === OSStatus.COMPLETED && o.mechanicId === t.id).reduce((acc, o) => acc + o.totalValue, 0) })).sort((a,b) => b.value - a.value);
    return { summary: { totalCustomers: allCust.length, pendingOS: allOS.filter(o => o.status !== OSStatus.COMPLETED).length, completedOS: completed.length, revenue, avgTicket }, history, split: { labor: totalLabor, parts: totalParts }, ranking };
  }
};
