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
  selectAxisNode: (id: string | null) => void;
  moveBubble: (id: string, x: number, y: number) => void;
  moveAxisNode: (axisId: string, role: "start" | "end", x: number, y: number) => void;
  translateAxis: (axisId: string, dx: number, dy: number) => void;
  toggleFixed: (id: string) => void;
  toggleSelectedFixed: () => void;
  snapAllToGrid: () => void;
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

function normalizeParams(params: SimParams): SimParams {
  return {
    ...initialParams,
    ...params,
    carveMinRadius: Math.min(params.carveMinRadius ?? initialParams.carveMinRadius, params.carveMaxRadius ?? initialParams.carveMaxRadius),
    carveMaxRadius: Math.max(params.carveMaxRadius ?? initialParams.carveMaxRadius, params.carveMinRadius ?? initialParams.carveMinRadius),
    minRadius: Math.min(params.minRadius ?? initialParams.minRadius, params.maxRadius ?? initialParams.maxRadius),
    maxRadius: Math.max(params.maxRadius ?? initialParams.maxRadius, params.minRadius ?? initialParams.minRadius),
    surfaceMode: params.surfaceMode === "separate" ? "separate" : "merge",
    bubbleFillColor: normalizeColor(params.bubbleFillColor, initialParams.bubbleFillColor),
    axisFillColor: normalizeColor(params.axisFillColor, initialParams.axisFillColor),
    showGrid: params.showGrid ?? initialParams.showGrid,
    snapToGrid: params.snapToGrid ?? initialParams.snapToGrid,
    gridColumns: clampInteger(params.gridColumns, 1, 24, initialParams.gridColumns),
    gridRows: clampInteger(params.gridRows, 1, 24, initialParams.gridRows),
    moduleColumns: clampInteger(params.moduleColumns, 1, 8, initialParams.moduleColumns),
    moduleRows: clampInteger(params.moduleRows, 1, 6, initialParams.moduleRows)
  };
}

function normalizeColor(value: string | undefined, fallback: string) {
  return /^#[0-9a-fA-F]{6}$/.test(value ?? "") ? value ?? fallback : fallback;
}

function clampInteger(value: number | undefined, min: number, max: number, fallback: number) {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}

function shouldRegenerateForParam(key: keyof SimParams) {
  return key === "seed" || key === "generationMode";
}

function shouldReconcileGeometryForParam(key: keyof SimParams) {
  return [
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

function reconcileBubbles(current: Bubble[], params: SimParams, previousParams: SimParams, boundary: Boundary) {
  const generated = generateBubbles(params, boundary);
  const desiredMassCount = params.generationMode === "axis" ? 0 : params.bubbleCount;
  const desiredCarveCount = params.carveCount;
  const currentMass = current.filter((bubble) => bubble.kind === "mass");
  const currentCarve = current.filter((bubble) => bubble.kind === "carve");
  const generatedMass = generated.filter((bubble) => bubble.kind === "mass");
  const generatedCarve = generated.filter((bubble) => bubble.kind === "carve");
  const mass = reconcileBubbleKind(currentMass, generatedMass, desiredMassCount, params, previousParams, boundary, "mass");
  const carve = reconcileBubbleKind(currentCarve, generatedCarve, desiredCarveCount, params, previousParams, boundary, "carve");
  return [...mass, ...carve];
}

function reconcileBubbleKind(current: Bubble[], generated: Bubble[], count: number, params: SimParams, previousParams: SimParams, boundary: Boundary, kind: Bubble["kind"]) {
  const kept = current.slice(0, count).map((bubble) => resizeBubble(bubble, params, previousParams, boundary));
  if (kept.length >= count) return kept;
  return [...kept, ...generated.slice(kept.length, count).map((bubble) => clampBubbleToRadiusRange({ ...bubble, kind }, params, boundary))];
}

function resizeBubble(bubble: Bubble, params: SimParams, previousParams: SimParams, boundary: Boundary) {
  const next = radiusRangeForKind(bubble.kind, params);
  const previous = radiusRangeForKind(bubble.kind, previousParams);
  const t = previous.max === previous.min ? 0.5 : Math.min(1, Math.max(0, (bubble.r - previous.min) / (previous.max - previous.min)));
  return clampBubbleToBoundary({ ...bubble, r: next.min + (next.max - next.min) * t, vx: 0, vy: 0 }, boundary);
}

function clampBubbleToRadiusRange(bubble: Bubble, params: SimParams, boundary: Boundary) {
  const range = radiusRangeForKind(bubble.kind, params);
  return clampBubbleToBoundary({ ...bubble, r: Math.min(range.max, Math.max(range.min, bubble.r)), vx: 0, vy: 0 }, boundary);
}

function radiusRangeForKind(kind: Bubble["kind"], params: SimParams) {
  return kind === "mass"
    ? { min: params.minRadius, max: params.maxRadius }
    : { min: params.carveMinRadius, max: params.carveMaxRadius };
}

function reconcileAxes(current: Axis[], params: SimParams, previousParams: SimParams, boundary: Boundary) {
  if (params.generationMode === "bubble") return [];

  const generated = generateAxes(params, boundary);
  const desiredCount = params.axisCount;
  const kept = current.slice(0, desiredCount).map((axis) => resizeAxis(axis, params, previousParams, boundary));
  if (kept.length >= desiredCount) return kept;
  return [...kept, ...generated.slice(kept.length, desiredCount)];
}

function resizeAxis(axis: Axis, params: SimParams, previousParams: SimParams, boundary: Boundary) {
  const centerX = (axis.x1 + axis.x2) / 2;
  const centerY = (axis.y1 + axis.y2) / 2;
  const lengthRatio = safeRatio(params.axisLength, previousParams.axisLength);
  const thicknessRatio = safeRatio(params.axisThickness, previousParams.axisThickness);
  const angleDelta = ((params.axisAngle - previousParams.axisAngle) * Math.PI) / 180;
  const halfX = ((axis.x2 - axis.x1) / 2) * lengthRatio;
  const halfY = ((axis.y2 - axis.y1) / 2) * lengthRatio;
  const dx = Math.cos(angleDelta) * halfX - Math.sin(angleDelta) * halfY;
  const dy = Math.sin(angleDelta) * halfX + Math.cos(angleDelta) * halfY;
  const thickness = Math.max(1, axis.thickness * thicknessRatio);
  const r = thickness / 2;
  const start = clampBubbleToBoundary({ id: `${axis.id}-start`, x: centerX - dx, y: centerY - dy, vx: 0, vy: 0, r, kind: "mass" }, boundary);
  const end = clampBubbleToBoundary({ id: `${axis.id}-end`, x: centerX + dx, y: centerY + dy, vx: 0, vy: 0, r, kind: "mass" }, boundary);
  return { ...axis, x1: start.x, y1: start.y, x2: end.x, y2: end.y, thickness };
}

function safeRatio(next: number, previous: number) {
  if (!Number.isFinite(next) || !Number.isFinite(previous) || previous === 0) return 1;
  return next / previous;
}

function axisIdFromSelection(id: string | null, axes: Axis[]) {
  if (!id) return null;
  if (axes.some((axis) => axis.id === id)) return id;
  return axes.find((axis) => id === `${axis.id}-start` || id === `${axis.id}-end`)?.id ?? null;
}

function gridFrame(boundary: Boundary) {
  const width = Math.max(1, boundary.width - boundary.padding * 2);
  const height = Math.max(1, boundary.height - boundary.padding * 2);
  return {
    left: boundary.cx - width / 2,
    top: boundary.cy - height / 2,
    width,
    height
  };
}

function snapPointToGrid(x: number, y: number, params: SimParams, boundary: Boundary) {
  const frame = gridFrame(boundary);
  const columns = Math.max(1, params.gridColumns);
  const rows = Math.max(1, params.gridRows);
  const cellW = frame.width / columns;
  const cellH = frame.height / rows;
  return {
    x: frame.left + Math.round((x - frame.left) / cellW) * cellW,
    y: frame.top + Math.round((y - frame.top) / cellH) * cellH
  };
}

function maybeSnapPoint(x: number, y: number, params: SimParams, boundary: Boundary) {
  return params.snapToGrid ? snapPointToGrid(x, y, params, boundary) : { x, y };
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
          if (shouldRegenerateForParam(key)) {
            const generated = regenerate(params, state.boundary);
            return { params: generated.params, bubbles: generated.bubbles, axes: generated.axes, selectedId: null };
          }
          if (!shouldReconcileGeometryForParam(key)) {
            return { params };
          }
          return {
            params,
            bubbles: reconcileBubbles(state.bubbles, params, state.params, state.boundary),
            axes: reconcileAxes(state.axes, params, state.params, state.boundary)
          };
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
      selectAxisNode: (selectedId) => set({ selectedId }),
      moveBubble: (id, x, y) =>
        set((state) => ({
          bubbles: state.bubbles.map((bubble) => {
            if (bubble.id !== id) return bubble;
            if (bubble.fixed) return { ...bubble, vx: 0, vy: 0 };
            const point = maybeSnapPoint(x, y, state.params, state.boundary);
            return clampBubbleToBoundary({ ...bubble, x: point.x, y: point.y, vx: 0, vy: 0 }, state.boundary);
          })
        })),
      moveAxisNode: (axisId, role, x, y) =>
        set((state) => ({
          axes: state.axes.map((axis) => {
            if (axis.id !== axisId) return axis;
            if (axis.fixed) return axis;
            const point = maybeSnapPoint(x, y, state.params, state.boundary);
            const r = axis.thickness / 2;
            const clamped = clampBubbleToBoundary(
              {
                id: `${axis.id}-${role}`,
                x: point.x,
                y: point.y,
                vx: 0,
                vy: 0,
                r,
                kind: "mass"
              },
              state.boundary
            );
            return role === "start" ? { ...axis, x1: clamped.x, y1: clamped.y } : { ...axis, x2: clamped.x, y2: clamped.y };
          })
        })),
      translateAxis: (axisId, dx, dy) =>
        set((state) => ({
          axes: state.axes.map((axis) => {
            if (axis.id !== axisId) return axis;
            if (axis.fixed) return axis;
            const r = axis.thickness / 2;
            let x1 = axis.x1 + dx;
            let y1 = axis.y1 + dy;
            let x2 = axis.x2 + dx;
            let y2 = axis.y2 + dy;
            if (state.params.snapToGrid) {
              const center = snapPointToGrid((x1 + x2) / 2, (y1 + y2) / 2, state.params, state.boundary);
              const currentCenterX = (x1 + x2) / 2;
              const currentCenterY = (y1 + y2) / 2;
              x1 += center.x - currentCenterX;
              y1 += center.y - currentCenterY;
              x2 += center.x - currentCenterX;
              y2 += center.y - currentCenterY;
            }
            const start = clampBubbleToBoundary({ id: `${axis.id}-start`, x: x1, y: y1, vx: 0, vy: 0, r, kind: "mass" }, state.boundary);
            const end = clampBubbleToBoundary({ id: `${axis.id}-end`, x: x2, y: y2, vx: 0, vy: 0, r, kind: "mass" }, state.boundary);
            return { ...axis, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
          })
        })),
      toggleFixed: (id) =>
        set((state) => {
          const axisId = axisIdFromSelection(id, state.axes);
          return {
            bubbles: state.bubbles.map((bubble) => (bubble.id === id ? { ...bubble, fixed: !bubble.fixed, vx: 0, vy: 0 } : bubble)),
            axes: state.axes.map((axis) => (axis.id === axisId ? { ...axis, fixed: !axis.fixed } : axis))
          };
        }),
      toggleSelectedFixed: () =>
        set((state) => {
          if (!state.selectedId) return state;
          const axisId = axisIdFromSelection(state.selectedId, state.axes);
          return {
            bubbles: state.bubbles.map((bubble) => (bubble.id === state.selectedId ? { ...bubble, fixed: !bubble.fixed, vx: 0, vy: 0 } : bubble)),
            axes: state.axes.map((axis) => (axis.id === axisId ? { ...axis, fixed: !axis.fixed } : axis))
          };
        }),
      snapAllToGrid: () =>
        set((state) => ({
          bubbles: state.bubbles.map((bubble) => {
            if (bubble.fixed) return { ...bubble, vx: 0, vy: 0 };
            const point = snapPointToGrid(bubble.x, bubble.y, state.params, state.boundary);
            return clampBubbleToBoundary({ ...bubble, x: point.x, y: point.y, vx: 0, vy: 0 }, state.boundary);
          }),
          axes: state.axes.map((axis) => {
            if (axis.fixed) return axis;
            const r = axis.thickness / 2;
            const startPoint = snapPointToGrid(axis.x1, axis.y1, state.params, state.boundary);
            const endPoint = snapPointToGrid(axis.x2, axis.y2, state.params, state.boundary);
            const start = clampBubbleToBoundary({ id: `${axis.id}-start`, x: startPoint.x, y: startPoint.y, vx: 0, vy: 0, r, kind: "mass" }, state.boundary);
            const end = clampBubbleToBoundary({ id: `${axis.id}-end`, x: endPoint.x, y: endPoint.y, vx: 0, vy: 0, r, kind: "mass" }, state.boundary);
            return { ...axis, x1: start.x, y1: start.y, x2: end.x, y2: end.y };
          })
        })),
      addBubble: (kind, x, y) =>
        set((state) => {
          const r = kind === "mass" ? (state.params.minRadius + state.params.maxRadius) / 2 : (state.params.carveMinRadius + state.params.carveMaxRadius) / 2;
          const point = maybeSnapPoint(x, y, state.params, state.boundary);
          if (!isInsideBoundary(point.x, point.y, r, state.boundary)) return state;
          const bubble: Bubble = {
            id: `${kind}-${Date.now()}-${Math.round(x)}-${Math.round(y)}`,
            x: point.x,
            y: point.y,
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
