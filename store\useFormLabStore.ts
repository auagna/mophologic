"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { generateBoundaryPoints } from "@/lib/generateShape";
import type {
  BooleanParam,
  BoundaryShape,
  ConnectionPointCount,
  ConnectionPointType,
  ControlPoint,
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
  regenerateControlPoints: () => void;
  updateControlPoint: (id: string, x: number, y: number) => void;
  addControlPoint: (x: number, y: number) => void;
  deleteControlPoint: (id: string) => void;
  toggleLockPoint: (id: string) => void;
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
  boundaryShape: "roundedRect",
  widthMm: 700,
  depthMm: 700,
  seed: 2417,
  density: 58,
  roundness: 78,
  connection: 54,
  organicNoise: 48,
  concaveAmount: -34,
  neckWidth: 42,
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
  showControlPoints: true,
  showPattern: true,
  controlPoints: []
};

function withGeneratedPoints(snapshot: FormLabSnapshot): FormLabSnapshot {
  return {
    ...snapshot,
    controlPoints: generateBoundaryPoints(snapshot)
  };
}

export const presets: Record<PresetName, Partial<FormLabSnapshot>> = {
  "Tangent Black": {
    mode: "graphic",
    tangentRule: "circle",
    boundaryShape: "ellipse",
    concaveAmount: 16,
    density: 68,
    roundness: 82,
    organicNoise: 25,
    patternType: "tangent",
    patternDensity: 64
  },
  "Soft Blob": {
    mode: "graphic",
    tangentRule: "blob",
    boundaryShape: "freeform",
    concaveAmount: 28,
    density: 48,
    roundness: 94,
    organicNoise: 62,
    patternType: "flow"
  },
  "Concave Table": {
    mode: "table",
    boundaryShape: "roundedRect",
    concaveAmount: -58,
    density: 56,
    roundness: 86,
    organicNoise: 32,
    tangentRule: "flat",
    patternType: "vein"
  },
  "Cellular Pattern": {
    mode: "pattern",
    patternType: "cellular",
    patternDensity: 72,
    patternScale: 56,
    patternStrokeWidth: 2,
    showPattern: true,
    concaveAmount: -22
  },
  "Stem Network": {
    mode: "pattern",
    tangentRule: "stem",
    patternType: "branch",
    patternDensity: 70,
    organicNoise: 74,
    neckWidth: 18,
    concaveAmount: -18
  },
  "Big Table Study": {
    mode: "table",
    boundaryShape: "capsule",
    widthMm: 900,
    depthMm: 620,
    connectionPointCount: 8,
    connectionPointType: "universal",
    connection: 78,
    concaveAmount: -26,
    tangentRule: "capsule"
  }
};

export const useFormLabStore = create<FormLabStore>()(
  persist(
    (set, get) => ({
      ...withGeneratedPoints(defaultSnapshot),
      setMode: (mode) => set({ mode }),
      setBoundaryShape: (boundaryShape) =>
        set((state) => {
          const size = boundaryShape === "circle" || boundaryShape === "square" ? Math.max(state.widthMm, state.depthMm) : state.widthMm;
          const next = {
            ...state,
            boundaryShape,
            widthMm: size,
            depthMm: boundaryShape === "circle" || boundaryShape === "square" ? size : state.depthMm
          };
          return { ...next, controlPoints: generateBoundaryPoints(next) };
        }),
      updateParam: (key, value) =>
        set((state) => {
          const next = { ...state, [key]: value };
          if ((key === "widthMm" || key === "depthMm") && (state.boundaryShape === "circle" || state.boundaryShape === "square")) {
            next.widthMm = Number(value);
            next.depthMm = Number(value);
          }
          return next;
        }),
      randomizeSeed: () =>
        set((state) => {
          const next = { ...state, seed: Math.floor(1000 + Math.random() * 900000) };
          return { seed: next.seed, controlPoints: generateBoundaryPoints(next) };
        }),
      resetForm: () => set(withGeneratedPoints(defaultSnapshot)),
      regenerateControlPoints: () => set((state) => ({ controlPoints: generateBoundaryPoints(state) })),
      updateControlPoint: (id, x, y) =>
        set((state) => ({
          controlPoints: state.controlPoints.map((point) => (point.id === id && !point.locked ? { ...point, x, y } : point))
        })),
      addControlPoint: (x, y) =>
        set((state) => ({
          controlPoints: [
            ...state.controlPoints,
            {
              id: `p-user-${Date.now()}`,
              x,
              y,
              locked: false
            }
          ].sort((a, b) => Math.atan2(a.y - 0.5, a.x - 0.5) - Math.atan2(b.y - 0.5, b.x - 0.5))
        })),
      deleteControlPoint: (id) =>
        set((state) => ({
          controlPoints: state.controlPoints.length <= 4 ? state.controlPoints : state.controlPoints.filter((point) => point.id !== id)
        })),
      toggleLockPoint: (id) =>
        set((state) => ({
          controlPoints: state.controlPoints.map((point) => (point.id === id ? { ...point, locked: !point.locked } : point))
        })),
      setTangentRule: (tangentRule) => set({ tangentRule }),
      setSymmetry: (symmetry) => set({ symmetry }),
      setConnectionPointCount: (connectionPointCount) => set({ connectionPointCount }),
      setConnectionPointType: (connectionPointType) => set({ connectionPointType }),
      setPatternType: (patternType) => set({ patternType }),
      applyPreset: (name) =>
        set((state) => {
          const next = {
            ...state,
            ...presets[name],
            seed: state.seed + 137
          };
          if (next.boundaryShape === "circle" || next.boundaryShape === "square") {
            const size = Math.max(next.widthMm, next.depthMm);
            next.widthMm = size;
            next.depthMm = size;
          }
          return { ...next, controlPoints: generateBoundaryPoints(next) };
        })
    }),
    {
      name: "form-lab-state",
      partialize: (state) => {
        const {
          setMode,
          setBoundaryShape,
          updateParam,
          randomizeSeed,
          resetForm,
          regenerateControlPoints,
          updateControlPoint,
          addControlPoint,
          deleteControlPoint,
          toggleLockPoint,
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
        void regenerateControlPoints;
        void updateControlPoint;
        void addControlPoint;
        void deleteControlPoint;
        void toggleLockPoint;
        void setTangentRule;
        void setSymmetry;
        void setConnectionPointCount;
        void setConnectionPointType;
        void setPatternType;
        void applyPreset;
        return snapshot;
      },
      version: 1
    }
  )
);

export function currentSnapshot(): FormLabSnapshot {
  const state = useFormLabStore.getState();
  return {
    mode: state.mode,
    boundaryShape: state.boundaryShape,
    widthMm: state.widthMm,
    depthMm: state.depthMm,
    seed: state.seed,
    density: state.density,
    roundness: state.roundness,
    connection: state.connection,
    organicNoise: state.organicNoise,
    concaveAmount: state.concaveAmount,
    neckWidth: state.neckWidth,
    symmetry: state.symmetry,
    tangentRule: state.tangentRule,
    cornerRule: state.cornerRule,
    connectionPointCount: state.connectionPointCount,
    connectionPointType: state.connectionPointType,
    patternType: state.patternType,
    patternDensity: state.patternDensity,
    patternScale: state.patternScale,
    patternStrokeWidth: state.patternStrokeWidth,
    showGrid: state.showGrid,
    showBoundary: state.showBoundary,
    showControlPoints: state.showControlPoints,
    showPattern: state.showPattern,
    controlPoints: state.controlPoints
  };
}
