export type Bubble = {
  id: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  r: number;
  kind: "mass" | "carve";
  fixed?: boolean;
};

export type Axis = {
  id: string;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  thickness: number;
  kind: "mass";
};

export type Boundary = {
  shape: "circle" | "ellipse" | "rectangle" | "capsule";
  cx: number;
  cy: number;
  width: number;
  height: number;
  padding: number;
};

export type SimParams = {
  seed: number;
  generationMode: "bubble" | "axis" | "hybrid";
  bubbleCount: number;
  minRadius: number;
  maxRadius: number;
  carveCount: number;
  carveMinRadius: number;
  carveMaxRadius: number;
  axisCount: number;
  axisLength: number;
  axisAngle: number;
  axisThickness: number;
  attractionStrength: number;
  repulsionStrength: number;
  damping: number;
  linkDistance: number;
  mergeBlur: number;
  boundaryForce: number;
};

export type PatternMode = "bubble" | "network" | "metaball" | "cellular" | "ring" | "carved";
