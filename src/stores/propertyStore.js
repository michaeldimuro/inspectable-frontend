import { create } from 'zustand';
import { propertiesAPI, areasAPI, itemsAPI } from '../services/api';

export const usePropertyStore = create((set, get) => ({
  properties: [],
  currentProperty: null,
  currentArea: null,
  isLoading: false,
  error: null,

  // Fetch all properties
  fetchProperties: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await propertiesAPI.getAll();
      set({ properties: response.data.properties, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Fetch single property with details
  fetchPropertyById: async (id) => {
    set({ isLoading: true, error: null });
    try {
      const response = await propertiesAPI.getById(id);
      set({ currentProperty: response.data.property, isLoading: false });
    } catch (error) {
      set({ error: error.message, isLoading: false });
    }
  },

  // Create property
  createProperty: async (data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await propertiesAPI.create(data);
      const newProperty = response.data.property;
      set((state) => ({
        properties: [newProperty, ...state.properties],
        isLoading: false,
      }));
      return { success: true, property: newProperty };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to create property';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Update property
  updateProperty: async (id, data) => {
    set({ isLoading: true, error: null });
    try {
      const response = await propertiesAPI.update(id, data);
      const updatedProperty = response.data.property;
      set((state) => ({
        properties: state.properties.map((p) =>
          p.id === id ? updatedProperty : p
        ),
        currentProperty:
          state.currentProperty?.id === id ? updatedProperty : state.currentProperty,
        isLoading: false,
      }));
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update property';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Delete property
  deleteProperty: async (id) => {
    set({ isLoading: true, error: null });
    try {
      await propertiesAPI.delete(id);
      set((state) => ({
        properties: state.properties.filter((p) => p.id !== id),
        currentProperty: state.currentProperty?.id === id ? null : state.currentProperty,
        isLoading: false,
      }));
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to delete property';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Create area
  createArea: async (propertyId, name, status = 'IN', notInspectedReason = '') => {
    try {
      const data = { propertyId, name, status };
      if (status === 'NI' && notInspectedReason) {
        data.notInspectedReason = notInspectedReason;
      }
      const response = await areasAPI.create(data);
      // Refresh current property to get updated areas (without setting global loading state)
      const propertyResponse = await propertiesAPI.getById(propertyId);
      set({ currentProperty: propertyResponse.data.property });
      return { success: true, area: response.data.area };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to create area';
      set({ error: errorMsg });
      return { success: false, error: errorMsg };
    }
  },

  // Delete area
  deleteArea: async (areaId) => {
    set({ isLoading: true, error: null });
    try {
      await areasAPI.delete(areaId);
      // Refresh current property
      if (get().currentProperty) {
        await get().fetchPropertyById(get().currentProperty.id);
      }
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to delete area';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Set current area
  setCurrentArea: (area) => set({ currentArea: area }),

  // Create inspection item
  createItem: async (areaId, formData) => {
    set({ isLoading: true, error: null });
    try {
      const response = await itemsAPI.create(formData);
      const item = response.data.item;
      
      // Auto-analyze with AI
      try {
        await itemsAPI.analyzeWithAI(item.id);
      } catch (aiError) {
        console.warn('AI analysis failed:', aiError);
      }
      
      // Refresh current property
      if (get().currentProperty) {
        await get().fetchPropertyById(get().currentProperty.id);
      }
      
      set({ isLoading: false });
      return { success: true, item };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to create item';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Update item
  updateItem: async (itemId, dataOrFormData) => {
    set({ isLoading: true, error: null });
    try {
      // Check if it's FormData (has photo) or regular data
      const isFormData = dataOrFormData instanceof FormData;
      const response = isFormData 
        ? await itemsAPI.update(itemId, dataOrFormData)
        : await itemsAPI.update(itemId, dataOrFormData);
      
      // Refresh current property
      if (get().currentProperty) {
        await get().fetchPropertyById(get().currentProperty.id);
      }
      set({ isLoading: false });
      return { success: true, item: response.data.item };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to update item';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Delete item
  deleteItem: async (itemId) => {
    set({ isLoading: true, error: null });
    try {
      await itemsAPI.delete(itemId);
      // Refresh current property
      if (get().currentProperty) {
        await get().fetchPropertyById(get().currentProperty.id);
      }
      set({ isLoading: false });
      return { success: true };
    } catch (error) {
      const errorMsg = error.response?.data?.error?.message || 'Failed to delete item';
      set({ error: errorMsg, isLoading: false });
      return { success: false, error: errorMsg };
    }
  },

  // Clear error
  clearError: () => set({ error: null }),
}));

