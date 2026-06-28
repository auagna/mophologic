"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { clampBubbleToBoundary, generateBubbles } from "@/lib/generateBubbleShape";
import type {
  BooleanParam,
  BoundaryShape,
  Bubble,
  ConnectionPointCount,
  ConnectionPointType,
  FormLabSnapshot,
  FormMode,
  NumericParam,
  PatternType,
  PresetName,
  Symmetry,
  TangentRule
} from "@/types/formLab";

type FormLabActions = {
  setMode: (mode: FormMode) => void;
  setBoundaryShape: (boundaryShape: BoundaryShape) => void;
  updateParam: (key: NumericParam | BooleanParam, value: number | boolean) => void;
  randomizeSeed: () => void;
  resetForm: () => void;
  regenerateBubbles: () => void;
  updateBubble: (id: string, x: number, y: number) => void;
  updateCarveBubble: (id: string, x: number, y: number) => void;
  setTangentRule: (rule: TangentRule) => void;
  setSymmetry: (symmetry: Symmetry) => void;
  setConnectionPointCount: (count: ConnectionPointCount) => void;
  setConnectionPointType: (type: ConnectionPointType) => void;
  setPatternType: (type: PatternType) => void;
  applyPreset: (name: PresetName) => void;
};

export type FormLabStore = FormLabSnapshot & FormLabActions;

const defaultSnapshot: FormLabSnapshot = {
  mode: "table",
  boundaryShape: "circle",
  widthMm: 700,
  depthMm: 700,
  padding: 34,
  seed: 2417,
  bubbleCount: 34,
  minRadius: 34,
  maxRadius: 94,
  sizeVariation: 62,
  attraction: 66,
  repulsion: 48,
  mergeDistance: 42,
  boundaryStick: 52,
  carveBubbleCount: 7,
  carveRadius: 58,
  carveDepth: 64,
  edgeCarveOnly: true,
  symmetry: "none",
  tangentRule: "blob",
  cornerRule: "random",
  connectionPointCount: 6,
  connectionPointType: "universal",
  patternType: "cellular",
  patternDensity: 52,
  patternScale: 50,
  patternStrokeWidth: 2.4,
  showGrid: true,
  showBoundary: true,
  showBubbles: true,
  showPattern: true,
  bubbles: [],
  carveBubbles: []
};

function withGeneratedBubbles(snapshot: FormLabSnapshot): FormLabSnapshot {
  const generated = generateBubbles(snapshot);
  return {
    ...snapshot,
    bubbles: generated.bubbles,
    carveBubbles: generated.carveBubbles
  };
}

function shouldRegenerateForParam(key: NumericParam | BooleanParam) {
  return [
    "padding",
    "seed",
    "bubbleCount",
    "minRadius",
    "maxRadius",
    "sizeVariation",
    "attraction",
    "repulsion",
    "mergeDistance",
    "boundaryStick",
    "carveBubbleCount",
    "carveRadius",
    "carveDepth",
    "edgeCarveOnly"
  ].includes(key);
}

function syncDimensions(snapshot: FormLabSnapshot): FormLabSnapshot {
  if (snapshot.boundaryShape === "circle" || snapshot.boundaryShape === "square") {
    const size = Math.max(snapshot.widthMm, snapshot.depthMm);
    return { ...snapshot, widthMm: size, depthMm: size };
  }
  return snapshot;
}

export const presets: Record<PresetName, Partial<FormLabSnapshot>> = {
  "Tangent Black": {
    mode: "graphic",
    boundaryShape: "ellipse",
    bubbleCount: 26,
    minRadius: 44,
    maxRadius: 120,
    attraction: 84,
    repulsion: 30,
    mergeDistance: 64,
    boundaryStick: 30,
    carveBubbleCount: 0,
    patternType: "tangent"
  },
  "Soft Blob": {
    mode: "graphic",
    boundaryShape: "freeform",
    bubbleCount: 42,
    minRadius: 30,
    maxRadius: 86,
    sizeVariation: 80,
    attraction: 72,
    repulsion: 34,
    mergeDistance: 58,
    carveBubbleCount: 3,
    carveRadius: 44,
    edgeCarveOnly: false,
    patternType: "flow"
  },
  "Concave Table": {
    mode: "table",
    boundaryShape: "circle",
    bubbleCount: 32,
    minRadius: 40,
    maxRadius: 98,
    attraction: 64,
    repulsion: 56,
    mergeDistance: 42,
    boundaryStick: 74,
    carveBubbleCount: 10,
    carveRadius: 66,
    carveDepth: 82,
    edgeCarveOnly: true,
    patternType: "vein"
  },
  "Cellular Pattern": {
    mode: "pattern",
    patternType: "cellular",
    patternDensity: 72,
    patternScale: 56,
    patternStrokeWidth: 2,
    showPattern: true,
    bubbleCount: 48,
    mergeDistance: 36,
    carveBubbleCount: 6
  },
  "Stem Network": {
    mode: "pattern",
    boundaryShape: "capsule",
    bubbleCount: 44,
    minRadius: 22,
    maxRadius: 70,
    attraction: 88,
    repulsion: 24,
    mergeDistance: 72,
    boundaryStick: 42,
    patternType: "branch"
  },
  "Big Table Study": {
    mode: "table",
    boundaryShape: "capsule",
    widthMm: 900,
    depthMm: 620,
    bubbleCount: 54,
    minRadius: 34,
    maxRadius: 82,
    attraction: 58,
    repulsion: 62,
    mergeDistance: 34,
    boundaryStick: 84,
    carveBubbleCount: 8,
    carveRadius: 52,
    connectionPointCount: 8,
    connectionPointType: "universal"
  }
};

export const useFormLabStore = create<FormLabStore>()(
  persist(
    (set) => ({
      ...withGeneratedBubbles(defaultSnapshot),
      setMode: (mode) => set({ mode }),
      setBoundaryShape: (boundaryShape) =>
        set((state) => {
          const next = syncDimensions({ ...state, boundaryShape });
          return withGeneratedBubbles(next);
        }),
      updateParam: (key, value) =>
        set((state) => {
          const next = syncDimensions({ ...state, [key]: value });
          if (shouldRegenerateForParam(key)) return withGeneratedBubbles(next);
          return next;
        }),
      randomizeSeed: () =>
        set((state) => withGeneratedBubbles({ ...state, seed: Math.floor(1000 + Math.random() * 900000) })),
      resetForm: () => set(withGeneratedBubbles(defaultSnapshot)),
      regenerateBubbles: () => set((state) => withGeneratedBubbles(state)),
      updateBubble: (id, x, y) =>
        set((state) => ({
          bubbles: state.bubbles.map((bubble) =>
            bubble.id === id ? clampBubbleToBoundary({ ...bubble, x, y }, state.boundaryShape, state.padding / 1000) : bubble
          )
        })),
      updateCarveBubble: (id, x, y) =>
        set((state) => ({
          carveBubbles: state.carveBubbles.map((bubble) =>
            bubble.id === id ? clampBubbleToBoundary({ ...bubble, x, y }, state.boundaryShape, state.padding / 1000) : bubble
          )
        })),
      setTangentRule: (tangentRule) => set({ tangentRule }),
      setSymmetry: (symmetry) => set({ symmetry }),
      setConnectionPointCount: (connectionPointCount) => set({ connectionPointCount }),
      setConnectionPointType: (connectionPointType) => set({ connectionPointType }),
      setPatternType: (patternType) => set({ patternType }),
      applyPreset: (name) =>
        set((state) => {
          const next = syncDimensions({
            ...state,
            ...presets[name],
            seed: state.seed + 137
          });
          return withGeneratedBubbles(next);
        })
    }),
    {
      name: "form-lab-state",
      version: 2,
      migrate: (persisted) => {
        const state = persisted as Partial<FormLabSnapshot>;
        return withGeneratedBubbles(syncDimensions({ ...defaultSnapshot, ...state }));
      },
      partialize: (state) => {
        const {
          setMode,
          setBoundaryShape,
          updateParam,
          randomizeSeed,
          resetForm,
          regenerateBubbles,
          updateBubble,
          updateCarveBubble,
          setTangentRule,
          setSymmetry,
          setConnectionPointCount,
          setConnectionPointType,
          setPatternType,
          applyPreset,
          ...snapshot
        } = state;
        void setMode;
        void setBoundaryShape;
        void updateParam;
        void randomizeSeed;
        void resetForm;
        void regenerateBubbles;
        void updateBubble;
        void updateCarveBubble;
        void setTangentRule;
        void setSymmetry;
        void setConnectionPointCount;
        void setConnectionPointType;
        void setPatternType;
        void applyPreset;
        return snapshot;
      }
    }
  )
);
