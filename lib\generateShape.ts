import type { BoundaryShape, ControlPoint, FormLabSnapshot, TangentRule } from "@/types/formLab";
import { angleOf, boundaryRadiusAt, clampPointToBoundary, normalizeControlPoints, smoothClosedPath, toSvgPoint } from "./geometry";
import { clamp, randomRange, seededRandom } from "./random";

type ShapeOptions = Pick<
  FormLabSnapshot,
  | "boundaryShape"
  | "seed"
  | "density"
  | "roundness"
  | "connection"
  | "organicNoise"
  | "concaveAmount"
  | "neckWidth"
  | "symmetry"
  | "tangentRule"
  | "connectionPointCount"
>;

export function generateBoundaryPoints(options: ShapeOptions): ControlPoint[] {
  const rand = seededRandom(options.seed);
  const densityCount = Math.round(options.density / 8);
  const count = clamp(9 + densityCount + Math.round(options.connection / 25), 9, 24);
  const concave = options.concaveAmount / 100;
  const neck = 1 - options.neckWidth / 100;

  return Array.from({ length: count }, (_, index) => {
    const angleBase = (Math.PI * 2 * index) / count;
    const angleJitter = randomRange(rand, -0.12, 0.12) * (options.organicNoise / 100);
    const angle = angleBase + angleJitter;
    const boundary = boundaryRadiusAt(options.boundaryShape, angle);
    const wave = Math.sin(index * 1.9 + options.seed * 0.01);
    const noise = randomRange(rand, -0.16, 0.16) * (options.organicNoise / 100);
    const dent = concave < 0 && index % 3 === 1 ? concave * (0.15 + randomRange(rand, 0, 0.12)) : 0;
    const bulge = concave > 0 ? concave * (0.08 + Math.max(0, wave) * 0.08) : 0;
    const neckPull = index % 2 === 0 ? -neck * 0.035 * (options.connection / 100) : 0;
    const tangent = tangentModifier(options.tangentRule, index, count, angle);
    const radius = clamp(boundary * (0.79 + noise + dent + bulge + neckPull + tangent), boundary * 0.36, boundary * 0.98);
    const point = clampPointToBoundary(
      {
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius
      },
      options.boundaryShape
    );
    return {
      id: `p-${options.seed}-${index}`,
      x: point.x,
      y: point.y,
      locked: false
    };
  });
}

function tangentModifier(rule: TangentRule, index: number, count: number, angle: number) {
  if (rule === "circle") return 0.025 * Math.sin(angle * 2);
  if (rule === "capsule") return Math.abs(Math.cos(angle)) * 0.06;
  if (rule === "flat") return index % Math.max(2, Math.round(count / 4)) === 0 ? -0.09 : 0.02;
  if (rule === "point") return index % 4 === 0 ? 0.1 : -0.04;
  if (rule === "blob") return 0.07 * Math.sin(index * 2.41);
  if (rule === "stem") return Math.cos(angle - Math.PI * 0.2) > 0.88 ? 0.18 : -0.015;
  return 0;
}

export function generateOrganicShapePath(snapshot: ShapeOptions & { controlPoints: ControlPoint[] }) {
  let points = normalizeControlPoints(snapshot.controlPoints).map((point, index) => {
    if (snapshot.controlPoints[index]?.locked) return point;
    const angle = angleOf(point);
    const boundary = boundaryRadiusAt(snapshot.boundaryShape, angle);
    const radius = Math.hypot(point.x - 0.5, point.y - 0.5);
    const concave = snapshot.concaveAmount / 100;
    const bite = concave < 0 && index % 3 === 1 ? concave * boundary * 0.24 : 0;
    const swell = concave > 0 ? concave * boundary * 0.08 : 0;
    const adjusted = clamp(radius + bite + swell, boundary * 0.28, boundary * 0.98);
    return clampPointToBoundary(
      {
        x: 0.5 + Math.cos(angle) * adjusted,
        y: 0.5 + Math.sin(angle) * adjusted
      },
      snapshot.boundaryShape
    );
  });

  if (snapshot.symmetry === "x") {
    points = points.map((point, index) => (index % 2 === 0 ? point : { x: point.x, y: 1 - points[points.length - index - 1]?.y || point.y }));
  }
  if (snapshot.symmetry === "y") {
    points = points.map((point, index) => (index % 2 === 0 ? point : { x: 1 - points[points.length - index - 1]?.x || point.x, y: point.y }));
  }
  if (snapshot.symmetry === "radial") {
    const avg = points.reduce((sum, point) => sum + Math.hypot(point.x - 0.5, point.y - 0.5), 0) / points.length;
    points = points.map((point) => {
      const angle = angleOf(point);
      const radius = avg * (0.88 + 0.12 * Math.sin(angle * snapshot.connectionPointCount));
      return clampPointToBoundary({ x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius }, snapshot.boundaryShape);
    });
  }

  const svgPoints = points.map(toSvgPoint);
  return smoothClosedPath(svgPoints, snapshot.roundness / 100);
}

export function connectionPointsForShape(snapshot: Pick<FormLabSnapshot, "connectionPointCount" | "boundaryShape" | "connectionPointType">) {
  return Array.from({ length: snapshot.connectionPointCount }, (_, index) => {
    const angle = (Math.PI * 2 * index) / snapshot.connectionPointCount - Math.PI / 2;
    const radius = boundaryRadiusAt(snapshot.boundaryShape, angle) * 0.94;
    return {
      id: `c-${index}`,
      x: 0.5 + Math.cos(angle) * radius,
      y: 0.5 + Math.sin(angle) * radius,
      angle,
      type: snapshot.connectionPointType
    };
  });
}

export function shapeFingerprint(snapshot: Pick<FormLabSnapshot, "seed" | "density" | "roundness" | "connection" | "organicNoise" | "concaveAmount" | "neckWidth" | "tangentRule" | "boundaryShape">) {
  return [
    snapshot.seed,
    snapshot.density,
    snapshot.roundness,
    snapshot.connection,
    snapshot.organicNoise,
    snapshot.concaveAmount,
    snapshot.neckWidth,
    snapshot.tangentRule,
    snapshot.boundaryShape
  ].join(":");
}

export function isStrictBoundaryShape(shape: BoundaryShape) {
  return shape === "circle" || shape === "ellipse" || shape === "square";
}
