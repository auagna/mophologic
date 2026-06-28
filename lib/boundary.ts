import type { Boundary, Bubble } from "@/types";

export const VIEWBOX = {
  width: 900,
  height: 620
};

export function boundaryPath(boundary: Boundary) {
  const { cx, cy, width, height, padding, shape } = boundary;
  const w = Math.max(1, width - padding * 2);
  const h = Math.max(1, height - padding * 2);
  const x = cx - w / 2;
  const y = cy - h / 2;

  if (shape === "circle") {
    const r = Math.min(w, h) / 2;
    return `M ${cx - r} ${cy} A ${r} ${r} 0 1 0 ${cx + r} ${cy} A ${r} ${r} 0 1 0 ${cx - r} ${cy} Z`;
  }

  if (shape === "ellipse") {
    return `M ${cx - w / 2} ${cy} A ${w / 2} ${h / 2} 0 1 0 ${cx + w / 2} ${cy} A ${w / 2} ${h / 2} 0 1 0 ${cx - w / 2} ${cy} Z`;
  }

  if (shape === "capsule") {
    const horizontal = w >= h;
    const r = Math.min(w, h) / 2;
    if (horizontal) {
      return `M ${x + r} ${y} H ${x + w - r} A ${r} ${r} 0 0 1 ${x + w - r} ${y + h} H ${x + r} A ${r} ${r} 0 0 1 ${x + r} ${y} Z`;
    }
    return `M ${x} ${y + r} A ${r} ${r} 0 0 1 ${x + w} ${y + r} V ${y + h - r} A ${r} ${r} 0 0 1 ${x} ${y + h - r} Z`;
  }

  return `M ${x} ${y} H ${x + w} V ${y + h} H ${x} Z`;
}

export function isInsideBoundary(x: number, y: number, r: number, boundary: Boundary) {
  const innerW = Math.max(1, boundary.width - boundary.padding * 2);
  const innerH = Math.max(1, boundary.height - boundary.padding * 2);
  const left = boundary.cx - innerW / 2;
  const right = boundary.cx + innerW / 2;
  const top = boundary.cy - innerH / 2;
  const bottom = boundary.cy + innerH / 2;

  if (boundary.shape === "rectangle") {
    return x - r >= left && x + r <= right && y - r >= top && y + r <= bottom;
  }

  if (boundary.shape === "circle") {
    const limit = Math.min(innerW, innerH) / 2 - r;
    return Math.hypot(x - boundary.cx, y - boundary.cy) <= limit;
  }

  if (boundary.shape === "ellipse") {
    const rx = Math.max(1, innerW / 2 - r);
    const ry = Math.max(1, innerH / 2 - r);
    const nx = (x - boundary.cx) / rx;
    const ny = (y - boundary.cy) / ry;
    return nx * nx + ny * ny <= 1;
  }

  return isInsideCapsule(x, y, r, boundary);
}

function isInsideCapsule(x: number, y: number, r: number, boundary: Boundary) {
  const innerW = Math.max(1, boundary.width - boundary.padding * 2);
  const innerH = Math.max(1, boundary.height - boundary.padding * 2);
  const horizontal = innerW >= innerH;
  const capRadius = Math.max(1, Math.min(innerW, innerH) / 2 - r);
  const halfLine = Math.max(0, (horizontal ? innerW : innerH) / 2 - Math.min(innerW, innerH) / 2);
  const ax = boundary.cx + (horizontal ? -halfLine : 0);
  const ay = boundary.cy + (horizontal ? 0 : -halfLine);
  const bx = boundary.cx + (horizontal ? halfLine : 0);
  const by = boundary.cy + (horizontal ? 0 : halfLine);
  const nearest = closestPointOnSegment(x, y, ax, ay, bx, by);
  return Math.hypot(x - nearest.x, y - nearest.y) <= capRadius;
}

export function clampBubbleToBoundary(bubble: Bubble, boundary: Boundary): Bubble {
  const next = { ...bubble };
  const innerW = Math.max(1, boundary.width - boundary.padding * 2);
  const innerH = Math.max(1, boundary.height - boundary.padding * 2);
  const left = boundary.cx - innerW / 2 + next.r;
  const right = boundary.cx + innerW / 2 - next.r;
  const top = boundary.cy - innerH / 2 + next.r;
  const bottom = boundary.cy + innerH / 2 - next.r;

  if (boundary.shape === "rectangle") {
    next.x = clamp(next.x, left, right);
    next.y = clamp(next.y, top, bottom);
    return next;
  }

  if (boundary.shape === "circle") {
    const limit = Math.max(1, Math.min(innerW, innerH) / 2 - next.r);
    const dx = next.x - boundary.cx;
    const dy = next.y - boundary.cy;
    const d = Math.max(0.0001, Math.hypot(dx, dy));
    if (d > limit) {
      next.x = boundary.cx + (dx / d) * limit;
      next.y = boundary.cy + (dy / d) * limit;
    }
    return next;
  }

  if (boundary.shape === "ellipse") {
    const rx = Math.max(1, innerW / 2 - next.r);
    const ry = Math.max(1, innerH / 2 - next.r);
    const dx = next.x - boundary.cx;
    const dy = next.y - boundary.cy;
    const q = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    if (q > 1) {
      const scale = 1 / Math.sqrt(q);
      next.x = boundary.cx + dx * scale;
      next.y = boundary.cy + dy * scale;
    }
    return next;
  }

  return clampBubbleToCapsule(next, boundary);
}

function clampBubbleToCapsule(bubble: Bubble, boundary: Boundary): Bubble {
  const next = { ...bubble };
  const innerW = Math.max(1, boundary.width - boundary.padding * 2);
  const innerH = Math.max(1, boundary.height - boundary.padding * 2);
  const horizontal = innerW >= innerH;
  const capRadius = Math.max(1, Math.min(innerW, innerH) / 2 - next.r);
  const halfLine = Math.max(0, (horizontal ? innerW : innerH) / 2 - Math.min(innerW, innerH) / 2);
  const ax = boundary.cx + (horizontal ? -halfLine : 0);
  const ay = boundary.cy + (horizontal ? 0 : -halfLine);
  const bx = boundary.cx + (horizontal ? halfLine : 0);
  const by = boundary.cy + (horizontal ? 0 : halfLine);
  const nearest = closestPointOnSegment(next.x, next.y, ax, ay, bx, by);
  const dx = next.x - nearest.x;
  const dy = next.y - nearest.y;
  const d = Math.max(0.0001, Math.hypot(dx, dy));
  if (d > capRadius) {
    next.x = nearest.x + (dx / d) * capRadius;
    next.y = nearest.y + (dy / d) * capRadius;
  }
  return next;
}

export function closestPointOnSegment(px: number, py: number, ax: number, ay: number, bx: number, by: number) {
  const dx = bx - ax;
  const dy = by - ay;
  const lengthSquared = dx * dx + dy * dy;
  if (lengthSquared <= 0.0001) return { x: ax, y: ay };
  const t = clamp(((px - ax) * dx + (py - ay) * dy) / lengthSquared, 0, 1);
  return { x: ax + dx * t, y: ay + dy * t };
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}
