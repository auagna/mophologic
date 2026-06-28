import type { FormLabSnapshot } from "@/types/formLab";
import { VIEWBOX } from "./geometry";
import { randomRange, seededRandom } from "./random";

export type PatternElement =
  | { kind: "line"; d: string; strokeWidth?: number }
  | { kind: "circle"; cx: number; cy: number; r: number; strokeWidth?: number; fill?: string };

export function generatePattern(snapshot: Pick<FormLabSnapshot, "seed" | "patternType" | "patternDensity" | "patternScale" | "patternStrokeWidth">): PatternElement[] {
  const rand = seededRandom(snapshot.seed + 9001);
  const density = Math.max(4, Math.round(snapshot.patternDensity / 5));
  const scale = 0.5 + snapshot.patternScale / 80;
  const elements: PatternElement[] = [];

  if (snapshot.patternType === "dots") {
    for (let i = 0; i < density * 5; i += 1) {
      elements.push({
        kind: "circle",
        cx: randomRange(rand, 165, VIEWBOX.width - 165),
        cy: randomRange(rand, 105, VIEWBOX.height - 105),
        r: randomRange(rand, 2.2, 9) * scale,
        fill: "rgba(255,255,255,0.88)"
      });
    }
    return elements;
  }

  if (snapshot.patternType === "flow") {
    for (let i = 0; i < density; i += 1) {
      const y = 110 + i * (460 / density);
      const amp = randomRange(rand, 15, 44) * scale;
      elements.push({
        kind: "line",
        d: `M 130 ${y.toFixed(1)} C 280 ${(y - amp).toFixed(1)} 360 ${(y + amp).toFixed(1)} 500 ${y.toFixed(1)} S 760 ${(y - amp).toFixed(1)} 880 ${y.toFixed(1)}`
      });
    }
    return elements;
  }

  if (snapshot.patternType === "branch" || snapshot.patternType === "vein") {
    const trunks = snapshot.patternType === "branch" ? 4 : 7;
    for (let t = 0; t < trunks; t += 1) {
      const x = randomRange(rand, 220, 780);
      const y = randomRange(rand, 155, 525);
      const len = randomRange(rand, 85, 180) * scale;
      const angle = randomRange(rand, -Math.PI, Math.PI);
      const x2 = x + Math.cos(angle) * len;
      const y2 = y + Math.sin(angle) * len;
      elements.push({ kind: "line", d: `M ${x.toFixed(1)} ${y.toFixed(1)} L ${x2.toFixed(1)} ${y2.toFixed(1)}` });
      const branches = snapshot.patternType === "branch" ? 3 : 5;
      for (let b = 0; b < branches; b += 1) {
        const p = (b + 1) / (branches + 1);
        const bx = x + (x2 - x) * p;
        const by = y + (y2 - y) * p;
        const ba = angle + randomRange(rand, -1.1, 1.1);
        const bl = len * randomRange(rand, 0.18, 0.38);
        elements.push({
          kind: "line",
          d: `M ${bx.toFixed(1)} ${by.toFixed(1)} Q ${(bx + Math.cos(ba) * bl * 0.5).toFixed(1)} ${(by + Math.sin(ba) * bl * 0.5).toFixed(1)} ${(bx + Math.cos(ba) * bl).toFixed(1)} ${(by + Math.sin(ba) * bl).toFixed(1)}`
        });
      }
    }
    return elements;
  }

  if (snapshot.patternType === "tangent") {
    const circles = Array.from({ length: density + 5 }, () => ({
      cx: randomRange(rand, 185, 815),
      cy: randomRange(rand, 120, 560),
      r: randomRange(rand, 9, 28) * scale
    }));
    circles.forEach((circle, index) => {
      elements.push({ kind: "circle", ...circle, fill: "none" });
      const next = circles[index + 1];
      if (next) {
        elements.push({ kind: "line", d: `M ${circle.cx.toFixed(1)} ${circle.cy.toFixed(1)} L ${next.cx.toFixed(1)} ${next.cy.toFixed(1)}` });
      }
    });
    return elements;
  }

  for (let i = 0; i < density * 2; i += 1) {
    const x = randomRange(rand, 140, 860);
    const y = randomRange(rand, 105, 575);
    const s = randomRange(rand, 32, 82) * scale;
    elements.push({
      kind: "line",
      d: `M ${x.toFixed(1)} ${(y - s).toFixed(1)} L ${(x + s * 0.84).toFixed(1)} ${(y - s * 0.25).toFixed(1)} L ${(x + s * 0.5).toFixed(1)} ${(y + s * 0.72).toFixed(1)} L ${(x - s * 0.5).toFixed(1)} ${(y + s * 0.72).toFixed(1)} L ${(x - s * 0.84).toFixed(1)} ${(y - s * 0.25).toFixed(1)} Z`
    });
  }

  return elements;
}
