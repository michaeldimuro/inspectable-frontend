import axios from 'axios';
import { API_BASE_URL } from '../config/api';
import { useAuthStore } from '../stores/authStore';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = useAuthStore.getState().token;
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      useAuthStore.getState().logout();
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  register: (email, password, name) =>
    api.post('/auth/register', { email, password, name }),
  login: (email, password) =>
    api.post('/auth/login', { email, password }),
  deleteAccount: (email) =>
    api.delete('/auth/account', { data: { email } }),
};

// Properties API
export const propertiesAPI = {
  getAll: () => api.get('/properties'),
  getById: (id) => api.get(`/properties/${id}`),
  create: (data) => api.post('/properties', data),
  update: (id, data) => api.put(`/properties/${id}`, data),
  delete: (id) => api.delete(`/properties/${id}`),
  uploadPhoto: (id, formData) =>
    api.post(`/properties/${id}/photo`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

// Areas API
export const areasAPI = {
  getByProperty: (propertyId) => api.get(`/areas/property/${propertyId}`),
  getById: (id) => api.get(`/areas/${id}`),
  create: (data) => api.post('/areas', data),
  update: (id, data) => api.put(`/areas/${id}`, data),
  delete: (id) => api.delete(`/areas/${id}`),
};

// Items API
export const itemsAPI = {
  getByArea: (areaId) => api.get(`/items/area/${areaId}`),
  getById: (id) => api.get(`/items/${id}`),
  create: (formData) =>
    api.post('/items', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
  analyzeWithAI: (id) => api.post(`/items/${id}/analyze`),
  update: (id, data) => {
    // If data is FormData, use multipart/form-data, otherwise use JSON
    const isFormData = data instanceof FormData;
    return api.put(`/items/${id}`, data, isFormData ? {
      headers: { 'Content-Type': 'multipart/form-data' },
    } : {});
  },
  delete: (id) => api.delete(`/items/${id}`),
};

// Reports API
export const reportsAPI = {
  generate: (propertyId) =>
    api.post(`/reports/property/${propertyId}`, {}, { 
      responseType: 'arraybuffer'
    }),
};

export default api;

