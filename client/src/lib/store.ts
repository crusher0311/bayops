import { create } from 'zustand';
import type { Location, Workflow } from '@shared/schema';

interface ShopState {
  currentLocationId: string | null;
  
  setCurrentLocation: (locationId: string) => void;
}

export const useShopStore = create<ShopState>((set) => ({
  currentLocationId: null,

  setCurrentLocation: (locationId: string) => {
    set({ currentLocationId: locationId });
  },
}));
