import { createContext } from 'react';

export type User = {
  id: string;
  email: string;
};

export type AuthContextType = {
  user: User | null;
  isLoading: boolean;
  logout: () => void;
  confirmLogout: () => Promise<void>;
  closeLogoutModal: () => void;
  isLogoutModalOpen: boolean;
};

export const AuthContext = createContext<AuthContextType | undefined>(undefined);
