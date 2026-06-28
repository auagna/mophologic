import type { Boundary, Bubble, BoundaryShape, FormLabSnapshot } from "@/types/formLab";
import { boundaryPath, boundaryRadiusAt, smoothClosedPath, toSvgPoint } from "./geometry";
import { clamp, randomRange, seededRandom } from "./random";

type BubbleOptions = Pick<
  FormLabSnapshot,
  | "boundaryShape"
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
  | "edgeCarveOnly"
>;

export type BubblePhysicsConstants = {
  packingFactor: number;
  mergeDistance: number;
  attractionStrength: number;
  repulsionStrength: number;
  boundaryStickiness: number;
  carveRepulsionStrength: number;
};

export type BubbleShapeResult = {
  boundary: Boundary;
  boundaryPath: string;
  shapePath: string;
  massBubbles: Bubble[];
  carveBubbles: Bubble[];
};

const MAX_GENERATION_ATTEMPTS = 900;
const RELAXATION_ITERATIONS = 34;
const NORMALIZED_MM = 1000;
const MIN_RADIUS = 0.012;
const MAX_RADIUS = 0.18;

export function createBoundary(options: Pick<FormLabSnapshot, "boundaryShape" | "widthMm" | "depthMm" | "padding">): Boundary {
  const shape = normalizeBoundaryShape(options.boundaryShape);
  const maxMm = Math.max(options.widthMm, options.depthMm, 1);
  const widthRatio = clamp(options.widthMm / maxMm, 0.42, 1);
  const heightRatio = clamp(options.depthMm / maxMm, 0.42, 1);

  if (shape === "circle") {
    return { shape, width: 0.66, height: 0.66, padding: options.padding / NORMALIZED_MM };
  }
  if (shape === "square") {
    return { shape, width: 0.64, height: 0.64, padding: options.padding / NORMALIZED_MM };
  }
  if (shape === "ellipse") {
    return { shape, width: 0.78 * widthRatio, height: 0.56 * heightRatio, padding: options.padding / NORMALIZED_MM };
  }
  if (shape === "capsule") {
    return { shape, width: 0.84 * widthRatio, height: 0.48 * heightRatio, padding: options.padding / NORMALIZED_MM };
  }
  return { shape, width: 0.78 * widthRatio, height: 0.68 * heightRatio, padding: options.padding / NORMALIZED_MM };
}

function normalizeBoundaryShape(shape: BoundaryShape): Boundary["shape"] {
  if (shape === "freeform") return "roundedRect";
  return shape;
}

export function physicsConstants(options: Pick<FormLabSnapshot, "attraction" | "repulsion" | "mergeDistance" | "boundaryStick">): BubblePhysicsConstants {
  return {
    packingFactor: 0.72 + (options.repulsion / 100) * 0.42,
    mergeDistance: options.mergeDistance / NORMALIZED_MM,
    attractionStrength: 0.002 + (options.attraction / 100) * 0.028,
    repulsionStrength: 0.04 + (options.repulsion / 100) * 0.72,
    boundaryStickiness: options.boundaryStick / 100,
    carveRepulsionStrength: 0.012 + (options.repulsion / 100) * 0.045
  };
}

export function isInsideBoundary(x: number, y: number, r: number, boundary: Boundary): boolean {
  const halfW = boundary.width / 2 - boundary.padding;
  const halfH = boundary.height / 2 - boundary.padding;
  const left = 0.5 - halfW;
  const right = 0.5 + halfW;
  const top = 0.5 - halfH;
  const bottom = 0.5 + halfH;
  const dx = x - 0.5;
  const dy = y - 0.5;

  if (r <= 0 || halfW <= r || halfH <= r) return false;

  if (boundary.shape === "circle") {
    return Math.hypot(dx, dy) + r <= Math.min(halfW, halfH);
  }

  if (boundary.shape === "ellipse") {
    const rx = halfW - r;
    const ry = halfH - r;
    return rx > 0 && ry > 0 && (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry) <= 1;
  }

  if (boundary.shape === "rectangle" || boundary.shape === "square") {
    return x - r >= left && x + r <= right && y - r >= top && y + r <= bottom;
  }

  if (boundary.shape === "capsule") {
    const capRadius = halfH;
    const capLeft = left + capRadius;
    const capRight = right - capRadius;
    if (x >= capLeft && x <= capRight) return Math.abs(dy) + r <= capRadius;
    const capCenterX = x < capLeft ? capLeft : capRight;
    return Math.hypot(x - capCenterX, dy) + r <= capRadius;
  }

  const cornerRadius = Math.min(halfW, halfH) * 0.34;
  const innerLeft = left + cornerRadius;
  const innerRight = right - cornerRadius;
  const innerTop = top + cornerRadius;
  const innerBottom = bottom - cornerRadius;
  if (x >= innerLeft && x <= innerRight && y - r >= top && y + r <= bottom) return true;
  if (y >= innerTop && y <= innerBottom && x - r >= left && x + r <= right) return true;
  const cornerX = x < innerLeft ? innerLeft : innerRight;
  const cornerY = y < innerTop ? innerTop : innerBottom;
  return Math.hypot(x - cornerX, y - cornerY) + r <= cornerRadius;
}

export function generateBubbles(options: BubbleOptions): { bubbles: Bubble[]; carveBubbles: Bubble[] } {
  const boundary = createBoundary(options);
  const rand = seededRandom(options.seed);
  const minRadius = clamp(options.minRadius / NORMALIZED_MM, MIN_RADIUS, MAX_RADIUS);
  const maxRadius = clamp(options.maxRadius / NORMALIZED_MM, minRadius, MAX_RADIUS);
  const variation = options.sizeVariation / 100;

  const massBubbles: Bubble[] = [];
  for (let index = 0; index < options.bubbleCount; index += 1) {
    const bubble = createBubbleByRejection({
      id: `m-${options.seed}-${index}`,
      type: "mass",
      minRadius,
      maxRadius,
      variation,
      boundary,
      rand,
      edgeOnly: false
    });
    if (bubble) massBubbles.push({ ...bubble, stuck: rand() < options.boundaryStick / 125 });
  }

  const relaxed = relaxBubbles(massBubbles, [], boundary, RELAXATION_ITERATIONS, physicsConstants(options));
  const carveBubbles = generateCarveBubbles(options, boundary, relaxed, rand);
  const finalMass = relaxBubbles(relaxed, carveBubbles, boundary, 10, physicsConstants(options));

  return { bubbles: finalMass, carveBubbles };
}

function generateCarveBubbles(options: BubbleOptions, boundary: Boundary, massBubbles: Bubble[], rand: () => number) {
  const baseRadius = options.carveRadius / NORMALIZED_MM;
  const depth = options.carveDepth / 100;
  const minRadius = clamp(baseRadius * (0.38 + depth * 0.34), MIN_RADIUS, MAX_RADIUS);
  const maxRadius = clamp(baseRadius * (0.72 + depth * 0.78), minRadius, MAX_RADIUS);

  const carveBubbles: Bubble[] = [];
  for (let index = 0; index < options.carveBubbleCount; index += 1) {
    const bubble = createBubbleByRejection({
      id: `c-${options.seed}-${index}`,
      type: "carve",
      minRadius,
      maxRadius,
      variation: 0.35,
      boundary,
      rand,
      edgeOnly: options.edgeCarveOnly
    });

    if (bubble) {
      carveBubbles.push(options.edgeCarveOnly ? placeBubbleNearBoundary(bubble, boundary, rand) : bubble);
    } else if (massBubbles.length) {
      const source = massBubbles[Math.floor(rand() * massBubbles.length)];
      if (source) {
        carveBubbles.push(
          clampBubbleToBoundary(
            {
              id: `c-${options.seed}-${index}`,
              x: source.x + randomRange(rand, -source.r, source.r),
              y: source.y + randomRange(rand, -source.r, source.r),
              r: minRadius,
              type: "carve"
            },
            boundary
          )
        );
      }
    }
  }
  return carveBubbles;
}

function createBubbleByRejection({
  id,
  type,
  minRadius,
  maxRadius,
  variation,
  boundary,
  rand,
  edgeOnly
}: {
  id: string;
  type: Bubble["type"];
  minRadius: number;
  maxRadius: number;
  variation: number;
  boundary: Boundary;
  rand: () => number;
  edgeOnly: boolean;
}): Bubble | null {
  let radiusMax = maxRadius;
  for (let attempt = 0; attempt < MAX_GENERATION_ATTEMPTS; attempt += 1) {
    const t = Math.pow(rand(), 0.76 + variation * 0.35);
    const r = clamp(minRadius + (radiusMax - minRadius) * t, MIN_RADIUS, MAX_RADIUS);
    const point = edgeOnly ? randomBoundaryBiasedPoint(boundary, r, rand) : randomPointInBoundaryBox(boundary, r, rand);
    if (isInsideBoundary(point.x, point.y, type === "carve" ? r * 0.62 : r, boundary)) {
      return { id, x: point.x, y: point.y, r, type };
    }
    if (attempt > 0 && attempt % 120 === 0) {
      radiusMax = Math.max(minRadius, radiusMax * 0.9);
    }
  }
  return null;
}

function randomPointInBoundaryBox(boundary: Boundary, r: number, rand: () => number) {
  const halfW = boundary.width / 2 - boundary.padding - r;
  const halfH = boundary.height / 2 - boundary.padding - r;
  return {
    x: 0.5 + randomRange(rand, -halfW, halfW),
    y: 0.5 + randomRange(rand, -halfH, halfH)
  };
}

function randomBoundaryBiasedPoint(boundary: Boundary, r: number, rand: () => number) {
  const angle = rand() * Math.PI * 2;
  const radius = boundaryRadiusAt(boundary.shape, angle) - boundary.padding - r * randomRange(rand, 0.22, 0.88);
  return {
    x: 0.5 + Math.cos(angle) * radius,
    y: 0.5 + Math.sin(angle) * radius
  };
}

function placeBubbleNearBoundary(bubble: Bubble, boundary: Boundary, rand: () => number) {
  const angle = Math.atan2(bubble.y - 0.5, bubble.x - 0.5) + randomRange(rand, -0.24, 0.24);
  const radius = boundaryRadiusAt(boundary.shape, angle) - boundary.padding - bubble.r * randomRange(rand, 0.18, 0.74);
  return clampBubbleToBoundary({ ...bubble, x: 0.5 + Math.cos(angle) * radius, y: 0.5 + Math.sin(angle) * radius }, boundary);
}

export function relaxBubbles(
  input: Bubble[],
  carveBubbles: Bubble[],
  boundary: Boundary,
  iterations: number,
  constants: BubblePhysicsConstants
) {
  const bubbles = input.map((bubble) => ({ ...bubble }));

  for (let step = 0; step < iterations; step += 1) {
    for (let i = 0; i < bubbles.length; i += 1) {
      const a = bubbles[i];
      if (!a || a.locked) continue;

      for (let j = i + 1; j < bubbles.length; j += 1) {
        const b = bubbles[j];
        if (!b) continue;

        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(0.0001, Math.hypot(dx, dy));
        const nx = dx / dist;
        const ny = dy / dist;
        const targetDistance = (a.r + b.r) * constants.packingFactor;
        const mergeDistance = a.r + b.r + constants.mergeDistance;

        if (dist < targetDistance) {
          const push = (targetDistance - dist) * constants.repulsionStrength * 0.5;
          a.x -= nx * push;
          a.y -= ny * push;
          if (!b.locked) {
            b.x += nx * push;
            b.y += ny * push;
          }
        } else if (dist < mergeDistance) {
          const pull = (mergeDistance - dist) * constants.attractionStrength;
          a.x += nx * pull;
          a.y += ny * pull;
          if (!b.locked) {
            b.x -= nx * pull;
            b.y -= ny * pull;
          }
        }
      }

      for (const carve of carveBubbles) {
        const dx = a.x - carve.x;
        const dy = a.y - carve.y;
        const dist = Math.max(0.0001, Math.hypot(dx, dy));
        const influence = a.r + carve.r * 1.35;
        if (dist < influence) {
          const push = (influence - dist) * constants.carveRepulsionStrength;
          a.x += (dx / dist) * push;
          a.y += (dy / dist) * push;
        }
      }

      if (a.stuck || constants.boundaryStickiness > 0.55) {
        pullBubbleTowardBoundary(a, boundary, constants.boundaryStickiness);
      }

      const clamped = clampBubbleToBoundary(a, boundary);
      a.x = clamped.x;
      a.y = clamped.y;
    }
  }

  return bubbles;
}

function pullBubbleTowardBoundary(bubble: Bubble, boundary: Boundary, strength: number) {
  const angle = Math.atan2(bubble.y - 0.5, bubble.x - 0.5);
  const target = Math.max(0.02, boundaryRadiusAt(boundary.shape, angle) - boundary.padding - bubble.r);
  const current = Math.hypot(bubble.x - 0.5, bubble.y - 0.5);
  const next = current + (target - current) * 0.035 * strength;
  bubble.x = 0.5 + Math.cos(angle) * next;
  bubble.y = 0.5 + Math.sin(angle) * next;
}

export function clampBubbleToBoundary(bubble: Bubble, boundaryOrShape: Boundary | BoundaryShape, padding = 0.035): Bubble {
  const boundary = typeof boundaryOrShape === "string" ? createBoundary({ boundaryShape: boundaryOrShape, widthMm: 700, depthMm: 700, padding: padding * NORMALIZED_MM }) : boundaryOrShape;
  if (isInsideBoundary(bubble.x, bubble.y, bubble.type === "carve" ? bubble.r * 0.62 : bubble.r, boundary)) return bubble;

  let x = bubble.x;
  let y = bubble.y;
  let r = bubble.r;
  for (let attempt = 0; attempt < 64; attempt += 1) {
    x += (0.5 - x) * 0.12;
    y += (0.5 - y) * 0.12;
    if (isInsideBoundary(x, y, bubble.type === "carve" ? r * 0.62 : r, boundary)) return { ...bubble, x, y, r };
    r *= 0.995;
  }

  return { ...bubble, x: 0.5, y: 0.5, r: Math.min(r, Math.min(boundary.width, boundary.height) * 0.12) };
}

export function generateBubbleShapePath(bubbles: Bubble[], options: Pick<FormLabSnapshot, "mergeDistance" | "boundaryShape" | "padding" | "widthMm" | "depthMm">) {
  if (!bubbles.length) return "";
  const boundary = createBoundary(options);
  const samples = 280;
  const merge = options.mergeDistance / NORMALIZED_MM;
  const points = Array.from({ length: samples }, (_, index) => {
    const angle = (Math.PI * 2 * index) / samples;
    const ux = Math.cos(angle);
    const uy = Math.sin(angle);
    let best = 0;

    for (const bubble of bubbles) {
      const vx = bubble.x - 0.5;
      const vy = bubble.y - 0.5;
      const projection = vx * ux + vy * uy;
      const perpendicularSq = Math.max(0, vx * vx + vy * vy - projection * projection);
      const reach = bubble.r + merge * 0.55;
      if (perpendicularSq <= reach * reach) {
        best = Math.max(best, projection + Math.sqrt(reach * reach - perpendicularSq));
      }
    }

    const boundaryRadius = boundaryRadiusAt(boundary.shape, angle) - boundary.padding;
    const radius = clamp(best, 0.04, Math.max(0.05, boundaryRadius));
    return toSvgPoint({
      x: 0.5 + ux * radius,
      y: 0.5 + uy * radius
    });
  });

  return smoothClosedPath(points, 0.92);
}

export function buildBubbleShape(snapshot: FormLabSnapshot): BubbleShapeResult {
  const generated = snapshot.bubbles.length && snapshot.carveBubbles.length ? { bubbles: snapshot.bubbles, carveBubbles: snapshot.carveBubbles } : generateBubbles(snapshot);
  const boundary = createBoundary(snapshot);
  return {
    boundary,
    boundaryPath: boundaryPath(snapshot.boundaryShape),
    shapePath: generateBubbleShapePath(generated.bubbles, snapshot),
    massBubbles: generated.bubbles,
    carveBubbles: generated.carveBubbles
  };
}
