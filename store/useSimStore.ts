"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampBubbleToBoundary, isInsideBoundary } from "@/lib/boundary";
import { createDefaultBoundary, createDefaultParams, generateAxes, generateBubbles, stepSimulation } from "@/lib/forces";
import type { Axis, Boundary, Bubble, PatternMode, SimParams } from "@/types";

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
  axes: Axis[];
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
const initialGenerated = regenerate(initialParams, initialBoundary);

function regenerate(params: SimParams, boundary: Boundary) {
  const safeParams = normalizeParams(params);
  const axes = generateAxes(safeParams, boundary);
  const bubbles = generateBubbles(safeParams, boundary);
  return {
    params: safeParams,
    axes,
    bubbles
  };
}

function changesBubblePopulation(key: keyof SimParams) {
  return [
    "seed",
    "generationMode",
    "bubbleCount",
    "minRadius",
    "maxRadius",
    "carveCount",
    "carveMinRadius",
    "carveMaxRadius",
    "axisCount",
    "axisLength",
    "axisAngle",
    "axisThickness"
  ].includes(key);
}

function normalizeParams(params: SimParams): SimParams {
  return {
    ...initialParams,
    ...params,
    carveMinRadius: Math.min(params.carveMinRadius ?? initialParams.carveMinRadius, params.carveMaxRadius ?? initialParams.carveMaxRadius),
    carveMaxRadius: Math.max(params.carveMaxRadius ?? initialParams.carveMaxRadius, params.carveMinRadius ?? initialParams.carveMinRadius),
    minRadius: Math.min(params.minRadius ?? initialParams.minRadius, params.maxRadius ?? initialParams.maxRadius),
    maxRadius: Math.max(params.maxRadius ?? initialParams.maxRadius, params.minRadius ?? initialParams.minRadius)
  };
}

export const useSimStore = create<SimState>()(
  persist(
    (set) => ({
      boundary: initialBoundary,
      params: initialParams,
      bubbles: initialGenerated.bubbles,
      axes: initialGenerated.axes,
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
          const generated = regenerate(state.params, boundary);
          return { boundary, params: generated.params, bubbles: generated.bubbles, axes: generated.axes, selectedId: null };
        }),
      updateBoundary: (key, value) =>
        set((state) => {
          const boundary = { ...state.boundary, [key]: value };
          const generated = regenerate(state.params, boundary);
          return { boundary, params: generated.params, bubbles: generated.bubbles, axes: generated.axes, selectedId: null };
        }),
      updateParam: (key, value) =>
        set((state) => {
          const params = normalizeParams({ ...state.params, [key]: value });
          if (changesBubblePopulation(key)) {
            const generated = regenerate(params, state.boundary);
            return { params: generated.params, bubbles: generated.bubbles, axes: generated.axes, selectedId: null };
          }
          return { params };
        }),
      setPatternMode: (patternMode) => set({ patternMode }),
      toggleVisual: (key) => set((state) => ({ visual: { ...state.visual, [key]: !state.visual[key] } })),
      randomizeSeed: () =>
        set((state) => {
          const params = normalizeParams({ ...state.params, seed: Math.floor(1000 + Math.random() * 900000) });
          const generated = regenerate(params, state.boundary);
          return { params: generated.params, bubbles: generated.bubbles, axes: generated.axes, selectedId: null, isPaused: false };
        }),
      resetSimulation: () =>
        set((state) => {
          const generated = regenerate(state.params, state.boundary);
          return {
            params: generated.params,
            bubbles: generated.bubbles,
            axes: generated.axes,
            selectedId: null,
            isPaused: false
          };
        }),
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
          const r = kind === "mass" ? (state.params.minRadius + state.params.maxRadius) / 2 : (state.params.carveMinRadius + state.params.carveMaxRadius) / 2;
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
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<SimState>;
        const boundary = state.boundary ?? initialBoundary;
        const params = normalizeParams({ ...initialParams, ...state.params });
        const generated = regenerate(params, boundary);
        return {
          ...state,
          boundary,
          params: generated.params,
          bubbles: generated.bubbles,
          axes: generated.axes,
          selectedId: null,
          isPaused: false
        } as SimState;
      },
      partialize: (state) => ({
        boundary: state.boundary,
        params: state.params,
        visual: state.visual,
        patternMode: state.patternMode
      }),
      onRehydrateStorage: () => (state) => {
        if (!state) return;
        const generated = regenerate(state.params, state.boundary);
        state.params = generated.params;
        state.bubbles = generated.bubbles;
        state.axes = generated.axes;
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
