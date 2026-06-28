import type { Bubble, FormLabSnapshot } from "@/types/formLab";
import { VIEWBOX } from "./geometry";

export type PatternElement =
  | { kind: "line"; d: string; strokeWidth?: number }
  | { kind: "circle"; cx: number; cy: number; r: number; strokeWidth?: number; fill?: string };

type PatternSnapshot = Pick<FormLabSnapshot, "patternType" | "patternDensity" | "patternScale" | "patternStrokeWidth" | "bubbles">;

type SvgBubble = {
  id: string;
  x: number;
  y: number;
  r: number;
};

export function generatePattern(snapshot: PatternSnapshot): PatternElement[] {
  const bubbles = snapshot.bubbles.map(toSvgBubble);
  if (!bubbles.length) return [];

  const density = Math.max(0.18, snapshot.patternDensity / 100);
  const scale = 0.55 + snapshot.patternScale / 90;
  const pairs = nearbyPairs(bubbles, Math.round(12 + density * 58));
  const elements: PatternElement[] = [];

  if (snapshot.patternType === "dots") {
    for (const bubble of sampleBubbles(bubbles, density)) {
      elements.push({
        kind: "circle",
        cx: bubble.x,
        cy: bubble.y,
        r: Math.max(2.5, bubble.r * 0.22 * scale),
        fill: "rgba(255,255,255,0.9)"
      });
    }
    return elements;
  }

  if (snapshot.patternType === "flow") {
    for (const bubble of sampleBubbles(bubbles, density * 0.8)) {
      for (let ring = 1; ring <= 2; ring += 1) {
        elements.push({
          kind: "circle",
          cx: bubble.x,
          cy: bubble.y,
          r: Math.max(5, bubble.r * (0.62 + ring * 0.28) * scale),
          fill: "none",
          strokeWidth: Math.max(0.7, snapshot.patternStrokeWidth * 0.62)
        });
      }
    }
    return elements;
  }

  if (snapshot.patternType === "tangent") {
    for (const bubble of sampleBubbles(bubbles, density)) {
      elements.push({
        kind: "circle",
        cx: bubble.x,
        cy: bubble.y,
        r: Math.max(5, bubble.r * 0.48 * scale),
        fill: "none",
        strokeWidth: Math.max(0.8, snapshot.patternStrokeWidth * 0.7)
      });
    }
    for (const [a, b] of pairs) {
      const tangent = tangentLine(a, b);
      elements.push({ kind: "line", d: `M ${tangent.x1} ${tangent.y1} L ${tangent.x2} ${tangent.y2}` });
    }
    return elements;
  }

  if (snapshot.patternType === "vein" || snapshot.patternType === "branch") {
    const degreeLimit = snapshot.patternType === "branch" ? 2 : 3;
    const degrees = new Map<string, number>();
    for (const [a, b] of pairs) {
      const da = degrees.get(a.id) ?? 0;
      const db = degrees.get(b.id) ?? 0;
      if (da >= degreeLimit || db >= degreeLimit) continue;
      degrees.set(a.id, da + 1);
      degrees.set(b.id, db + 1);
      const mx = (a.x + b.x) / 2;
      const my = (a.y + b.y) / 2;
      const bend = snapshot.patternType === "branch" ? 0.12 : 0.06;
      elements.push({
        kind: "line",
        d: `M ${a.x.toFixed(1)} ${a.y.toFixed(1)} Q ${(mx + (b.y - a.y) * bend).toFixed(1)} ${(my - (b.x - a.x) * bend).toFixed(1)} ${b.x.toFixed(1)} ${b.y.toFixed(1)}`,
        strokeWidth: snapshot.patternType === "branch" ? snapshot.patternStrokeWidth * 0.9 : undefined
      });
    }
    return elements;
  }

  for (const [a, b] of pairs) {
    const midX = (a.x + b.x) / 2;
    const midY = (a.y + b.y) / 2;
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const len = Math.max(1, Math.hypot(dx, dy));
    const nx = -dy / len;
    const ny = dx / len;
    const span = Math.min(76, len * 0.48) * scale;
    elements.push({
      kind: "line",
      d: `M ${(midX - nx * span).toFixed(1)} ${(midY - ny * span).toFixed(1)} L ${(midX + nx * span).toFixed(1)} ${(midY + ny * span).toFixed(1)}`,
      strokeWidth: Math.max(0.7, snapshot.patternStrokeWidth * 0.72)
    });
  }

  return elements;
}

function toSvgBubble(bubble: Bubble): SvgBubble {
  return {
    id: bubble.id,
    x: bubble.x * VIEWBOX.width,
    y: bubble.y * VIEWBOX.height,
    r: bubble.r * Math.min(VIEWBOX.width, VIEWBOX.height)
  };
}

function sampleBubbles(bubbles: SvgBubble[], density: number) {
  const take = Math.max(3, Math.round(bubbles.length * Math.min(1, density)));
  return bubbles.slice(0, take);
}

function nearbyPairs(bubbles: SvgBubble[], maxPairs: number): Array<[SvgBubble, SvgBubble]> {
  const pairs: Array<[SvgBubble, SvgBubble, number]> = [];
  for (let i = 0; i < bubbles.length; i += 1) {
    const a = bubbles[i];
    if (!a) continue;
    for (let j = i + 1; j < bubbles.length; j += 1) {
      const b = bubbles[j];
      if (!b) continue;
      const distance = Math.hypot(a.x - b.x, a.y - b.y);
      const reach = a.r + b.r + 125;
      if (distance <= reach) pairs.push([a, b, distance]);
    }
  }
  pairs.sort((a, b) => a[2] - b[2]);
  return pairs.slice(0, maxPairs).map(([a, b]) => [a, b]);
}

function tangentLine(a: SvgBubble, b: SvgBubble) {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const length = Math.max(1, Math.hypot(dx, dy));
  const ux = dx / length;
  const uy = dy / length;
  return {
    x1: (a.x + ux * a.r * 0.45).toFixed(1),
    y1: (a.y + uy * a.r * 0.45).toFixed(1),
    x2: (b.x - ux * b.r * 0.45).toFixed(1),
    y2: (b.y - uy * b.r * 0.45).toFixed(1)
  };
}
