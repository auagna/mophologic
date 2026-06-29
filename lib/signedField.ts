import { isInsideBoundary } from "@/lib/boundary";
import type { Axis, Boundary, Bubble, SimParams } from "@/types";

type Point = {
  x: number;
  y: number;
};

type Corner = Point & {
  v: number;
};

type FieldOptions = {
  step?: number;
  threshold?: number;
};

export function fieldValueAt(x: number, y: number, bubbles: Bubble[]) {
  let value = 0;

  for (const bubble of bubbles) {
    const dx = x - bubble.x;
    const dy = y - bubble.y;
    const r2 = bubble.r * bubble.r;
    const distance2 = dx * dx + dy * dy;

    if (bubble.kind === "mass") {
      value += r2 / (distance2 + r2 * 0.2);
    } else {
      value -= (r2 * 1.55) / (distance2 + r2 * 0.28);
    }
  }

  return value;
}

export function fieldValueAtWithAxes(x: number, y: number, bubbles: Bubble[], axes: Axis[]) {
  let value = fieldValueAt(x, y, bubbles);

  for (const axis of axes) {
    const distance = distanceToSegment(x, y, axis.x1, axis.y1, axis.x2, axis.y2);
    const r = axis.thickness / 2;
    const r2 = r * r;
    value += (r2 * 1.25) / (distance * distance + r2 * 0.24);
  }

  return value;
}

export function buildSignedFieldPath(bubbles: Bubble[], axes: Axis[], boundary: Boundary, params: SimParams, options: FieldOptions = {}) {
  const step = options.step ?? 8;
  const threshold = options.threshold ?? Math.max(0.7, 1.22 - params.linkDistance * 0.0035 - params.mergeBlur * 0.012);
  const parts: string[] = [];

  for (let y = 0; y < 620; y += step) {
    for (let x = 0; x < 900; x += step) {
      const corners: [Corner, Corner, Corner, Corner] = [
        sampleCorner(x, y, bubbles, axes, boundary),
        sampleCorner(x + step, y, bubbles, axes, boundary),
        sampleCorner(x + step, y + step, bubbles, axes, boundary),
        sampleCorner(x, y + step, bubbles, axes, boundary)
      ];
      const polygons = cellPolygons(corners, threshold);
      for (const polygon of polygons) {
        parts.push(toPath(polygon));
      }
    }
  }

  return parts.join(" ");
}

function sampleCorner(x: number, y: number, bubbles: Bubble[], axes: Axis[], boundary: Boundary): Corner {
  if (!isInsideBoundary(x, y, 0, boundary)) {
    return { x, y, v: -999 };
  }
  return { x, y, v: fieldValueAtWithAxes(x, y, bubbles, axes) };
}

function cellPolygons(corners: [Corner, Corner, Corner, Corner], threshold: number): Point[][] {
  const [tl, tr, br, bl] = corners;
  const top = interpolate(tl, tr, threshold);
  const right = interpolate(tr, br, threshold);
  const bottom = interpolate(bl, br, threshold);
  const left = interpolate(tl, bl, threshold);
  const index =
    (tl.v >= threshold ? 1 : 0) |
    (tr.v >= threshold ? 2 : 0) |
    (br.v >= threshold ? 4 : 0) |
    (bl.v >= threshold ? 8 : 0);

  switch (index) {
    case 0:
      return [];
    case 1:
      return [[tl, top, left]];
    case 2:
      return [[tr, right, top]];
    case 3:
      return [[tl, tr, right, left]];
    case 4:
      return [[br, bottom, right]];
    case 5:
      return [
        [tl, top, left],
        [br, bottom, right]
      ];
    case 6:
      return [[tr, br, bottom, top]];
    case 7:
      return [[tl, tr, br, bottom, left]];
    case 8:
      return [[bl, left, bottom]];
    case 9:
      return [[tl, top, bottom, bl]];
    case 10:
      return [
        [tr, right, top],
        [bl, left, bottom]
      ];
    case 11:
      return [[tl, tr, right, bottom, bl]];
    case 12:
      return [[left, right, br, bl]];
    case 13:
      return [[tl, top, right, br, bl]];
    case 14:
      return [[top, tr, br, bl, left]];
    case 15:
      return [[tl, tr, br, bl]];
    default:
      return [];
  }
}

function interpolate(a: Corner, b: Corner, threshold: number): Point {
  const delta = b.v - a.v;
  const t = Math.abs(delta) < 0.0001 ? 0.5 : clamp01((threshold - a.v) / delta);
  return {
    x: a.x + (b.x - a.x) * t,
    y: a.y + (b.y - a.y) * t
  };
}

function toPath(points: Point[]) {
  if (points.length < 3) return "";
  const [first, ...rest] = points;
  return `M ${format(first.x)} ${format(first.y)} ${rest.map((point) => `L ${format(point.x)} ${format(point.y)}`).join(" ")} Z`;
}

function format(value: number) {
  return Number(value.toFixed(1));
}

function clamp01(value: number) {
  return Math.min(1, Math.max(0, value));
}

function distanceToSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) return Math.hypot(px - ax, py - ay);
  const t = clamp01(((px - ax) * dx + (py - ay) * dy) / lengthSquared);
  const x = ax + dx * t;
  const y = ay + dy * t;
  return Math.hypot(px - x, py - y);
}
