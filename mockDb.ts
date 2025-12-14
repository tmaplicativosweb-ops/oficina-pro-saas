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
  onSnapshot,
  getCountFromServer,
  getAggregateFromServer,
  sum
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
} from '../types';

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

    const userDocRef = doc(db, "users", fbUser.uid);
    const userDoc = await getDoc(userDocRef);

    if (!userDoc.exists()) {
      throw new Error("Usuário não encontrado no banco de dados.");
    }

    const userData = userDoc.data() as User;
    const cleanUser: User = { ...userData, id: fbUser.uid };

    let company: Company | null = null;
    if (cleanUser.companyId) {
      const companyDocRef = doc(db, "companies", cleanUser.companyId);
      const companyDoc = await getDoc(companyDocRef);

      if (companyDoc.exists()) {
        company = mapDoc<Company>(companyDoc);
        if (company.status === CompanyStatus.BLOCKED) {
          throw new Error("Acesso da empresa bloqueado. Contate o suporte.");
        }
      }
    }

    return { user: cleanUser, company };
  },

  registerCompany: async (companyName: string, documentNo: string, ownerName: string, email: string, pass: string) => {
    const userCred = await createUserWithEmailAndPassword(auth, email, pass);
    const fbUser = userCred.user;

    await updateProfile(fbUser, { displayName: ownerName });

    const newCompany: Omit<Company, 'id'> = {
      name: companyName,
      document: documentNo,
      email,
      phone: '',
      address: '',
      warrantyTerms: 'Garantia de 90 dias para peças e serviços.',
      monthlyGoal: 10000,
      plan: PlanType.DEMO,
      status: CompanyStatus.ACTIVE,
      createdAt: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000)
    };

    const companyRef = await addDoc(collection(db, "companies"), newCompany);
    const companyId = companyRef.id;

    const newUser: User = {
      id: fbUser.uid,
      name: ownerName,
      email,
      role: UserRole.ADMIN,
      companyId: companyId
    };

    await setDoc(doc(db, "users", fbUser.uid), newUser);

    return { user: newUser, company: { id: companyId, ...newCompany } };
  },

  impersonate: async (companyId: string): Promise<{ user: User, company: Company }> => {
    const companyDoc = await getDoc(doc(db, "companies", companyId));
    if (!companyDoc.exists()) throw new Error("Empresa não encontrada.");
    const company = mapDoc<Company>(companyDoc);

    const q = query(collection(db, "users"), where("companyId", "==", companyId), where("role", "==", UserRole.ADMIN));
    const querySnapshot = await getDocs(q);

    if (querySnapshot.empty) throw new Error("Administrador não encontrado para esta empresa.");

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
    const ref = doc(db, "companies", companyId);
    await updateDoc(ref, { status });
  },

  extendLicense: async (companyId: string, plan: PlanType, daysToAdd: number) => {
    const ref = doc(db, "companies", companyId);
    const snap = await getDoc(ref);
    if (!snap.exists()) return;

    const currentData = snap.data() as Company;
    const currentExpiry = currentData.expiresAt > Date.now() ? currentData.expiresAt : Date.now();

    await updateDoc(ref, {
      expiresAt: currentExpiry + (daysToAdd * 24 * 60 * 60 * 1000),
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

  getCustomers: async (companyId: string): Promise<Customer[]> => {
    const q = query(collection(db, "customers"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Customer>(d));
  },

  createCustomer: async (customer: Omit<Customer, 'id' | 'createdAt'>): Promise<Customer> => {
    const data = { ...customer, createdAt: Date.now() };
    const ref = await addDoc(collection(db, "customers"), data);
    return { id: ref.id, ...data };
  },

  updateCustomer: async (id: string, data: Partial<Customer>): Promise<void> => {
    await updateDoc(doc(db, "customers", id), data);
  },

  getProducts: async (companyId: string): Promise<Product[]> => {
    const q = query(collection(db, "products"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Product>(d));
  },

  createProduct: async (product: Omit<Product, 'id'>): Promise<Product> => {
    const ref = await addDoc(collection(db, "products"), product);
    return { id: ref.id, ...product };
  },

  updateProduct: async (id: string, data: Partial<Product>): Promise<void> => {
    await updateDoc(doc(db, "products", id), data);
  },

  deleteProduct: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "products", id));
  },

  getServiceOrders: async (companyId: string): Promise<ServiceOrder[]> => {
    const q = query(collection(db, "service_orders"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<ServiceOrder>(d));
  },

  createServiceOrder: async (os: Omit<ServiceOrder, 'id' | 'createdAt' | 'updatedAt'>): Promise<ServiceOrder> => {
    if (os.items && os.items.length > 0) {
      for (const item of os.items) {
        const prodRef = doc(db, "products", item.productId);
        const prodSnap = await getDoc(prodRef);
        if (prodSnap.exists()) {
          const currentQty = prodSnap.data().quantity || 0;
          await updateDoc(prodRef, { quantity: Math.max(0, currentQty - item.quantity) });
        }
      }
    }

    const data = {
      ...os,
      createdAt: Date.now(),
      updatedAt: Date.now()
    };
    const ref = await addDoc(collection(db, "service_orders"), data);
    return { id: ref.id, ...data };
  },

  updateServiceOrder: async (id: string, updates: Partial<ServiceOrder>): Promise<void> => {
    await updateDoc(doc(db, "service_orders", id), { ...updates, updatedAt: Date.now() });
  },

  getTransactions: async (companyId: string): Promise<Transaction[]> => {
    const q = query(collection(db, "transactions"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    const list = snapshot.docs.map(d => mapDoc<Transaction>(d));
    return list.sort((a, b) => b.date - a.date);
  },

  createTransaction: async (data: Omit<Transaction, 'id'>): Promise<Transaction> => {
    const ref = await addDoc(collection(db, "transactions"), data);
    return { id: ref.id, ...data };
  },

  deleteTransaction: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "transactions", id));
  },

  getTeamMembers: async (companyId: string): Promise<TeamMember[]> => {
    const q = query(collection(db, "team"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<TeamMember>(d));
  },

  saveTeamMember: async (data: Omit<TeamMember, 'id'>): Promise<TeamMember> => {
    const ref = await addDoc(collection(db, "team"), data);
    return { id: ref.id, ...data };
  },

  deleteTeamMember: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "team", id));
  },

  getChecklist: async (osId: string): Promise<Checklist | null> => {
    const q = query(collection(db, "checklists"), where("osId", "==", osId));
    const snapshot = await getDocs(q);
    if (snapshot.empty) return null;
    return mapDoc<Checklist>(snapshot.docs[0]);
  },

  saveChecklist: async (data: Omit<Checklist, 'id' | 'updatedAt'>): Promise<Checklist> => {
    const q = query(collection(db, "checklists"), where("osId", "==", data.osId));
    const snapshot = await getDocs(q);

    if (!snapshot.empty) {
      const existingId = snapshot.docs[0].id;
      const updateData = { ...data, updatedAt: Date.now() };
      await updateDoc(doc(db, "checklists", existingId), updateData);
      return { id: existingId, ...updateData };
    } else {
      const newData = { ...data, updatedAt: Date.now() };
      const ref = await addDoc(collection(db, "checklists"), newData);
      return { id: ref.id, ...newData };
    }
  },

  getAppointments: async (companyId: string): Promise<Appointment[]> => {
    const q = query(collection(db, "appointments"), where("companyId", "==", companyId));
    const snapshot = await getDocs(q);
    return snapshot.docs.map(d => mapDoc<Appointment>(d));
  },

  createAppointment: async (data: Omit<Appointment, 'id'>): Promise<Appointment> => {
    const ref = await addDoc(collection(db, "appointments"), data);
    return { id: ref.id, ...data };
  },

  updateAppointmentStatus: async (id: string, status: any): Promise<void> => {
    await updateDoc(doc(db, "appointments", id), { status });
  },

  updateAppointment: async (id: string, data: Partial<Appointment>): Promise<void> => {
    await updateDoc(doc(db, "appointments", id), data);
  },

  deleteAppointment: async (id: string): Promise<void> => {
    await deleteDoc(doc(db, "appointments", id));
  },

  // --- CHAT SERVICES ---

  getChatMessages: async (companyId: string): Promise<ChatMessage[]> => {
    const q = query(
      collection(db, "support_messages"),
      where("companyId", "==", companyId)
    );
    const snapshot = await getDocs(q);
    const msgs = snapshot.docs.map(d => mapDoc<ChatMessage>(d));
    return msgs.sort((a, b) => a.createdAt - b.createdAt);
  },

  subscribeToChatMessages: (companyId: string, callback: (msgs: ChatMessage[]) => void) => {
    const q = query(
      collection(db, "support_messages"),
      where("companyId", "==", companyId)
    );
    // Real-time listener
    return onSnapshot(q, (snapshot) => {
      const msgs = snapshot.docs.map(d => mapDoc<ChatMessage>(d));
      const sorted = msgs.sort((a, b) => a.createdAt - b.createdAt);
      callback(sorted);
    });
  },

  sendChatMessage: async (msg: Omit<ChatMessage, 'id'>): Promise<ChatMessage> => {
    const ref = await addDoc(collection(db, "support_messages"), msg);
    return { id: ref.id, ...msg };
  },

  getStats: async (companyId: string) => {
    // Queries de Base
    const osColl = collection(db, "service_orders");
    const customersColl = collection(db, "customers");
    const osQuery = query(osColl, where("companyId", "==", companyId));

    // 1. Contagens Rápidas (Server-side)
    const [
      totalCustomersSnap,
      pendingSnap,
      completedSnap,
      revenueSnap
    ] = await Promise.all([
      getCountFromServer(query(customersColl, where("companyId", "==", companyId))),
      getCountFromServer(query(osColl, where("companyId", "==", companyId), where("status", "==", OSStatus.PENDING))),
      getCountFromServer(query(osColl, where("companyId", "==", companyId), where("status", "==", OSStatus.COMPLETED))),
      getAggregateFromServer(
        query(osColl, where("companyId", "==", companyId), where("status", "==", OSStatus.COMPLETED)),
        { totalRevenue: sum("totalValue"), totalLabor: sum("laborValue") }
      )
    ]);

    const totalCustomers = totalCustomersSnap.data().count;
    const pending = pendingSnap.data().count;
    const completed = completedSnap.data().count;
    const revenue = revenueSnap.data().totalRevenue || 0;
    const totalLabor = revenueSnap.data().totalLabor || 0;
    const totalParts = revenue - totalLabor;

    // 2. Gráfico de Histórico (Últimos 6 meses apenas)
    // Precisamos buscar dados para o gráfico, mas vamos limitar aos últimos 6 meses para não baixar tudo
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 5);
    sixMonthsAgo.setDate(1);
    sixMonthsAgo.setHours(0, 0, 0, 0);

    const historyQuery = query(
      osColl,
      where("companyId", "==", companyId),
      where("status", "==", OSStatus.COMPLETED),
      where("createdAt", ">=", sixMonthsAgo.getTime())
    );

    const historySnap = await getDocs(historyQuery);
    const historyDocs = historySnap.docs.map(d => d.data() as ServiceOrder);

    const history: { label: string, value: number }[] = [];
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    const today = new Date();

    for (let i = 5; i >= 0; i--) {
      const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const monthIdx = d.getMonth();
      const year = d.getFullYear();

      const monthlyTotal = historyDocs
        .filter(o => {
          const osDate = new Date(o.createdAt);
          return osDate.getMonth() === monthIdx && osDate.getFullYear() === year;
        })
        .reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0);

      history.push({ label: months[monthIdx], value: monthlyTotal });
    }

    // 3. Ranking (Precisa buscar dados, mas podemos otimizar ou manter simples por enquanto)
    // Para ranking exato precisamos de todos os dados do periodo ou agregar por mecanico.
    // Como Firestore não agrupa nativamente fácil sem baixar, vamos buscar as OS completas (já buscamos acima se forem recentes).
    // NOTA: Para um sistema real grande, isso deveria ser uma Cloud Function ou contador incremental no User.
    // Manteremos a lógica original mas limitando a "Últimos 30 dias" ou similar seria melhor, mas vou manter TODO para o futuro
    // Para não quebrar a funcionalidade de ranking geral, vamos baixar apenas os metadados necessários se for muito grande,
    // mas por hora, vamos assumir que o ranking baseia-se no histórico recente ou aceitar o trade-off para esta versão.
    // Vou usar a query de histórico (6 meses) para gerar o Ranking, o que é mais justo/performático que "todo o sempre".

    const teamSnap = await getDocs(query(collection(db, "team"), where("companyId", "==", companyId)));
    const team = teamSnap.docs.map(d => mapDoc<TeamMember>(d));

    const ranking: { name: string, value: number }[] = [];
    team.forEach(t => {
      const produced = historyDocs // Usa apenas os dados de 6 meses para ranking, o que faz sentido
        .filter(o => o.mechanicId === t.id)
        .reduce((acc, curr) => acc + (Number(curr.totalValue) || 0), 0);

      if (produced > 0) ranking.push({ name: t.name, value: produced });
    });
    ranking.sort((a, b) => b.value - a.value);

    const avgTicket = completed > 0 ? revenue / completed : 0;

    return {
      summary: {
        totalCustomers,
        pendingOS: pending,
        completedOS: completed,
        revenue,
        avgTicket
      },
      history,
      split: { labor: totalLabor, parts: totalParts },
      ranking
    };
  },

  exportData: async (companyId: string) => {
    const [
      companySnap,
      customersSnap,
      productsSnap,
      osSnap,
      transactionsSnap,
      teamSnap,
      appointmentsSnap,
      checklistsSnap
    ] = await Promise.all([
      getDoc(doc(db, "companies", companyId)),
      getDocs(query(collection(db, "customers"), where("companyId", "==", companyId))),
      getDocs(query(collection(db, "products"), where("companyId", "==", companyId))),
      getDocs(query(collection(db, "service_orders"), where("companyId", "==", companyId))),
      getDocs(query(collection(db, "transactions"), where("companyId", "==", companyId))),
      getDocs(query(collection(db, "team"), where("companyId", "==", companyId))),
      getDocs(query(collection(db, "appointments"), where("companyId", "==", companyId))),
      getDocs(query(collection(db, "checklists"), where("companyId", "==", companyId)))
    ]);

    return {
      company: companySnap.exists() ? { id: companySnap.id, ...companySnap.data() } : null,
      customers: customersSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      products: productsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      serviceOrders: osSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      transactions: transactionsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      team: teamSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      appointments: appointmentsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      checklists: checklistsSnap.docs.map(d => ({ id: d.id, ...d.data() })),
      exportedAt: Date.now()
    };
  }
};