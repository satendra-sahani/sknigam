import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { STORAGE_KEYS } from '../utils/constants';
import {
  login as loginService,
  verifyOtp as verifyOtpService,
  logout as logoutService,
  getStoredUser,
  getStoredToken,
} from '../services/auth';
import { connectSocket, disconnectSocket } from '../services/socket';
import { UserProfile } from '../types';

interface AuthContextType {
  user: UserProfile | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<{
    success: boolean;
    otpRequired?: boolean;
    tempToken?: string;
    message?: string;
  }>;
  verifyOtp: (tempToken: string, otp: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const isAuthenticated = !!user;

  // Check for existing session on mount
  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getStoredToken();
      if (token) {
        const storedUser = await getStoredUser();
        if (storedUser) {
          setUser(storedUser);
          await connectSocket();
        }
      }
    } catch (error) {
      console.log('[Auth] Session check failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const login = useCallback(
    async (
      email: string,
      password: string,
    ): Promise<{
      success: boolean;
      otpRequired?: boolean;
      tempToken?: string;
      message?: string;
    }> => {
      try {
        const result = await loginService(email, password);

        if (result.success && !result.otpRequired && result.user) {
          setUser(result.user);
          await connectSocket();
          return { success: true };
        }

        if (result.otpRequired) {
          return {
            success: true,
            otpRequired: true,
            tempToken: result.tempToken,
          };
        }

        return {
          success: false,
          message: result.message || 'Login failed',
        };
      } catch (error: any) {
        const message =
          error.response?.data?.message ||
          error.message ||
          'Network error. Please try again.';
        return { success: false, message };
      }
    },
    [],
  );

  const verifyOtp = useCallback(
    async (tempToken: string, otp: string): Promise<boolean> => {
      try {
        const result = await verifyOtpService(tempToken, otp);
        if (result.success && result.user) {
          setUser(result.user);
          await connectSocket();
          return true;
        }
        return false;
      } catch (error) {
        return false;
      }
    },
    [],
  );

  const logout = useCallback(async () => {
    disconnectSocket();
    await logoutService();
    setUser(null);
  }, []);

  const refreshUser = useCallback(async () => {
    const storedUser = await getStoredUser();
    if (storedUser) {
      setUser(storedUser);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        isAuthenticated,
        login,
        verifyOtp,
        logout,
        refreshUser,
      }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextType {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

export default useAuth;
