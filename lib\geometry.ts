import type { BoundaryShape, ControlPoint } from "@/types/formLab";
import { clamp } from "./random";

export type Point = { x: number; y: number };

export const VIEWBOX = {
  width: 1000,
  height: 680,
  cx: 500,
  cy: 340,
  rx: 390,
  ry: 250
};

export function toSvgPoint(point: Point): Point {
  return {
    x: point.x * VIEWBOX.width,
    y: point.y * VIEWBOX.height
  };
}

export function fromSvgPoint(point: Point): Point {
  return {
    x: point.x / VIEWBOX.width,
    y: point.y / VIEWBOX.height
  };
}

export function distance(a: Point, b: Point) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function angleOf(point: Point) {
  return Math.atan2(point.y - 0.5, point.x - 0.5);
}

export function boundaryRadiusAt(shape: BoundaryShape, angle: number) {
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const rectRx = 0.39;
  const rectRy = 0.34;

  if (shape === "circle") return 0.33;
  if (shape === "ellipse") return 1 / Math.sqrt((cos * cos) / (0.39 * 0.39) + (sin * sin) / (0.28 * 0.28));
  if (shape === "square") return 0.32 / Math.max(Math.abs(cos), Math.abs(sin));
  if (shape === "capsule") {
    return 1 / Math.sqrt((cos * cos) / (0.42 * 0.42) + (sin * sin) / (0.24 * 0.24));
  }
  if (shape === "roundedRect") {
    const base = Math.min(rectRx / Math.max(Math.abs(cos), 0.001), rectRy / Math.max(Math.abs(sin), 0.001));
    return base * (0.92 + 0.08 * Math.cos(4 * angle));
  }
  if (shape === "freeform") {
    return 0.33 * (1 + 0.1 * Math.sin(3 * angle) - 0.08 * Math.cos(5 * angle));
  }
  return Math.min(rectRx / Math.max(Math.abs(cos), 0.001), rectRy / Math.max(Math.abs(sin), 0.001));
}

export function clampPointToBoundary(point: Point, shape: BoundaryShape): Point {
  const dx = point.x - 0.5;
  const dy = point.y - 0.5;
  const angle = Math.atan2(dy, dx);
  const radius = Math.hypot(dx, dy);
  const maxRadius = boundaryRadiusAt(shape, angle) * 0.97;

  if (radius <= maxRadius) {
    return { x: clamp(point.x, 0.06, 0.94), y: clamp(point.y, 0.08, 0.92) };
  }

  const scale = maxRadius / Math.max(radius, 0.0001);
  return {
    x: clamp(0.5 + dx * scale, 0.06, 0.94),
    y: clamp(0.5 + dy * scale, 0.08, 0.92)
  };
}

export function boundaryPath(shape: BoundaryShape) {
  const w = VIEWBOX.width;
  const h = VIEWBOX.height;
  const cx = VIEWBOX.cx;
  const cy = VIEWBOX.cy;
  const rx = VIEWBOX.rx;
  const ry = VIEWBOX.ry;

  if (shape === "circle") {
    const r = Math.min(rx, ry);
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }
  if (shape === "ellipse") {
    return `M ${cx - rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx + rx} ${cy} A ${rx} ${ry} 0 1 0 ${cx - rx} ${cy} Z`;
  }
  if (shape === "square") {
    const size = Math.min(rx * 2, ry * 2);
    const x = cx - size / 2;
    const y = cy - size / 2;
    return `M ${x} ${y} H ${x + size} V ${y + size} H ${x} Z`;
  }
  if (shape === "capsule") {
    const x = cx - rx;
    const y = cy - ry;
    const r = ry;
    return `M ${x + r} ${y} H ${cx + rx - r} A ${r} ${r} 0 0 1 ${cx + rx - r} ${cy + ry} H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
  }
  if (shape === "roundedRect") {
    const x = cx - rx;
    const y = cy - ry;
    const r = 72;
    return `M ${x + r} ${y} H ${cx + rx - r} Q ${cx + rx} ${y} ${cx + rx} ${y + r} V ${cy + ry - r} Q ${cx + rx} ${cy + ry} ${cx + rx - r} ${cy + ry} H ${x + r} Q ${x} ${cy + ry} ${x} ${cy + ry - r} V ${y + r} Q ${x} ${y} ${x + r} ${y} Z`;
  }

  if (shape === "freeform") {
    const points = Array.from({ length: 18 }, (_, index) => {
      const a = (Math.PI * 2 * index) / 18;
      const r = boundaryRadiusAt(shape, a);
      return toSvgPoint({ x: 0.5 + Math.cos(a) * r, y: 0.5 + Math.sin(a) * r });
    });
    return smoothClosedPath(points, 0.7);
  }

  const x = cx - rx;
  const y = cy - ry;
  return `M ${x} ${y} H ${cx + rx} V ${cy + ry} H ${x} Z`;
}

export function smoothClosedPath(points: Point[], roundness: number) {
  if (points.length < 3) return "";
  const amount = clamp(roundness, 0, 1);
  if (amount < 0.05) {
    return `M ${points.map((point) => `${point.x} ${point.y}`).join(" L ")} Z`;
  }

  const commands: string[] = [];
  for (let index = 0; index < points.length; index += 1) {
    const current = points[index];
    const next = points[(index + 1) % points.length];
    const mid = {
      x: current.x + (next.x - current.x) * (0.5 + amount * 0.12),
      y: current.y + (next.y - current.y) * (0.5 + amount * 0.12)
    };
    if (index === 0) commands.push(`M ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`);
    commands.push(`Q ${next.x.toFixed(2)} ${next.y.toFixed(2)} ${mid.x.toFixed(2)} ${mid.y.toFixed(2)}`);
  }
  commands.push("Z");
  return commands.join(" ");
}

export function normalizeControlPoints(points: ControlPoint[]): Point[] {
  return points.map((point) => ({ x: point.x, y: point.y }));
}
