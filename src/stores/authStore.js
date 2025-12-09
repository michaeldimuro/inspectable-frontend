import { create } from 'zustand';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { authAPI } from '../services/api';

const TOKEN_KEY = '@home_inspector_token';
const USER_KEY = '@home_inspector_user';

export const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isLoading: false,
  error: null,

  // Load token from storage
  loadToken: async () => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_KEY);
      const userStr = await AsyncStorage.getItem(USER_KEY);
      if (token && userStr) {
        const user = JSON.parse(userStr);
        set({ token, user });
      }
    } catch (error) {
      console.error('Failed to load token:', error);
    }
  },

  // Register
  register: async (email, password, name) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.register(email, password, name);
      const { user, token } = response.data;
      
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Registration failed';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Login
  login: async (email, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await authAPI.login(email, password);
      const { user, token } = response.data;
      
      await AsyncStorage.setItem(TOKEN_KEY, token);
      await AsyncStorage.setItem(USER_KEY, JSON.stringify(user));
      
      set({ user, token, isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Login failed';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Logout
  logout: async () => {
    await AsyncStorage.removeItem(TOKEN_KEY);
    await AsyncStorage.removeItem(USER_KEY);
    set({ user: null, token: null, error: null });
  },

  // Clear error
  clearError: () => set({ error: null }),
}));


