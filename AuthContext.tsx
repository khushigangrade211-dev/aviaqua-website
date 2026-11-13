import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { apiRequest, getAuthToken, setAuthToken } from '../lib/api';
import { AppNotification, AuthUser, CompanyConfig, Customer, Employee } from '../lib/types';

interface AuthContextValue {
  user: AuthUser | null;
  customer: Customer | null;
  employee: Employee | null;
  companyConfig: CompanyConfig | null;
  notifications: AppNotification[];
  loading: boolean;
  login: (email: string, password: string) => Promise<AuthUser>;
  register: (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    companyName?: string;
    address?: string;
    city?: string;
  }) => Promise<AuthUser>;
  logout: () => void;
  refreshSession: () => Promise<void>;
  refreshConfig: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [employee, setEmployee] = useState<Employee | null>(null);
  const [companyConfig, setCompanyConfig] = useState<CompanyConfig | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const refreshConfig = useCallback(async () => {
    try {
      const cfg = await apiRequest<CompanyConfig>('/public/config');
      setCompanyConfig(cfg);
    } catch (err) {
      console.error('Failed to load company config:', err);
    }
  }, []);

  const refreshNotifications = useCallback(async () => {
    if (!getAuthToken()) {
      setNotifications([]);
      return;
    }
    try {
      const list = await apiRequest<AppNotification[]>('/notifications');
      setNotifications(list);
    } catch {
      // ignore if token expired
    }
  }, []);

  const refreshSession = useCallback(async () => {
    const token = getAuthToken();
    if (!token) {
      setUser(null);
      setCustomer(null);
      setEmployee(null);
      setLoading(false);
      return;
    }
    try {
      const data = await apiRequest<{ user: AuthUser; customer: Customer | null; employee: Employee | null }>('/auth/me');
      setUser(data.user);
      setCustomer(data.customer);
      setEmployee(data.employee);
      await refreshNotifications();
    } catch {
      setAuthToken(null);
      setUser(null);
      setCustomer(null);
      setEmployee(null);
    } finally {
      setLoading(false);
    }
  }, [refreshNotifications]);

  useEffect(() => {
    refreshConfig();
    refreshSession();
  }, [refreshConfig, refreshSession]);

  const login = async (email: string, password: string): Promise<AuthUser> => {
    const data = await apiRequest<{
      token: string;
      user: AuthUser;
      customer: Customer | null;
      employee: Employee | null;
    }>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    setAuthToken(data.token);
    setUser(data.user);
    setCustomer(data.customer);
    setEmployee(data.employee);
    await refreshNotifications();
    return data.user;
  };

  const register = async (payload: {
    fullName: string;
    email: string;
    phone: string;
    password: string;
    companyName?: string;
    address?: string;
    city?: string;
  }): Promise<AuthUser> => {
    const data = await apiRequest<{
      token: string;
      user: AuthUser;
      customer: Customer;
    }>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    setAuthToken(data.token);
    setUser(data.user);
    setCustomer(data.customer);
    setEmployee(null);
    await refreshNotifications();
    return data.user;
  };

  const logout = () => {
    setAuthToken(null);
    setUser(null);
    setCustomer(null);
    setEmployee(null);
    setNotifications([]);
  };

  const markNotificationRead = async (id: string) => {
    await apiRequest(`/notifications/${id}/read`, { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, isRead: true } : n)));
  };

  const markAllNotificationsRead = async () => {
    await apiRequest('/notifications/read-all', { method: 'PUT' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        customer,
        employee,
        companyConfig,
        notifications,
        loading,
        login,
        register,
        logout,
        refreshSession,
        refreshConfig,
        refreshNotifications,
        markNotificationRead,
        markAllNotificationsRead,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used inside AuthProvider');
  return ctx;
}
