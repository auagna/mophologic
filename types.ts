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
  bubbleCount: number;
  minRadius: number;
  maxRadius: number;
  carveCount: number;
  attractionStrength: number;
  repulsionStrength: number;
  damping: number;
  linkDistance: number;
  mergeBlur: number;
  boundaryForce: number;
};

export type PatternMode = "bubble" | "network" | "metaball" | "cellular" | "ring" | "carved";
