import { clampBubbleToBoundary, isInsideBoundary, VIEWBOX } from "@/lib/boundary";
import { createSeededRandom, randomBetween } from "@/lib/seededRandom";
import type { Axis, AxisNode, Boundary, Bubble, SimParams } from "@/types";

export function createDefaultBoundary(): Boundary {
  return {
    shape: "circle",
    cx: VIEWBOX.width / 2,
    cy: VIEWBOX.height / 2,
    width: 500,
    height: 500,
    padding: 22
  };
}

export function createDefaultParams(): SimParams {
  return {
    seed: 2417,
    generationMode: "bubble",
    bubbleCount: 32,
    minRadius: 22,
    maxRadius: 58,
    carveCount: 6,
    carveMinRadius: 22,
    carveMaxRadius: 64,
    axisCount: 3,
    axisLength: 260,
    axisAngle: -28,
    axisThickness: 52,
    attractionStrength: 0.012,
    repulsionStrength: 0.09,
    damping: 0.88,
    linkDistance: 44,
    mergeBlur: 14,
    boundaryForce: 0.42,
    bubbleFillColor: "#050505",
    axisFillColor: "#2f7fd2"
  };
}

export function generateBubbles(params: SimParams, boundary: Boundary): Bubble[] {
  const random = createSeededRandom(params.seed);
  const bubbles: Bubble[] = [];
  const massCount = params.generationMode === "axis" ? 0 : params.bubbleCount;
  const total = massCount + params.carveCount;

  for (let index = 0; index < total; index += 1) {
    const kind: Bubble["kind"] = index < massCount ? "mass" : "carve";
    const radius =
      kind === "mass"
        ? randomBetween(random, params.minRadius, params.maxRadius)
        : randomBetween(random, params.carveMinRadius, params.carveMaxRadius);
    const placed = placeBubble(random, boundary, radius, kind);
    bubbles.push({
      id: `${kind}-${params.seed}-${index}`,
      x: placed.x,
      y: placed.y,
      vx: randomBetween(random, -0.35, 0.35),
      vy: randomBetween(random, -0.35, 0.35),
      r: radius,
      kind
    });
  }

  return bubbles;
}

export function generateAxes(params: SimParams, boundary: Boundary): Axis[] {
  if (params.generationMode === "bubble") return [];

  const random = createSeededRandom(params.seed + 911);
  const axes: Axis[] = [];
  const angleBase = (params.axisAngle * Math.PI) / 180;
  const angleSpread = params.generationMode === "axis" ? Math.PI * 0.22 : Math.PI * 0.38;

  for (let index = 0; index < params.axisCount; index += 1) {
    const length = randomBetween(random, params.axisLength * 0.72, params.axisLength * 1.08);
    const thickness = randomBetween(random, params.axisThickness * 0.78, params.axisThickness * 1.18);
    const angle = angleBase + randomBetween(random, -angleSpread, angleSpread);
    const half = length / 2;
    const dx = Math.cos(angle) * half;
    const dy = Math.sin(angle) * half;
    const center = placeAxisCenter(random, boundary, dx, dy, thickness);

    axes.push({
      id: `axis-${params.seed}-${index}`,
      x1: center.x - dx,
      y1: center.y - dy,
      x2: center.x + dx,
      y2: center.y + dy,
      thickness,
      kind: "mass"
    });
  }

  return axes;
}

export function axisNodesForAxes(axes: Axis[]): AxisNode[] {
  return axes.flatMap((axis) => {
    const r = axis.thickness * 0.5;
    return [
      {
        id: `${axis.id}-start`,
        axisId: axis.id,
        x: axis.x1,
        y: axis.y1,
        r,
        role: "start" as const
      },
      {
        id: `${axis.id}-end`,
        axisId: axis.id,
        x: axis.x2,
        y: axis.y2,
        r,
        role: "end" as const
      }
    ];
  });
}

function placeBubble(random: () => number, boundary: Boundary, r: number, kind: Bubble["kind"]) {
  const innerW = boundary.width - boundary.padding * 2;
  const innerH = boundary.height - boundary.padding * 2;
  const left = boundary.cx - innerW / 2;
  const top = boundary.cy - innerH / 2;

  for (let attempt = 0; attempt < 400; attempt += 1) {
    const angle = randomBetween(random, 0, Math.PI * 2);
    const edgeBias = kind === "carve" ? 0.72 + random() * 0.28 : Math.sqrt(random()) * 0.82;
    const x = boundary.cx + Math.cos(angle) * (innerW / 2 - r) * edgeBias;
    const y = boundary.cy + Math.sin(angle) * (innerH / 2 - r) * edgeBias;
    if (isInsideBoundary(x, y, r, boundary)) return { x, y };
  }

  for (let attempt = 0; attempt < 1200; attempt += 1) {
    const x = randomBetween(random, left + r, left + innerW - r);
    const y = randomBetween(random, top + r, top + innerH - r);
    if (isInsideBoundary(x, y, r, boundary)) return { x, y };
  }

  return { x: boundary.cx, y: boundary.cy };
}

function placeAxisCenter(random: () => number, boundary: Boundary, dx: number, dy: number, thickness: number) {
  const r = thickness / 2;
  const innerW = boundary.width - boundary.padding * 2;
  const innerH = boundary.height - boundary.padding * 2;
  const left = boundary.cx - innerW / 2;
  const top = boundary.cy - innerH / 2;

  for (let attempt = 0; attempt < 900; attempt += 1) {
    const x = randomBetween(random, left + r, left + innerW - r);
    const y = randomBetween(random, top + r, top + innerH - r);
    if (isInsideBoundary(x - dx, y - dy, r, boundary) && isInsideBoundary(x + dx, y + dy, r, boundary)) {
      return { x, y };
    }
  }

  return { x: boundary.cx, y: boundary.cy };
}

export function stepSimulation(bubbles: Bubble[], boundary: Boundary, params: SimParams) {
  const next = bubbles.map((bubble) => ({ ...bubble }));
  const massBubbles = next.filter((bubble) => bubble.kind === "mass");
  const carveBubbles = next.filter((bubble) => bubble.kind === "carve");
  const forces = new Map<string, { x: number; y: number }>();

  for (const bubble of next) forces.set(bubble.id, { x: 0, y: 0 });

  for (let i = 0; i < massBubbles.length; i += 1) {
    for (let j = i + 1; j < massBubbles.length; j += 1) {
      const a = massBubbles[i];
      const b = massBubbles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const nx = dx / d;
      const ny = dy / d;
      const idealDistance = params.linkDistance + a.r + b.r;
      const aForce = forces.get(a.id);
      const bForce = forces.get(b.id);
      if (!aForce || !bForce) continue;

      if (d < idealDistance) {
        const amount = ((idealDistance - d) / idealDistance) * params.repulsionStrength;
        aForce.x -= nx * amount;
        aForce.y -= ny * amount;
        bForce.x += nx * amount;
        bForce.y += ny * amount;
      } else if (d < idealDistance * 2.5) {
        const amount = ((d - idealDistance) / idealDistance) * params.attractionStrength;
        aForce.x += nx * amount;
        aForce.y += ny * amount;
        bForce.x -= nx * amount;
        bForce.y -= ny * amount;
      }
    }
  }

  for (const mass of massBubbles) {
    const massForce = forces.get(mass.id);
    if (!massForce) continue;
    for (const carve of carveBubbles) {
      const dx = mass.x - carve.x;
      const dy = mass.y - carve.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const limit = mass.r + carve.r + params.linkDistance * 1.45;
      if (d > limit) continue;
      const amount = ((limit - d) / limit) * params.repulsionStrength * 1.35;
      massForce.x += (dx / d) * amount;
      massForce.y += (dy / d) * amount;
      const carveForce = forces.get(carve.id);
      if (carveForce && !carve.fixed) {
        carveForce.x -= (dx / d) * amount * 0.18;
        carveForce.y -= (dy / d) * amount * 0.18;
      }
    }
  }

  for (let i = 0; i < carveBubbles.length; i += 1) {
    for (let j = i + 1; j < carveBubbles.length; j += 1) {
      const a = carveBubbles[i];
      const b = carveBubbles[j];
      const dx = b.x - a.x;
      const dy = b.y - a.y;
      const d = Math.max(0.01, Math.hypot(dx, dy));
      const limit = a.r + b.r + params.linkDistance * 0.8;
      if (d > limit) continue;
      const amount = ((limit - d) / limit) * params.repulsionStrength * 0.38;
      const aForce = forces.get(a.id);
      const bForce = forces.get(b.id);
      if (aForce) {
        aForce.x -= (dx / d) * amount;
        aForce.y -= (dy / d) * amount;
      }
      if (bForce) {
        bForce.x += (dx / d) * amount;
        bForce.y += (dy / d) * amount;
      }
    }
  }

  for (const bubble of next) {
    if (bubble.fixed) {
      bubble.vx = 0;
      bubble.vy = 0;
      continue;
    }

    const force = forces.get(bubble.id) ?? { x: 0, y: 0 };
    bubble.vx = (bubble.vx + force.x) * params.damping;
    bubble.vy = (bubble.vy + force.y) * params.damping;
    bubble.x += bubble.vx;
    bubble.y += bubble.vy;

    const clamped = clampBubbleToBoundary(bubble, boundary);
    if (Math.abs(clamped.x - bubble.x) > 0.001 || Math.abs(clamped.y - bubble.y) > 0.001) {
      bubble.x = bubble.x + (clamped.x - bubble.x) * params.boundaryForce;
      bubble.y = bubble.y + (clamped.y - bubble.y) * params.boundaryForce;
      bubble.vx *= -0.15;
      bubble.vy *= -0.15;
      const finalClamp = clampBubbleToBoundary(bubble, boundary);
      bubble.x = finalClamp.x;
      bubble.y = finalClamp.y;
    }
  }

  return next;
}

export function linksForBubbles(bubbles: Bubble[], params: SimParams) {
  const mass = bubbles.filter((bubble) => bubble.kind === "mass");
  const links: Array<{ a: Bubble; b: Bubble; opacity: number }> = [];

  for (let i = 0; i < mass.length; i += 1) {
    for (let j = i + 1; j < mass.length; j += 1) {
      const a = mass[i];
      const b = mass[j];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      const limit = (params.linkDistance + a.r + b.r) * 2.5;
      if (d < limit) {
        links.push({ a, b, opacity: Math.max(0.12, 1 - d / limit) });
      }
    }
  }

  return links;
}
