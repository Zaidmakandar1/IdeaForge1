import React, { createContext, useContext, useState, useEffect } from 'react';
import { getProfile, login as apiLogin, signup as apiSignup } from '@/services/api';

interface User {
  id: string;
  email: string;
  name: string;
  avatar?: string;
}

interface AuthContextType {
  user: User | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string, name: string) => Promise<void>;
  logout: () => void;
  isLoading: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchUser = async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        setIsLoading(false);
        return;
      }
      try {
        const res = await getProfile();
        setUser(res.data);
        localStorage.setItem('user', JSON.stringify(res.data));
      } catch (err) {
        setUser(null);
        localStorage.removeItem('user');
        localStorage.removeItem('token');
      }
      setIsLoading(false);
    };
    fetchUser();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const res = await apiLogin({ email, password });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      throw err;
    }
    setIsLoading(false);
  };

  const signup = async (email: string, password: string, name: string) => {
    setIsLoading(true);
    try {
      const res = await apiSignup({ email, password, name });
      const { token, user } = res.data;
      localStorage.setItem('token', token);
      setUser(user);
      localStorage.setItem('user', JSON.stringify(user));
    } catch (err) {
      setUser(null);
      localStorage.removeItem('user');
      localStorage.removeItem('token');
      throw err;
    }
    setIsLoading(false);
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('user');
    localStorage.removeItem('token');
  };

  return (
    <AuthContext.Provider value={{ user, login, signup, logout, isLoading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
