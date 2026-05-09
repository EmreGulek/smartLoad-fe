import { create } from 'zustand';

/**
 * Global Zustand store — Phase 0 placeholder.
 * Will hold active manifest, selected flight, current load plan in Phase 1+.
 */
export const useLoadPlanStore = create((set) => ({
  flightNumber: 'TK-DEV-001',
  setFlightNumber: (no) => set({ flightNumber: no }),
}));
