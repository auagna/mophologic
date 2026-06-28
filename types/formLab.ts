export type FormMode = "graphic" | "table" | "pattern";

export type BoundaryShape =
  | "rectangle"
  | "square"
  | "circle"
  | "ellipse"
  | "capsule"
  | "roundedRect"
  | "freeform";

export type Symmetry = "none" | "x" | "y" | "radial";

export type TangentRule = "circle" | "capsule" | "flat" | "point" | "blob" | "stem";

export type CornerRule = "uniform" | "random" | "outerOnly";

export type ConnectionPointCount = 4 | 6 | 8 | 12;

export type ConnectionPointType = "male" | "female" | "universal";

export type PatternType = "cellular" | "vein" | "branch" | "dots" | "flow" | "tangent";

export type Bubble = {
  id: string;
  x: number;
  y: number;
  r: number;
  type: "mass" | "carve";
  stuck?: boolean;
  locked?: boolean;
};

export type Boundary = {
  shape: "rectangle" | "square" | "circle" | "ellipse" | "capsule" | "roundedRect";
  width: number;
  height: number;
  padding: number;
};

export type NumericParam =
  | "widthMm"
  | "depthMm"
  | "padding"
  | "seed"
  | "bubbleCount"
  | "minRadius"
  | "maxRadius"
  | "sizeVariation"
  | "attraction"
  | "repulsion"
  | "mergeDistance"
  | "boundaryStick"
  | "carveBubbleCount"
  | "carveRadius"
  | "carveDepth"
  | "patternDensity"
  | "patternScale"
  | "patternStrokeWidth";

export type BooleanParam = "showGrid" | "showBoundary" | "showBubbles" | "showPattern" | "edgeCarveOnly";

export type FormLabSnapshot = {
  mode: FormMode;
  boundaryShape: BoundaryShape;
  widthMm: number;
  depthMm: number;
  padding: number;
  seed: number;
  bubbleCount: number;
  minRadius: number;
  maxRadius: number;
  sizeVariation: number;
  attraction: number;
  repulsion: number;
  mergeDistance: number;
  boundaryStick: number;
  carveBubbleCount: number;
  carveRadius: number;
  carveDepth: number;
  edgeCarveOnly: boolean;
  symmetry: Symmetry;
  tangentRule: TangentRule;
  cornerRule: CornerRule;
  connectionPointCount: ConnectionPointCount;
  connectionPointType: ConnectionPointType;
  patternType: PatternType;
  patternDensity: number;
  patternScale: number;
  patternStrokeWidth: number;
  showGrid: boolean;
  showBoundary: boolean;
  showBubbles: boolean;
  showPattern: boolean;
  bubbles: Bubble[];
  carveBubbles: Bubble[];
};

export type PresetName =
  | "Tangent Black"
  | "Soft Blob"
  | "Concave Table"
  | "Cellular Pattern"
  | "Stem Network"
  | "Big Table Study";
