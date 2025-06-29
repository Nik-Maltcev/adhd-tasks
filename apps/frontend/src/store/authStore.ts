import { create } from 'zustand';
import axios from 'axios';
import toast from 'react-hot-toast';

// Define the API base URL
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api';

// Define the shape of the user object (matching backend UserDTO)
interface User {
  id: string;
  email: string;
  name?: string | null;
  createdAt: string;
  updatedAt: string;
  preferences?: UserPreferences | null;
}

interface UserPreferences {
  id: string;
  userId: string;
  maxTasksPerDay: number;
  maxWorkHoursPerDay: number;
  preferredTimeBlocks?: any;
  peakProductivityStart?: string | null;
  peakProductivityEnd?: string | null;
  preferredProjectsPerDay: number;
  complexToSimpleRatio: number;
  shortTermGoals?: any;
  longTermGoals?: any;
  personalValues?: any;
  createdAt: string;
  updatedAt: string;
}

// Define the authentication state
interface AuthState {
  token: string | null;
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => void;
  checkAuth: () => Promise<void>;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
}

export const useAuthStore = create<AuthState>((set, get) => ({
  token: localStorage.getItem('token') || null,
  user: null,
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: false,
  error: null,

  setLoading: (loading: boolean) => set({ isLoading: loading }),
  setError: (error: string | null) => set({ error }),

  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/login`, { email, password });
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
      toast.success('Logged in successfully!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Login failed. Please check your credentials.';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw err; // Re-throw to allow components to catch
    }
  },

  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await axios.post(`${API_BASE_URL}/auth/register`, { email, password, name });
      const { token, user } = response.data.data;
      localStorage.setItem('token', token);
      set({ token, user, isAuthenticated: true, isLoading: false });
      toast.success('Registration successful! Welcome!');
    } catch (err: any) {
      const errorMessage = err.response?.data?.error?.message || 'Registration failed. Please try again.';
      set({ error: errorMessage, isLoading: false });
      toast.error(errorMessage);
      throw err;
    }
  },

  logout: () => {
    localStorage.removeItem('token');
    set({ token: null, user: null, isAuthenticated: false, isLoading: false, error: null });
    toast('Logged out successfully!', { icon: '👋' });
  },

  checkAuth: async () => {
    const token = get().token;
    if (!token) {
      set({ isAuthenticated: false, user: null });
      return;
    }

    set({ isLoading: true, error: null });
    try {
      const response = await axios.get(`${API_BASE_URL}/auth/profile`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });
      set({ user: response.data.data, isAuthenticated: true, isLoading: false });
    } catch (err: any) {
      // If token is invalid or expired, clear it
      localStorage.removeItem('token');
      set({ token: null, user: null, isAuthenticated: false, isLoading: false });
      const errorMessage = err.response?.data?.error?.message || 'Session expired. Please log in again.';
      toast.error(errorMessage);
    }
  },
}));
