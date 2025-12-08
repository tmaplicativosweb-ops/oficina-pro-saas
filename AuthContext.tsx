import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, Company, AuthState, UserRole } from './types';

interface AuthContextType extends AuthState {
  login: (u: User, c: Company | null) => void;
  logout: () => void;
  updateCompany: (c: Company) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    user: null,
    company: null,
    isAuthenticated: false,
    isLoading: true,
  });

  useEffect(() => {
    const storedUser = sessionStorage.getItem('oficina_user');
    const storedCompany = sessionStorage.getItem('oficina_company');
    
    if (storedUser) {
      setState({
        user: JSON.parse(storedUser),
        company: storedCompany ? JSON.parse(storedCompany) : null,
        isAuthenticated: true,
        isLoading: false
      });
    } else {
      setState(s => ({ ...s, isLoading: false }));
    }
  }, []);

  const login = (user: User, company: Company | null) => {
    sessionStorage.setItem('oficina_user', JSON.stringify(user));
    if (company) sessionStorage.setItem('oficina_company', JSON.stringify(company));
    
    setState({
      user,
      company,
      isAuthenticated: true,
      isLoading: false
    });
  };

  const logout = () => {
    sessionStorage.removeItem('oficina_user');
    sessionStorage.removeItem('oficina_company');
    setState({
      user: null,
      company: null,
      isAuthenticated: false,
      isLoading: false
    });
  };

  const updateCompany = (company: Company) => {
      sessionStorage.setItem('oficina_company', JSON.stringify(company));
      setState(prev => ({ ...prev, company }));
  };

  return (
    <AuthContext.Provider value={{ ...state, login, logout, updateCompany }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used within an AuthProvider");
  return context;
};