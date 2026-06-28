import type { Bubble, BoundaryShape, FormLabSnapshot } from "@/types/formLab";
import { boundaryPath, boundaryRadiusAt, clampPointToBoundary, smoothClosedPath, toSvgPoint, VIEWBOX } from "./geometry";
import { clamp, randomRange, seededRandom } from "./random";

type BubbleOptions = Pick<
  FormLabSnapshot,
  | "boundaryShape"
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

export type BubbleShapeResult = {
  boundaryPath: string;
  shapePath: string;
  matterBubbles: Bubble[];
  carveBubbles: Bubble[];
};

export function generateBubbles(options: BubbleOptions): { bubbles: Bubble[]; carveBubbles: Bubble[] } {
  const rand = seededRandom(options.seed);
  const minR = options.minRadius / 1000;
  const maxR = options.maxRadius / 1000;
  const variation = options.sizeVariation / 100;
  const padding = options.padding / 1000;

  const bubbles: Bubble[] = Array.from({ length: options.bubbleCount }, (_, index) => {
    const angle = rand() * Math.PI * 2;
    const boundary = Math.max(0.08, boundaryRadiusAt(options.boundaryShape, angle) - padding);
    const rBase = randomRange(rand, minR, maxR);
    const r = clamp(rBase * (1 + randomRange(rand, -variation, variation) * 0.45), 0.018, 0.14);
    const radius = randomRange(rand, 0, Math.max(0.04, boundary - r));
    const point = clampBubbleToBoundary(
      {
        id: `b-${options.seed}-${index}`,
        x: 0.5 + Math.cos(angle) * radius,
        y: 0.5 + Math.sin(angle) * radius,
        r,
        kind: "matter"
      },
      options.boundaryShape,
      padding
    );
    return {
      ...point,
      stuck: rand() < options.boundaryStick / 120
    };
  });

  const relaxed = relaxBubbles(bubbles, options);
  const carveBubbles = generateCarveBubbles(options, relaxed, rand);
  return { bubbles: relaxed, carveBubbles };
}

function generateCarveBubbles(options: BubbleOptions, bubbles: Bubble[], rand: () => number): Bubble[] {
  const padding = options.padding / 1000;
  const edgeOnly = options.edgeCarveOnly;
  const depth = options.carveDepth / 100;
  const r = clamp((options.carveRadius / 1000) * (0.65 + depth * 0.7), 0.016, 0.15);

  return Array.from({ length: options.carveBubbleCount }, (_, index) => {
    const angle = rand() * Math.PI * 2;
    const boundary = boundaryRadiusAt(options.boundaryShape, angle) - padding;
    const radial = edgeOnly ? boundary - r * randomRange(rand, 0.15, 0.65) : randomRange(rand, 0.05, Math.max(0.06, boundary - r));
    const source = bubbles[Math.floor(rand() * bubbles.length)];
    const x = edgeOnly || !source ? 0.5 + Math.cos(angle) * radial : source.x + randomRange(rand, -r * 1.8, r * 1.8);
    const y = edgeOnly || !source ? 0.5 + Math.sin(angle) * radial : source.y + randomRange(rand, -r * 1.8, r * 1.8);
    return clampBubbleToBoundary(
      {
        id: `c-${options.seed}-${index}`,
        x,
        y,
        r,
        kind: "carve"
      },
      options.boundaryShape,
      padding
    );
  });
}

function relaxBubbles(input: Bubble[], options: BubbleOptions) {
  const bubbles = input.map((bubble) => ({ ...bubble }));
  const repulsion = options.repulsion / 100;
  const attraction = options.attraction / 100;
  const mergeGap = options.mergeDistance / 1000;
  const stick = options.boundaryStick / 100;
  const padding = options.padding / 1000;

  for (let step = 0; step < 28; step += 1) {
    for (let i = 0; i < bubbles.length; i += 1) {
      const a = bubbles[i];
      if (!a) continue;
      for (let j = i + 1; j < bubbles.length; j += 1) {
        const b = bubbles[j];
        if (!b) continue;
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.max(0.0001, Math.hypot(dx, dy));
        const minDist = (a.r + b.r) * (0.82 + repulsion * 0.38);
        const mergeDist = a.r + b.r + mergeGap;
        const nx = dx / dist;
        const ny = dy / dist;

        if (dist < minDist) {
          const push = (minDist - dist) * 0.5 * repulsion;
          a.x -= nx * push;
          a.y -= ny * push;
          b.x += nx * push;
          b.y += ny * push;
        } else if (dist < mergeDist) {
          const pull = (mergeDist - dist) * 0.012 * attraction;
          a.x += nx * pull;
          a.y += ny * pull;
          b.x -= nx * pull;
          b.y -= ny * pull;
        }
      }

      if (a.stuck || stick > 0.55) {
        const angle = Math.atan2(a.y - 0.5, a.x - 0.5);
        const target = Math.max(0.04, boundaryRadiusAt(options.boundaryShape, angle) - a.r - padding);
        const current = Math.hypot(a.x - 0.5, a.y - 0.5);
        const next = current + (target - current) * 0.035 * stick;
        a.x = 0.5 + Math.cos(angle) * next;
        a.y = 0.5 + Math.sin(angle) * next;
      }

      const clamped = clampBubbleToBoundary(a, options.boundaryShape, padding);
      a.x = clamped.x;
      a.y = clamped.y;
    }
  }

  return bubbles;
}

export function clampBubbleToBoundary(bubble: Bubble, shape: BoundaryShape, padding = 0.035): Bubble {
  const point = clampPointToBoundary({ x: bubble.x, y: bubble.y }, shape);
  const dx = point.x - 0.5;
  const dy = point.y - 0.5;
  const angle = Math.atan2(dy, dx);
  const dist = Math.hypot(dx, dy);
  const maxDist = Math.max(0.03, boundaryRadiusAt(shape, angle) - bubble.r - padding);
  if (dist <= maxDist) return { ...bubble, x: point.x, y: point.y };
  return {
    ...bubble,
    x: 0.5 + Math.cos(angle) * maxDist,
    y: 0.5 + Math.sin(angle) * maxDist
  };
}

export function generateBubbleShapePath(bubbles: Bubble[], options: Pick<FormLabSnapshot, "mergeDistance" | "boundaryShape" | "padding">) {
  if (!bubbles.length) return "";
  const samples = 260;
  const merge = options.mergeDistance / 1000;
  const padding = options.padding / 1000;
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

    const boundary = Math.max(0.05, boundaryRadiusAt(options.boundaryShape, angle) - padding);
    const radius = clamp(best, 0.04, boundary);
    return toSvgPoint({
      x: 0.5 + ux * radius,
      y: 0.5 + uy * radius
    });
  });

  return smoothClosedPath(points, 0.92);
}

export function buildBubbleShape(snapshot: FormLabSnapshot): BubbleShapeResult {
  const matterBubbles = snapshot.bubbles.length ? snapshot.bubbles : generateBubbles(snapshot).bubbles;
  const carveBubbles = snapshot.carveBubbles.length ? snapshot.carveBubbles : generateBubbles(snapshot).carveBubbles;
  return {
    boundaryPath: boundaryPath(snapshot.boundaryShape),
    shapePath: generateBubbleShapePath(matterBubbles, snapshot),
    matterBubbles,
    carveBubbles
  };
}
