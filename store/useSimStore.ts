"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampBubbleToBoundary, isInsideBoundary } from "@/lib/boundary";
import { createDefaultBoundary, createDefaultParams, generateBubbles, stepSimulation } from "@/lib/forces";
import type { Boundary, Bubble, PatternMode, SimParams } from "@/types";

type VisualFlags = {
  showBubbles: boolean;
  showLinks: boolean;
  showMergedShape: boolean;
  showCarveBubbles: boolean;
};

type SimState = {
  boundary: Boundary;
  params: SimParams;
  bubbles: Bubble[];
  isPaused: boolean;
  selectedId: string | null;
  patternMode: PatternMode;
  visual: VisualFlags;
  setBoundaryShape: (shape: Boundary["shape"]) => void;
  updateBoundary: (key: "width" | "height" | "padding", value: number) => void;
  updateParam: <K extends keyof SimParams>(key: K, value: SimParams[K]) => void;
  setPatternMode: (mode: PatternMode) => void;
  toggleVisual: (key: keyof VisualFlags) => void;
  randomizeSeed: () => void;
  resetSimulation: () => void;
  setPaused: (isPaused: boolean) => void;
  step: () => void;
  selectBubble: (id: string | null) => void;
  moveBubble: (id: string, x: number, y: number) => void;
  toggleFixed: (id: string) => void;
  addBubble: (kind: Bubble["kind"], x: number, y: number) => void;
  deleteSelected: () => void;
};

const initialBoundary = createDefaultBoundary();
const initialParams = createDefaultParams();

function regenerate(params: SimParams, boundary: Boundary) {
  return generateBubbles(params, boundary);
}

function changesBubblePopulation(key: keyof SimParams) {
  return key === "seed" || key === "bubbleCount" || key === "minRadius" || key === "maxRadius" || key === "carveCount";
}

export const useSimStore = create<SimState>()(
  persist(
    (set) => ({
      boundary: initialBoundary,
      params: initialParams,
      bubbles: regenerate(initialParams, initialBoundary),
      isPaused: false,
      selectedId: null,
      patternMode: "metaball",
      visual: {
        showBubbles: true,
        showLinks: true,
        showMergedShape: true,
        showCarveBubbles: true
      },
      setBoundaryShape: (shape) =>
        set((state) => {
          const boundary = { ...state.boundary, shape };
          return { boundary, bubbles: regenerate(state.params, boundary), selectedId: null };
        }),
      updateBoundary: (key, value) =>
        set((state) => {
          const boundary = { ...state.boundary, [key]: value };
          return { boundary, bubbles: regenerate(state.params, boundary), selectedId: null };
        }),
      updateParam: (key, value) =>
        set((state) => {
          const params = { ...state.params, [key]: value };
          if (changesBubblePopulation(key)) {
            return { params, bubbles: regenerate(params, state.boundary), selectedId: null };
          }
          return { params };
        }),
      setPatternMode: (patternMode) => set({ patternMode }),
      toggleVisual: (key) => set((state) => ({ visual: { ...state.visual, [key]: !state.visual[key] } })),
      randomizeSeed: () =>
        set((state) => {
          const params = { ...state.params, seed: Math.floor(1000 + Math.random() * 900000) };
          return { params, bubbles: regenerate(params, state.boundary), selectedId: null, isPaused: false };
        }),
      resetSimulation: () =>
        set((state) => ({
          bubbles: regenerate(state.params, state.boundary),
          selectedId: null,
          isPaused: false
        })),
      setPaused: (isPaused) => set({ isPaused }),
      step: () =>
        set((state) => {
          if (state.isPaused) return state;
          return { bubbles: stepSimulation(state.bubbles, state.boundary, state.params) };
        }),
      selectBubble: (selectedId) => set({ selectedId }),
      moveBubble: (id, x, y) =>
        set((state) => ({
          bubbles: state.bubbles.map((bubble) => {
            if (bubble.id !== id) return bubble;
            return clampBubbleToBoundary({ ...bubble, x, y, vx: 0, vy: 0 }, state.boundary);
          })
        })),
      toggleFixed: (id) =>
        set((state) => ({
          bubbles: state.bubbles.map((bubble) => (bubble.id === id ? { ...bubble, fixed: !bubble.fixed, vx: 0, vy: 0 } : bubble))
        })),
      addBubble: (kind, x, y) =>
        set((state) => {
          const r = kind === "mass" ? (state.params.minRadius + state.params.maxRadius) / 2 : state.params.maxRadius * 0.85;
          if (!isInsideBoundary(x, y, r, state.boundary)) return state;
          const bubble: Bubble = {
            id: `${kind}-${Date.now()}-${Math.round(x)}-${Math.round(y)}`,
            x,
            y,
            vx: 0,
            vy: 0,
            r,
            kind
          };
          const params = {
            ...state.params,
            bubbleCount: kind === "mass" ? state.params.bubbleCount + 1 : state.params.bubbleCount,
            carveCount: kind === "carve" ? state.params.carveCount + 1 : state.params.carveCount
          };
          return { bubbles: [...state.bubbles, bubble], params, selectedId: bubble.id };
        }),
      deleteSelected: () =>
        set((state) => {
          if (!state.selectedId) return state;
          const target = state.bubbles.find((bubble) => bubble.id === state.selectedId);
          const params = target
            ? {
                ...state.params,
                bubbleCount: target.kind === "mass" ? Math.max(0, state.params.bubbleCount - 1) : state.params.bubbleCount,
                carveCount: target.kind === "carve" ? Math.max(0, state.params.carveCount - 1) : state.params.carveCount
              }
            : state.params;
          return {
            bubbles: state.bubbles.filter((bubble) => bubble.id !== state.selectedId),
            params,
            selectedId: null
          };
        })
    }),
    {
      name: "form-lab-force-state",
      version: 1,
      partialize: (state) => ({
        boundary: state.boundary,
        params: state.params,
        visual: state.visual,
        patternMode: state.patternMode
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        state.bubbles = regenerate(state.params, state.boundary);
        state.selectedId = null;
        state.isPaused = false;
      }
    }
  )
);

export function getSelectedBubble() {
  const state = useSimStore.getState();
  return state.bubbles.find((bubble) => bubble.id === state.selectedId) ?? null;
}
