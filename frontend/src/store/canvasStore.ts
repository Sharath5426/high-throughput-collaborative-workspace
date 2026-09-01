import { create } from 'zustand';
import { api } from '../services/api';
import { CanvasElement } from '../types';

interface CanvasState {
  canvasElements: CanvasElement[];
  isCanvasLoading: boolean;
  canvasError: string | null;
  selectedElementId: string | null;
  setSelectedElementId: (id: string | null) => void;
  fetchCanvasElements: (boardId: string) => Promise<void>;
  createCanvasElement: (boardId: string, payload: Partial<CanvasElement>) => Promise<CanvasElement | null>;
  updateCanvasElement: (boardId: string, elementId: string, payload: Partial<CanvasElement>, version: number) => Promise<void>;
  deleteCanvasElement: (boardId: string, elementId: string) => Promise<void>;
  handleCanvasElementCreated: (payload: { element: CanvasElement; boardId: string }) => void;
  handleCanvasElementUpdated: (payload: { element: CanvasElement; boardId: string }) => void;
  handleCanvasElementDeleted: (payload: { elementId: string; boardId: string }) => void;
}

export const useCanvasStore = create<CanvasState>((set, get) => ({
  canvasElements: [],
  isCanvasLoading: false,
  canvasError: null,
  selectedElementId: null,

  setSelectedElementId: (id) => set({ selectedElementId: id }),

  fetchCanvasElements: async (boardId) => {
    if (!boardId) return;
    set({ isCanvasLoading: true, canvasError: null });
    try {
      const res = await api.get(`/canvas?boardId=${boardId}`);
      set({ canvasElements: res.data.data || [], isCanvasLoading: false });
    } catch (err: any) {
      set({ canvasError: err.response?.data?.error || 'Failed to load canvas', isCanvasLoading: false });
    }
  },

  createCanvasElement: async (boardId, payload) => {
    try {
      const res = await api.post('/canvas', {
        boardId,
        type: payload.type || 'sticky',
        x: payload.x ?? 80,
        y: payload.y ?? 80,
        width: payload.width ?? 180,
        height: payload.height ?? 160,
        rotation: payload.rotation ?? 0,
        content: payload.content ?? '',
        style: payload.style ?? {},
        points: payload.points ?? [],
      });
      const created = res.data.data as CanvasElement;
      set((state) => ({ canvasElements: [...state.canvasElements.filter((item) => item.id !== created.id), created] }));
      return created;
    } catch (err: any) {
      set({ canvasError: err.response?.data?.error || 'Failed to create canvas object' });
      return null;
    }
  },

  updateCanvasElement: async (boardId, elementId, payload, version) => {
    try {
      const res = await api.put(`/canvas/${elementId}`, {
        boardId,
        ...payload,
        version,
      });
      const updated = res.data.data as CanvasElement;
      set((state) => ({
        canvasElements: state.canvasElements.map((item) => (item.id === updated.id ? updated : item)),
      }));
    } catch (err: any) {
      set({ canvasError: err.response?.data?.error || 'Failed to update canvas object' });
    }
  },

  deleteCanvasElement: async (boardId, elementId) => {
    try {
      await api.delete(`/canvas/${elementId}`, { data: { boardId } });
      set((state) => ({
        canvasElements: state.canvasElements.filter((item) => item.id !== elementId),
        selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
      }));
    } catch (err: any) {
      set({ canvasError: err.response?.data?.error || 'Failed to delete canvas object' });
    }
  },

  handleCanvasElementCreated: ({ element, boardId }) => {
    set((state) => {
      if (boardId && state.canvasElements.some((item) => item.id === element.id)) return state;
      return { canvasElements: [...state.canvasElements.filter((item) => item.id !== element.id), element] };
    });
  },

  handleCanvasElementUpdated: ({ element, boardId }) => {
    set((state) => ({
      canvasElements: state.canvasElements.map((item) => (item.id === element.id ? element : item)),
    }));
  },

  handleCanvasElementDeleted: ({ elementId, boardId }) => {
    set((state) => ({
      canvasElements: state.canvasElements.filter((item) => item.id !== elementId),
      selectedElementId: state.selectedElementId === elementId ? null : state.selectedElementId,
    }));
  },
}));
