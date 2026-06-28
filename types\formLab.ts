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

export type ControlPoint = {
  id: string;
  x: number;
  y: number;
  locked?: boolean;
};

export type NumericParam =
  | "widthMm"
  | "depthMm"
  | "seed"
  | "density"
  | "roundness"
  | "connection"
  | "organicNoise"
  | "concaveAmount"
  | "neckWidth"
  | "patternDensity"
  | "patternScale"
  | "patternStrokeWidth";

export type BooleanParam = "showGrid" | "showBoundary" | "showControlPoints" | "showPattern";

export type FormLabSnapshot = {
  mode: FormMode;
  boundaryShape: BoundaryShape;
  widthMm: number;
  depthMm: number;
  seed: number;
  density: number;
  roundness: number;
  connection: number;
  organicNoise: number;
  concaveAmount: number;
  neckWidth: number;
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
  showControlPoints: boolean;
  showPattern: boolean;
  controlPoints: ControlPoint[];
};

export type PresetName =
  | "Tangent Black"
  | "Soft Blob"
  | "Concave Table"
  | "Cellular Pattern"
  | "Stem Network"
  | "Big Table Study";
